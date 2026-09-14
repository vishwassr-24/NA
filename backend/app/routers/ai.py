"""
NEXUS AQUA - AI Router
Handles: sonar image upload + AI inference
POST /ai/analyze/{survey_id} — the ONLY endpoint that triggers AI.
The model NEVER uses hardcoded images; it always processes the user upload.
"""

import os
import uuid
import time
import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Survey, SonarImage, Detection, Hotspot, RiskLevel, CleanupPriority, DetectionStatus
from app.schemas import AIInferenceResponse, DetectionResult, BoundingBox
from app.dependencies import survey_operator_access, get_current_user
from app.ai.preprocessor import get_preprocessor, PreprocessingError
from app.ai.detector import get_detector
from app.ai.risk_engine import get_risk_engine

router = APIRouter(prefix="/ai", tags=["AI Inference"])
logger = logging.getLogger(__name__)

# Allowed image MIME types
ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png",
    "image/tiff", "image/bmp", "image/webp",
}

MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "500")) * 1024 * 1024
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/analyze/{survey_id}", response_model=AIInferenceResponse)
async def analyze_sonar_image(
    survey_id: int,
    file: UploadFile = File(..., description="Side-scan sonar image file (JPEG/PNG/TIFF)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(survey_operator_access),
):
    """
    Upload a side-scan sonar image and run AI inference.

    Pipeline:
    1. Validate file (type, size)
    2. Save to disk
    3. Preprocess (denoise, CLAHE, normalize)
    4. YOLO debris detection (parallel anomaly scoring)
    5. Risk engine assessment
    6. Save results to database
    7. Return full inference response with measured latency
    """
    total_start = time.perf_counter()

    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    # ── 2. Validate file type ─────────────────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {content_type}. Allowed: JPEG, PNG, TIFF, BMP, WEBP",
        )

    # ── 3. Read file bytes (with size check) ──────────────────────────────────
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(image_bytes) / 1024 / 1024:.1f} MB). Max: {MAX_FILE_SIZE_BYTES // 1024 // 1024} MB",
        )

    # ── 4. Save to disk ───────────────────────────────────────────────────────
    original_filename = file.filename or "sonar_image"
    ext = Path(original_filename).suffix.lower() or ".jpg"
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / stored_filename

    try:
        with open(file_path, "wb") as f:
            f.write(image_bytes)
    except IOError as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")

    # ── 5. Create SonarImage record ───────────────────────────────────────────
    sonar_image = SonarImage(
        survey_id=survey_id,
        filename=stored_filename,
        original_filename=original_filename,
        file_path=str(file_path),
        file_size_bytes=len(image_bytes),
        uploaded_by=current_user.id,
        processed=False,
    )
    db.add(sonar_image)
    db.commit()
    db.refresh(sonar_image)

    # ── 6. Preprocess ─────────────────────────────────────────────────────────
    preprocessor = get_preprocessor()
    try:
        preprocessed, original_img, prep_meta = preprocessor.preprocess(image_bytes)
    except PreprocessingError as e:
        sonar_image.processing_error = str(e)
        db.commit()
        raise HTTPException(status_code=422, detail=f"Image preprocessing failed: {str(e)}")

    # ── 7. AI Inference (YOLO + Anomaly) ─────────────────────────────────────
    detector = get_detector()
    inference_result = detector.detect(preprocessed)

    # ── 8. Risk Assessment ────────────────────────────────────────────────────
    risk_engine = get_risk_engine()
    risk = risk_engine.assess(
        detections=inference_result.detections,
        anomaly_score=inference_result.anomaly_score,
        latitude=survey.latitude,
        longitude=survey.longitude,
    )

    total_latency_ms = round((time.perf_counter() - total_start) * 1000, 2)

    # ── 9. Determine detection statuses ──────────────────────────────────────
    # High-confidence detections auto-confirmed; low-confidence → pending expert review
    from app.ai.detector import HIGH_CONFIDENCE_THRESHOLD

    detection_records = []
    detection_responses = []

    risk_level_map = {
        "LOW": RiskLevel.low,
        "MEDIUM": RiskLevel.medium,
        "HIGH": RiskLevel.high,
        "CRITICAL": RiskLevel.critical,
    }
    overall_risk_enum = risk_level_map[risk.risk_level]

    has_anomalies = len(inference_result.detections) > 0 or inference_result.anomaly_score >= 0.35

    for det in inference_result.detections:
        # Automatically send all AI-detected anomalies/debris to Marine Expert for verification
        det_status = DetectionStatus.pending_review
        det_risk = _compute_per_detection_risk(det.class_name, det.confidence)

        detection_record = Detection(
            sonar_image_id=sonar_image.id,
            class_name=det.class_name,
            confidence=det.confidence,
            bbox_x1=det.x1,
            bbox_y1=det.y1,
            bbox_x2=det.x2,
            bbox_y2=det.y2,
            status=det_status,
            risk_level=risk_level_map.get(det_risk, RiskLevel.medium),
            object_description=det.object_description,
            material=det.material,
            estimated_size_m=det.estimated_size_m,
            environmental_hazard=det.environmental_hazard,
            removal_suggestion=det.removal_suggestion,
            operator_notes="AI Autonomous Dispatch: Anomaly detected. Automatically queued for Marine Expert verification.",
        )
        db.add(detection_record)
        detection_records.append(detection_record)

        detection_responses.append(DetectionResult(
            class_name=det.class_name,
            confidence=det.confidence,
            bbox=BoundingBox(x1=det.x1, y1=det.y1, x2=det.x2, y2=det.y2),
            risk_level=risk_level_map.get(det_risk),
            status=det_status,
            object_description=det.object_description,
            material=det.material,
            estimated_size_m=det.estimated_size_m,
            environmental_hazard=det.environmental_hazard,
            removal_suggestion=det.removal_suggestion,
        ))

    # ── 10. Update SonarImage with results & Auto-Dispatch to Expert ──────────
    sonar_image.processed = True
    sonar_image.inference_latency_ms = total_latency_ms
    sonar_image.anomaly_score = inference_result.anomaly_score
    sonar_image.risk_level = overall_risk_enum
    sonar_image.ai_explanation = risk.explanation

    # Automatically flag for Marine Expert review if anomalies or debris were detected
    if has_anomalies and len(inference_result.detections) > 0:
        sonar_image.review_requested = True
        sonar_image.operator_notes = (
            f"AI Autonomous Dispatch: {len(inference_result.detections)} anomaly contact(s) detected "
            f"(Score: {inference_result.anomaly_score:.2f}). Automatically routed to Marine Expert confirmation queue."
        )
        logger.info(f"AI auto-dispatched {len(inference_result.detections)} detection(s) to Marine Expert for image {sonar_image.id}")

    db.commit()

    # Refresh detection IDs
    db.flush()
    for i, dr in enumerate(detection_records):
        db.refresh(dr)
        detection_responses[i].id = dr.id

    # ── 11. Auto-create hotspot if risk is HIGH or CRITICAL ───────────────────
    if risk.risk_level in ("HIGH", "CRITICAL") and survey.latitude and survey.longitude:
        cleanup_map = {
            "low": CleanupPriority.low,
            "medium": CleanupPriority.medium,
            "high": CleanupPriority.high,
            "urgent": CleanupPriority.urgent,
        }
        hotspot = Hotspot(
            survey_id=survey_id,
            latitude=survey.latitude,
            longitude=survey.longitude,
            risk_level=overall_risk_enum,
            debris_count=len(inference_result.detections),
            cleanup_priority=cleanup_map[risk.cleanup_priority],
            notes=f"Auto-generated from AI analysis. {risk.explanation[:200]}",
        )
        db.add(hotspot)
        db.commit()

    logger.info(
        f"AI analysis complete | survey={survey_id} | image={sonar_image.id} | "
        f"objects={len(inference_result.detections)} | risk={risk.risk_level} | "
        f"latency={total_latency_ms:.2f}ms | auto_expert={has_anomalies and len(inference_result.detections) > 0}"
    )

    return AIInferenceResponse(
        sonar_image_id=sonar_image.id,
        survey_id=survey_id,
        filename=original_filename,
        detections=detection_responses,
        anomaly_score=inference_result.anomaly_score,
        risk_level=overall_risk_enum,
        explanation=risk.explanation,
        inference_latency_ms=total_latency_ms,
        needs_expert_review=True if (has_anomalies and len(inference_result.detections) > 0) else risk.needs_expert_review,
        total_objects=len(inference_result.detections),
        auto_dispatched_to_expert=has_anomalies and len(inference_result.detections) > 0,
    )


