"""
NEXUS AQUA - Admin Router
Full control: user management, role approval, system stats
Accessible by: Admin only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Survey, SonarImage, Detection, Hotspot, ExpertReview, UserStatus, UserRole
from app.schemas import AdminUserResponse, UserStatusUpdate, UserRoleUpdate
from app.dependencies import admin_only

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=List[AdminUserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    """List all users in the system."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


@router.get("/users/pending", response_model=List[AdminUserResponse])
def list_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    """List users pending approval."""
    users = db.query(User).filter(User.status == UserStatus.pending).order_by(User.created_at.asc()).all()
    return users


@router.patch("/users/{user_id}/status", response_model=AdminUserResponse)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    """
    Approve, suspend, or reactivate a user account.
    Admins cannot suspend their own account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and payload.status == UserStatus.suspended:
        raise HTTPException(status_code=400, detail="Cannot suspend your own account")

    user.status = payload.status
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    """Change a user's role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user.role = UserRole(payload.role.value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    """Permanently delete a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()


@router.get("/stats")
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    """Comprehensive system statistics for the admin dashboard."""
    total_users = db.query(User).count()
    pending_users = db.query(User).filter(User.status == UserStatus.pending).count()
    active_users = db.query(User).filter(User.status == UserStatus.active).count()

    # Users by role
    role_dist = {}
    for role in UserRole:
        count = db.query(User).filter(User.role == role).count()
        role_dist[role.value] = count

    total_surveys = db.query(Survey).count()
    total_images = db.query(SonarImage).count()
    processed_images = db.query(SonarImage).filter(SonarImage.processed == True).count()
    total_detections = db.query(Detection).count()
    total_hotspots = db.query(Hotspot).count()
    total_reviews = db.query(ExpertReview).count()

    # Recent activity (last 5 surveys)
    recent_surveys = db.query(Survey).order_by(Survey.created_at.desc()).limit(5).all()
    recent_activity = [
        {
            "type": "survey",
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in recent_surveys
    ]

    return {
        "users": {
            "total": total_users,
            "pending_approval": pending_users,
            "active": active_users,
            "by_role": role_dist,
        },
        "surveys": {"total": total_surveys},
        "images": {
            "total": total_images,
            "processed": processed_images,
            "pending": total_images - processed_images,
        },
        "detections": {"total": total_detections},
        "hotspots": {"total": total_hotspots},
        "expert_reviews": {"total": total_reviews},
        "recent_activity": recent_activity,
    }


@router.post("/seed", status_code=status.HTTP_201_CREATED)
def seed_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    """
    Seed demo data: sample surveys and hotspots for testing.
    Safe to call multiple times (checks for existing data).
    """
    existing_survey = db.query(Survey).filter(Survey.title == "Demo Bay Survey Alpha").first()
    if existing_survey:
        return {"message": "Demo data already seeded", "skipped": True}

    admin = db.query(User).filter(User.role == UserRole.admin).first()
    if not admin:
        raise HTTPException(status_code=400, detail="No admin user found for seed data")

    operator = db.query(User).filter(User.role == UserRole.survey_operator).first()
    target_op_id = operator.id if operator else admin.id

    # Create demo surveys (with realistic mix of active and completed surveys)
    surveys = [
        Survey(title="Demo Bay Survey Alpha", description="Initial sonar sweep of northern bay", location_name="Northern Bay", latitude=19.0760, longitude=72.8777, depth_m=25.5, status=SurveyStatus.active, operator_id=target_op_id),
        Survey(title="Deep Channel Survey", description="Deep channel debris assessment - Completed Sweep", location_name="Mumbai Channel", latitude=18.9389, longitude=72.8258, depth_m=85.0, status=SurveyStatus.completed, operator_id=target_op_id),
        Survey(title="Coastal Survey Beta", description="Shallow coastal zone sonar sweep - Verified", location_name="Coastal Zone B", latitude=19.1134, longitude=72.8968, depth_m=12.3, status=SurveyStatus.completed, operator_id=target_op_id),
    ]
    for s in surveys:
        db.add(s)
    db.flush()

    from app.models import RiskLevel as RL, CleanupPriority as CP
    # Create demo hotspots
    hotspots = [
        Hotspot(survey_id=surveys[0].id, latitude=19.0760, longitude=72.8777, risk_level=RL.critical, debris_count=15, cleanup_priority=CP.urgent, notes="Heavy fishing net entanglement detected"),
        Hotspot(survey_id=surveys[0].id, latitude=19.0800, longitude=72.8800, risk_level=RL.high, debris_count=8, cleanup_priority=CP.high, notes="Mixed debris field — tires and metal objects"),
        Hotspot(survey_id=surveys[1].id, latitude=18.9389, longitude=72.8258, risk_level=RL.medium, debris_count=4, cleanup_priority=CP.medium, notes="Scattered plastic bottles"),
        Hotspot(survey_id=surveys[2].id, latitude=19.1134, longitude=72.8968, risk_level=RL.low, debris_count=2, cleanup_priority=CP.low, notes="Minor debris — monitor"),
    ]
    for h in hotspots:
        db.add(h)

    db.commit()
    return {
        "message": "Demo data seeded successfully",
        "surveys_created": len(surveys),
        "hotspots_created": len(hotspots),
    }
