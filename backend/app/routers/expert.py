"""
NEXUS AQUA - Expert Review Router
Handles Marine Expert human-in-the-loop review of AI detections.
Accessible by: Marine Expert + Admin
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import (
    User, Detection, ExpertReview, SonarImage, Survey,
    DetectionStatus, UserRole
)
from app.schemas import (
    ExpertReviewRequest, ExpertReviewResponse, PendingDetectionResponse,
    ExpertConfirmationRequest, BoundingBox
)
from app.dependencies import marine_expert_access, survey_operator_access

router = APIRouter(prefix="/expert", tags=["Marine Expert Review"])


@router.post("/request-confirmation/{sonar_image_id}")
def request_expert_confirmation(
    sonar_image_id: int,
    payload: Optional[ExpertConfirmationRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(survey_operator_access),
):
    """
    Called by the Survey Operator to dispatch an analyzed image and all its detections
    as a formal verification request to the Marine Expert.
    """
    img = db.query(SonarImage).filter(SonarImage.id == sonar_image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Sonar image not found")

    detections = db.query(Detection).filter(Detection.sonar_image_id == sonar_image_id).all()
    if not detections:
        raise HTTPException(
            status_code=400,
            detail="This sonar scan has no detected objects or anomalies to verify."
        )

    notes = payload.operator_notes if payload and payload.operator_notes else None

    # Update all detections for this image to pending_review
    for det in detections:
        det.status = DetectionStatus.pending_review
        if notes:
            det.operator_notes = notes

    img.review_requested = True
    if notes:
        img.operator_notes = notes

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully transmitted sonar scan and {len(detections)} detection(s) to Marine Expert for confirmation.",
        "sonar_image_id": sonar_image_id,
        "queued_detections": len(detections),
        "operator_notes": notes,
    }


@router.get("/pending", response_model=List[PendingDetectionResponse])
def get_pending_detections(
    db: Session = Depends(get_db),
    current_user: User = Depends(marine_expert_access),
):
    """
    Get all detections awaiting expert review (status = pending_review).
    Returns enriched detection data with survey context, highlighted image URLs, and removal strategies.
    """
    pending = (
        db.query(Detection)
        .filter(Detection.status == DetectionStatus.pending_review)
        .join(SonarImage, Detection.sonar_image_id == SonarImage.id)
        .join(Survey, SonarImage.survey_id == Survey.id)
        .order_by(Detection.created_at.desc())
        .all()
    )

    results = []
    for det in pending:
        img = db.query(SonarImage).filter(SonarImage.id == det.sonar_image_id).first()
        survey = db.query(Survey).filter(Survey.id == img.survey_id).first() if img else None

        image_url = f"/api/ai/image/{det.sonar_image_id}/file"
        annotated_url = f"/api/ai/image/{det.sonar_image_id}/annotated"

        results.append(PendingDetectionResponse(
            detection_id=det.id,
            sonar_image_id=det.sonar_image_id,
            survey_id=survey.id if survey else 0,
            survey_title=survey.title if survey else "Unknown",
            class_name=det.class_name,
            confidence=det.confidence,
            bbox=BoundingBox(x1=det.bbox_x1, y1=det.bbox_y1, x2=det.bbox_x2, y2=det.bbox_y2),
            risk_level=det.risk_level,
            anomaly_score=img.anomaly_score if img else None,
            uploaded_at=img.uploaded_at if img else det.created_at,
            image_filename=img.original_filename if img else "",
            object_description=getattr(det, "object_description", None),
            material=getattr(det, "material", None),
            estimated_size_m=getattr(det, "estimated_size_m", None),
            environmental_hazard=getattr(det, "environmental_hazard", None),
            removal_suggestion=getattr(det, "removal_suggestion", None),
            operator_notes=getattr(det, "operator_notes", None) or (getattr(img, "operator_notes", None) if img else None),
            image_url=image_url,
            annotated_image_url=annotated_url,
        ))

    return results


@router.post("/review/{detection_id}", response_model=ExpertReviewResponse)
def review_detection(
    detection_id: int,
    payload: ExpertReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(marine_expert_access),
):
    """
    Submit an expert review for a detection.
    Actions:
    - confirm: Accept AI classification as-is
    - change: Override AI classification with a new class + comment
    - reject: Mark detection as false positive
    """
    # Verify detection exists
    detection = db.query(Detection).filter(Detection.id == detection_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")

    # Check if already reviewed
    existing_review = db.query(ExpertReview).filter(ExpertReview.detection_id == detection_id).first()
    if existing_review:
        raise HTTPException(
            status_code=409,
            detail="Detection has already been reviewed. Delete existing review first.",
        )

    # Create the review record
    review = ExpertReview(
        detection_id=detection_id,
        expert_id=current_user.id,
        action=payload.action,
        changed_class=payload.changed_class if payload.action == "change" else None,
        comment=payload.comment,
    )
    db.add(review)

    # Update detection status based on action
    status_map = {
        "confirm": DetectionStatus.confirmed,
        "change": DetectionStatus.changed,
        "reject": DetectionStatus.rejected,
    }
    detection.status = status_map[payload.action]

    # If classification changed, update the class name
    if payload.action == "change" and payload.changed_class:
        detection.class_name = payload.changed_class

    db.commit()
    db.refresh(review)

    return ExpertReviewResponse(
        id=review.id,
        detection_id=review.detection_id,
        expert_id=review.expert_id,
        expert_name=current_user.name,
        action=review.action,
        changed_class=review.changed_class,
        comment=review.comment,
        reviewed_at=review.reviewed_at,
    )


@router.get("/reviews", response_model=List[ExpertReviewResponse])
def list_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(marine_expert_access),
):
    """List all reviews submitted by the current expert."""
    reviews = (
        db.query(ExpertReview)
        .filter(ExpertReview.expert_id == current_user.id)
        .order_by(ExpertReview.reviewed_at.desc())
        .all()
    )

    results = []
    for r in reviews:
        expert = db.query(User).filter(User.id == r.expert_id).first()
        results.append(ExpertReviewResponse(
            id=r.id,
            detection_id=r.detection_id,
            expert_id=r.expert_id,
            expert_name=expert.name if expert else "Unknown",
            action=r.action,
            changed_class=r.changed_class,
            comment=r.comment,
            reviewed_at=r.reviewed_at,
        ))
    return results


@router.get("/stats")
def get_expert_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(marine_expert_access),
):
    """Summary stats for the expert dashboard."""
    total_pending = db.query(Detection).filter(Detection.status == DetectionStatus.pending_review).count()
    total_confirmed = db.query(Detection).filter(Detection.status == DetectionStatus.confirmed).count()
    total_changed = db.query(Detection).filter(Detection.status == DetectionStatus.changed).count()
    total_rejected = db.query(Detection).filter(Detection.status == DetectionStatus.rejected).count()
    my_reviews = db.query(ExpertReview).filter(ExpertReview.expert_id == current_user.id).count()

    return {
        "pending_review": total_pending,
        "confirmed": total_confirmed,
        "changed": total_changed,
        "rejected": total_rejected,
        "my_total_reviews": my_reviews,
    }