def _get_image_access_user(
    token: str = None,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Helper to authenticate image requests via Bearer header or ?token= query parameter."""
    jwt_token = None
    if authorization and authorization.startswith("Bearer "):
        jwt_token = authorization.split(" ")[1]
    elif token:
        jwt_token = token

    if not jwt_token:
        raise HTTPException(status_code=401, detail="Authentication required to view image")

    from app.auth import decode_access_token
    from app.models import UserStatus
    payload = decode_access_token(jwt_token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    user = db.query(User).filter(User.user_id == payload.get("sub")).first()
    if not user or user.status != UserStatus.active:
        raise HTTPException(status_code=403, detail="User account is inactive or not found")
    return user


@router.get("/image/{image_id}/file")
def serve_sonar_image(
    image_id: int,
    token: str = None,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """Serve the stored sonar image file (supports token query param or Bearer header)."""
    user = _get_image_access_user(token=token, authorization=authorization, db=db)
    img = db.query(SonarImage).filter(SonarImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    file_path = Path(img.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    return FileResponse(
        path=str(file_path),
        media_type="image/jpeg",
        filename=img.original_filename,
    )


@router.get("/image/{image_id}/annotated")
def serve_annotated_image(
    image_id: int,
    highlight_detection_id: int = None,
    token: str = None,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """
    Serve the sonar image with bounding boxes, risk-level highlights,
    and classified debris labels burned in for expert confirmation and reporting.
    """
    import io
    import cv2
    import numpy as np
    from fastapi.responses import StreamingResponse

    user = _get_image_access_user(token=token, authorization=authorization, db=db)
    img = db.query(SonarImage).filter(SonarImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    file_path = Path(img.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    detections = db.query(Detection).filter(Detection.sonar_image_id == image_id).all()

    cv_img = cv2.imread(str(file_path))
    if cv_img is None:
        return FileResponse(path=str(file_path), media_type="image/jpeg", filename=img.original_filename)

    h, w = cv_img.shape[:2]

    # BGR Color map
    COLOR_MAP = {
        RiskLevel.critical: (30, 30, 220),    # Red
        RiskLevel.high: (0, 120, 240),        # Orange
        RiskLevel.medium: (0, 200, 255),      # Gold
        RiskLevel.low: (220, 180, 0),         # Ocean Cyan
    }

    for idx, det in enumerate(detections):
        x1 = max(0, min(w - 1, int(det.bbox_x1 * w)))
        y1 = max(0, min(h - 1, int(det.bbox_y1 * h)))
        x2 = max(0, min(w - 1, int(det.bbox_x2 * w)))
        y2 = max(0, min(h - 1, int(det.bbox_y2 * h)))

        is_focused = (highlight_detection_id is None) or (det.id == highlight_detection_id)
        box_color = COLOR_MAP.get(det.risk_level, (220, 180, 0))
        thick = 3 if is_focused else 2

        # Draw bounding box
        cv2.rectangle(cv_img, (x1, y1), (x2, y2), box_color, thick)

        # Label badge
        size_str = f" ~{det.estimated_size_m:.1f}m" if det.estimated_size_m else ""
        label = f"#{idx+1} {det.class_name.replace('_', ' ').title()} {int(det.confidence * 100)}%{size_str}"

        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = max(0.45, min(0.75, w / 1000.0))
        text_thick = 1 if scale < 0.6 else 2
        (tw, th), _ = cv2.getTextSize(label, font, scale, text_thick)

        ly1 = max(0, y1 - th - 8)
        ly2 = y1
        lx2 = min(w, x1 + tw + 10)

        # Filled background pill
        cv2.rectangle(cv_img, (x1, ly1), (lx2, ly2), box_color, -1)
        # White text inside pill
        cv2.putText(cv_img, label, (x1 + 4, ly2 - 4), font, scale, (255, 255, 255), text_thick, cv2.LINE_AA)

    success, enc = cv2.imencode(".jpg", cv_img, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    if not success:
        return FileResponse(path=str(file_path), media_type="image/jpeg", filename=img.original_filename)

    return StreamingResponse(io.BytesIO(enc.tobytes()), media_type="image/jpeg")


@router.get("/image/{image_id}/results", response_model=AIInferenceResponse)
def get_image_results(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve previously computed AI results for a sonar image."""
    img = db.query(SonarImage).filter(SonarImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    if not img.processed:
        raise HTTPException(status_code=202, detail="Image has not been processed yet")

    detections = db.query(Detection).filter(Detection.sonar_image_id == image_id).all()

    risk_level_map = {
        RiskLevel.low: "LOW",
        RiskLevel.medium: "MEDIUM",
        RiskLevel.high: "HIGH",
        RiskLevel.critical: "CRITICAL",
    }

    detection_responses = [
        DetectionResult(
            id=d.id,
            class_name=d.class_name,
            confidence=d.confidence,
            bbox=BoundingBox(x1=d.bbox_x1, y1=d.bbox_y1, x2=d.bbox_x2, y2=d.bbox_y2),
            risk_level=d.risk_level,
            status=d.status,
            object_description=getattr(d, "object_description", None),
            material=getattr(d, "material", None),
            estimated_size_m=getattr(d, "estimated_size_m", None),
            environmental_hazard=getattr(d, "environmental_hazard", None),
            removal_suggestion=getattr(d, "removal_suggestion", None),
        )
        for d in detections
    ]

    return AIInferenceResponse(
        sonar_image_id=img.id,
        survey_id=img.survey_id,
        filename=img.original_filename,
        detections=detection_responses,
        anomaly_score=img.anomaly_score or 0.0,
        risk_level=img.risk_level or RiskLevel.low,
        explanation=img.ai_explanation or "",
        inference_latency_ms=img.inference_latency_ms or 0.0,
        needs_expert_review=any(d.status == DetectionStatus.pending_review for d in detections),
        total_objects=len(detections),
    )


def _compute_per_detection_risk(class_name: str, confidence: float) -> str:
    """Quick risk level for individual detection."""
    from app.ai.risk_engine import CLASS_RISK_SCORES
    base = CLASS_RISK_SCORES.get(class_name, 0.45)
    score = base * (0.5 + 0.5 * confidence)
    if score >= 0.80: return "CRITICAL"
    if score >= 0.60: return "HIGH"
    if score >= 0.35: return "MEDIUM"
    return "LOW"
