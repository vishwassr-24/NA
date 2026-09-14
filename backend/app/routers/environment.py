"""
NEXUS AQUA - Environment Officer Router
Handles: pollution hotspot map, cleanup priorities, action tracking
Accessible by: Environment Officer + Admin
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Hotspot, ActionRecord, Survey
from app.schemas import (
    HotspotCreate, HotspotUpdate, HotspotResponse,
    ActionCreate, ActionUpdate, ActionResponse,
)
from app.dependencies import environment_officer_access, get_current_user

router = APIRouter(prefix="/environment", tags=["Environment Officer"])


# ─────────────────────────────────────────────
# Hotspot Endpoints
# ─────────────────────────────────────────────

@router.get("/hotspots", response_model=List[HotspotResponse])
def list_hotspots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all debris hotspots for the map view. Accessible to all authenticated users."""
    hotspots = db.query(Hotspot).order_by(Hotspot.created_at.desc()).all()
    return hotspots


@router.post("/hotspots", response_model=HotspotResponse, status_code=status.HTTP_201_CREATED)
def create_hotspot(
    payload: HotspotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(environment_officer_access),
):
    """Manually create a hotspot record."""
    # Validate survey exists
    survey = db.query(Survey).filter(Survey.id == payload.survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    hotspot = Hotspot(
        survey_id=payload.survey_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        risk_level=payload.risk_level,
        debris_count=payload.debris_count,
        cleanup_priority=payload.cleanup_priority,
        notes=payload.notes,
    )
    db.add(hotspot)
    db.commit()
    db.refresh(hotspot)
    return hotspot


@router.get("/hotspots/{hotspot_id}", response_model=HotspotResponse)
def get_hotspot(
    hotspot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific hotspot by ID."""
    hotspot = db.query(Hotspot).filter(Hotspot.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return hotspot


@router.patch("/hotspots/{hotspot_id}", response_model=HotspotResponse)
def update_hotspot(
    hotspot_id: int,
    payload: HotspotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(environment_officer_access),
):
    """Update cleanup status or priority for a hotspot."""
    hotspot = db.query(Hotspot).filter(Hotspot.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(hotspot, key, value)

    db.commit()
    db.refresh(hotspot)
    return hotspot


@router.delete("/hotspots/{hotspot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hotspot(
    hotspot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(environment_officer_access),
):
    """Delete a hotspot record."""
    hotspot = db.query(Hotspot).filter(Hotspot.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    db.delete(hotspot)
    db.commit()


# ─────────────────────────────────────────────
# Action Tracking Endpoints
# ─────────────────────────────────────────────

@router.get("/actions", response_model=List[ActionResponse])
def list_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(environment_officer_access),
):
    """List all cleanup action records."""
    actions = db.query(ActionRecord).order_by(ActionRecord.created_at.desc()).all()
    return actions


@router.post("/actions", response_model=ActionResponse, status_code=status.HTTP_201_CREATED)
def create_action(
    payload: ActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(environment_officer_access),
):
    """Create a cleanup action record for a hotspot."""
    hotspot = db.query(Hotspot).filter(Hotspot.id == payload.hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")

    action = ActionRecord(
        hotspot_id=payload.hotspot_id,
        officer_id=current_user.id,
        action_description=payload.action_description,
        status="open",
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


@router.patch("/actions/{action_id}", response_model=ActionResponse)
def update_action(
    action_id: int,
    payload: ActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(environment_officer_access),
):
    """Update an action record status."""
    action = db.query(ActionRecord).filter(ActionRecord.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(action, key, value)

    db.commit()
    db.refresh(action)
    return action


@router.get("/stats")
def get_environment_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(environment_officer_access),
):
    """Summary statistics for the environment officer dashboard."""
    from app.models import RiskLevel

    total_hotspots = db.query(Hotspot).count()
    critical = db.query(Hotspot).filter(Hotspot.risk_level == RiskLevel.critical).count()
    high = db.query(Hotspot).filter(Hotspot.risk_level == RiskLevel.high).count()
    pending_cleanup = db.query(Hotspot).filter(Hotspot.cleanup_status == "pending").count()
    completed_cleanup = db.query(Hotspot).filter(Hotspot.cleanup_status == "done").count()
    open_actions = db.query(ActionRecord).filter(ActionRecord.status == "open").count()

    return {
        "total_hotspots": total_hotspots,
        "critical_hotspots": critical,
        "high_risk_hotspots": high,
        "pending_cleanup": pending_cleanup,
        "completed_cleanup": completed_cleanup,
        "open_actions": open_actions,
    }
