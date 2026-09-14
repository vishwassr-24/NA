"""
NEXUS AQUA - Survey Router
Handles: survey CRUD, sonar image listing
Accessible by: Survey Operator + Admin
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Survey, SonarImage, SurveyStatus
from app.schemas import SurveyCreate, SurveyUpdate, SurveyResponse, SonarImageResponse
from app.dependencies import survey_operator_access, get_current_user

router = APIRouter(prefix="/surveys", tags=["Surveys"])


@router.post("/", response_model=SurveyResponse, status_code=status.HTTP_201_CREATED)
def create_survey(
    payload: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(survey_operator_access),
):
    """Create a new survey session."""
    survey = Survey(
        title=payload.title,
        description=payload.description,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        depth_m=payload.depth_m,
        operator_id=current_user.id,
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)

    return _enrich_survey(survey, db)


@router.get("/", response_model=List[SurveyResponse])
def list_surveys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List surveys:
    - Admin: all surveys
    - Survey Operator: only their own
    - Others: all (read-only access for researcher/env officer)
    """
    from app.models import UserRole
    if current_user.role == UserRole.survey_operator:
        surveys = db.query(Survey).filter(Survey.operator_id == current_user.id).order_by(Survey.created_at.desc()).all()
    else:
        surveys = db.query(Survey).order_by(Survey.created_at.desc()).all()

    return [_enrich_survey(s, db) for s in surveys]


@router.get("/{survey_id}", response_model=SurveyResponse)
def get_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific survey by ID."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return _enrich_survey(survey, db)


@router.patch("/{survey_id}", response_model=SurveyResponse)
def update_survey(
    survey_id: int,
    payload: SurveyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(survey_operator_access),
):
    """Update a survey. Operator can only update their own surveys."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    from app.models import UserRole
    if current_user.role == UserRole.survey_operator and survey.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot modify another operator's survey")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(survey, key, value)

    db.commit()
    db.refresh(survey)
    return _enrich_survey(survey, db)


@router.delete("/{survey_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(survey_operator_access),
):
    """Delete a survey (operator can only delete own, admin can delete any)."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    from app.models import UserRole
    if current_user.role == UserRole.survey_operator and survey.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete another operator's survey")

    db.delete(survey)
    db.commit()


@router.get("/{survey_id}/images", response_model=List[SonarImageResponse])
def list_survey_images(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all sonar images for a survey."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    images = db.query(SonarImage).filter(SonarImage.survey_id == survey_id).order_by(SonarImage.uploaded_at.desc()).all()
    return images


def _enrich_survey(survey: Survey, db: Session) -> SurveyResponse:
    """Add computed fields: operator_name, image_count."""
    operator = db.query(User).filter(User.id == survey.operator_id).first()
    image_count = db.query(SonarImage).filter(SonarImage.survey_id == survey.id).count()

    resp = SurveyResponse.model_validate(survey)
    resp.operator_name = operator.name if operator else "Unknown"
    resp.image_count = image_count
    return resp
