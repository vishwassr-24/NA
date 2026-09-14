"""
NEXUS AQUA - SQLAlchemy ORM Models
All database tables: users, surveys, detections, expert reviews, hotspots
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


# ─────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    survey_operator = "survey_operator"
    environment_officer = "environment_officer"
    marine_expert = "marine_expert"
    researcher = "researcher"


class UserStatus(str, enum.Enum):
    pending = "pending"       # Awaiting admin approval (for sensitive roles)
    active = "active"
    suspended = "suspended"


class SurveyStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    archived = "archived"


class DetectionStatus(str, enum.Enum):
    pending_review = "pending_review"   # Low-confidence → needs expert
    confirmed = "confirmed"
    changed = "changed"
    rejected = "rejected"
    auto_confirmed = "auto_confirmed"   # High-confidence → auto


class RiskLevel(str, enum.Enum):
    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"
    critical = "CRITICAL"


class CleanupPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


# ─────────────────────────────────────────────
# User
# ─────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, index=True, nullable=False)   # Custom user ID / email
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    status = Column(SAEnum(UserStatus), default=UserStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    surveys = relationship("Survey", back_populates="operator", foreign_keys="Survey.operator_id")
    expert_reviews = relationship("ExpertReview", back_populates="expert", foreign_keys="ExpertReview.expert_id")


# ─────────────────────────────────────────────
# Survey
# ─────────────────────────────────────────────

class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    location_name = Column(String(200), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    depth_m = Column(Float, nullable=True)
    status = Column(SAEnum(SurveyStatus), default=SurveyStatus.active, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    operator = relationship("User", back_populates="surveys", foreign_keys=[operator_id])
    sonar_images = relationship("SonarImage", back_populates="survey", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# Sonar Image (uploaded file + AI results)
# ─────────────────────────────────────────────

class SonarImage(Base):
    __tablename__ = "sonar_images"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    filename = Column(String(300), nullable=False)          # Stored filename
    original_filename = Column(String(300), nullable=False) # User's original filename
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # AI Processing results (stored after inference)
    processed = Column(Boolean, default=False)
    inference_latency_ms = Column(Float, nullable=True)
    anomaly_score = Column(Float, nullable=True)
    risk_level = Column(SAEnum(RiskLevel), nullable=True)
    ai_explanation = Column(Text, nullable=True)
    processing_error = Column(Text, nullable=True)
    review_requested = Column(Boolean, default=False)
    operator_notes = Column(Text, nullable=True)

    # Relationships
    survey = relationship("Survey", back_populates="sonar_images")
    detections = relationship("Detection", back_populates="sonar_image", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# Detection (individual YOLO bounding box result)
# ─────────────────────────────────────────────

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    sonar_image_id = Column(Integer, ForeignKey("sonar_images.id"), nullable=False)

    # YOLO output
    class_name = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    bbox_x1 = Column(Float, nullable=False)
    bbox_y1 = Column(Float, nullable=False)
    bbox_x2 = Column(Float, nullable=False)
    bbox_y2 = Column(Float, nullable=False)

    # Status & expert review
    status = Column(SAEnum(DetectionStatus), default=DetectionStatus.pending_review, nullable=False)
    risk_level = Column(SAEnum(RiskLevel), nullable=True)
    object_description = Column(Text, nullable=True)
    material = Column(String(100), nullable=True)
    estimated_size_m = Column(Float, nullable=True)
    environmental_hazard = Column(Text, nullable=True)
    removal_suggestion = Column(Text, nullable=True)
    operator_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sonar_image = relationship("SonarImage", back_populates="detections")
    expert_review = relationship("ExpertReview", back_populates="detection", uselist=False)


# ─────────────────────────────────────────────
# Expert Review (Marine Expert human-in-the-loop)
# ─────────────────────────────────────────────

class ExpertReview(Base):
    __tablename__ = "expert_reviews"

    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey("detections.id"), unique=True, nullable=False)
    expert_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(20), nullable=False)          # confirm / change / reject
    changed_class = Column(String(100), nullable=True)  # if action == "change"
    comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    detection = relationship("Detection", back_populates="expert_review")
    expert = relationship("User", back_populates="expert_reviews", foreign_keys=[expert_id])


# ─────────────────────────────────────────────
# Hotspot (geospatial pollution/debris hotspot)
# ─────────────────────────────────────────────

class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    risk_level = Column(SAEnum(RiskLevel), nullable=False)
    debris_count = Column(Integer, default=0)
    cleanup_priority = Column(SAEnum(CleanupPriority), nullable=False)
    cleanup_status = Column(String(50), default="pending")  # pending / in_progress / done
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    survey = relationship("Survey")


# ─────────────────────────────────────────────
# Action Tracking (environment officer)
# ─────────────────────────────────────────────

class ActionRecord(Base):
    __tablename__ = "action_records"

    id = Column(Integer, primary_key=True, index=True)
    hotspot_id = Column(Integer, ForeignKey("hotspots.id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_description = Column(Text, nullable=False)
    status = Column(String(50), default="open")   # open / in_progress / closed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    hotspot = relationship("Hotspot")
    officer = relationship("User")
