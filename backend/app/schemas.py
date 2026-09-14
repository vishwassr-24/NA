"""
NEXUS AQUA - Pydantic Schemas
Request/Response models for all API endpoints
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─────────────────────────────────────────────
# Enums (mirror models.py for schema use)
# ─────────────────────────────────────────────

class UserRole(str, Enum):
    admin = "admin"
    survey_operator = "survey_operator"
    environment_officer = "environment_officer"
    marine_expert = "marine_expert"
    researcher = "researcher"


class UserStatus(str, Enum):
    pending = "pending"
    active = "active"
    suspended = "suspended"


class SurveyStatus(str, Enum):
    active = "active"
    completed = "completed"
    archived = "archived"


class DetectionStatus(str, Enum):
    pending_review = "pending_review"
    confirmed = "confirmed"
    changed = "changed"
    rejected = "rejected"
    auto_confirmed = "auto_confirmed"


class RiskLevel(str, Enum):
    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"
    critical = "CRITICAL"


class CleanupPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


# ─────────────────────────────────────────────
# Auth Schemas
# ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    user_id: str = Field(..., min_length=3, max_length=50, description="Unique user ID (alphanumeric)")
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str
    role: UserRole

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "password" in values and v != values["password"]:
            raise ValueError("Passwords do not match")
        return v

    @validator("user_id")
    def user_id_alphanumeric(cls, v):
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("User ID must be alphanumeric (underscores/hyphens allowed)")
        return v.lower()


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or User ID")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class UserPublic(BaseModel):
    id: int
    user_id: str
    name: str
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Survey Schemas
# ─────────────────────────────────────────────

class SurveyCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    depth_m: Optional[float] = Field(None, ge=0)


class SurveyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    depth_m: Optional[float] = Field(None, ge=0)
    status: Optional[SurveyStatus] = None


class SurveyResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    location_name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    depth_m: Optional[float]
    status: SurveyStatus
    created_at: datetime
    updated_at: Optional[datetime]
    operator_id: int
    operator_name: Optional[str] = None
    image_count: int = 0

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Detection Schemas
# ─────────────────────────────────────────────

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class DetectionResult(BaseModel):
    id: Optional[int] = None
    class_name: str
    confidence: float
    bbox: BoundingBox
    risk_level: Optional[RiskLevel] = None
    status: Optional[DetectionStatus] = None
    object_description: Optional[str] = None
    material: Optional[str] = None
    estimated_size_m: Optional[float] = None
    environmental_hazard: Optional[str] = None
    removal_suggestion: Optional[str] = None


class AIInferenceResponse(BaseModel):
    sonar_image_id: int
    survey_id: int
    filename: str
    detections: List[DetectionResult]
    anomaly_score: float
    risk_level: RiskLevel
    explanation: str
    inference_latency_ms: float
    needs_expert_review: bool
    total_objects: int
    auto_dispatched_to_expert: bool = False


# ─────────────────────────────────────────────
# Expert Review Schemas
# ─────────────────────────────────────────────

class ExpertReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(confirm|change|reject)$")
    changed_class: Optional[str] = None
    comment: Optional[str] = None

    @validator("changed_class")
    def changed_class_required_on_change(cls, v, values):
        if values.get("action") == "change" and not v:
            raise ValueError("changed_class is required when action is 'change'")
        return v


class ExpertReviewResponse(BaseModel):
    id: int
    detection_id: int
    expert_id: int
    expert_name: str
    action: str
    changed_class: Optional[str]
    comment: Optional[str]
    reviewed_at: datetime

    class Config:
        from_attributes = True


class ExpertConfirmationRequest(BaseModel):
    operator_notes: Optional[str] = None
    priority: Optional[str] = "normal"


class PendingDetectionResponse(BaseModel):
    detection_id: int
    sonar_image_id: int
    survey_id: int
    survey_title: str
    class_name: str
    confidence: float
    bbox: BoundingBox
    risk_level: Optional[RiskLevel]
    anomaly_score: Optional[float]
    uploaded_at: datetime
    image_filename: str
    object_description: Optional[str] = None
    material: Optional[str] = None
    estimated_size_m: Optional[float] = None
    environmental_hazard: Optional[str] = None
    removal_suggestion: Optional[str] = None
    operator_notes: Optional[str] = None
    image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None


# ─────────────────────────────────────────────
# Hotspot Schemas
# ─────────────────────────────────────────────

class HotspotCreate(BaseModel):
    survey_id: int
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    risk_level: RiskLevel
    debris_count: int = Field(0, ge=0)
    cleanup_priority: CleanupPriority
    notes: Optional[str] = None


class HotspotUpdate(BaseModel):
    cleanup_status: Optional[str] = None
    cleanup_priority: Optional[CleanupPriority] = None
    notes: Optional[str] = None


class HotspotResponse(BaseModel):
    id: int
    survey_id: int
    latitude: float
    longitude: float
    risk_level: RiskLevel
    debris_count: int
    cleanup_priority: CleanupPriority
    cleanup_status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Action Record Schemas
# ─────────────────────────────────────────────

class ActionCreate(BaseModel):
    hotspot_id: int
    action_description: str = Field(..., min_length=5)


class ActionUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(open|in_progress|closed)$")
    action_description: Optional[str] = None


class ActionResponse(BaseModel):
    id: int
    hotspot_id: int
    officer_id: int
    action_description: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Admin Schemas
# ─────────────────────────────────────────────

class UserStatusUpdate(BaseModel):
    status: UserStatus


class UserRoleUpdate(BaseModel):
    role: UserRole


class AdminUserResponse(BaseModel):
    id: int
    user_id: str
    name: str
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Sonar Image Schema
# ─────────────────────────────────────────────

class SonarImageResponse(BaseModel):
    id: int
    survey_id: int
    filename: str
    original_filename: str
    file_size_bytes: Optional[int]
    uploaded_at: datetime
    processed: bool
    inference_latency_ms: Optional[float]
    anomaly_score: Optional[float]
    risk_level: Optional[RiskLevel]
    ai_explanation: Optional[str]

    class Config:
        from_attributes = True


# Fix forward references
TokenResponse.model_rebuild()
