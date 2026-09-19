"""
NEXUS AQUA - Marine Hazard Alerts Router
Provides real-time high-risk and danger to marine life alerts.
Targeted for: Administrator and Researcher workstations.
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, UserRole, Survey, SonarImage, Detection, Hotspot, RiskLevel
from app.dependencies import get_current_user
from app.ai.detector import OBJECT_INTELLIGENCE

router = APIRouter(prefix="/alerts", tags=["Marine Alerts"])


def admin_or_researcher_access(current_user: User = Depends(get_current_user)) -> User:
    """Restricts access to Administrator and Researcher roles."""
    if current_user.role not in [UserRole.admin, UserRole.researcher]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Marine hazard alerts are restricted to Administrator and Researcher roles.",
        )
    return current_user


class MarineHazardAlert(BaseModel):
    id: str
    source_type: str                  # "detection", "hotspot", "sonar_image"
    severity: str                     # "CRITICAL" or "HIGH"
    title: str
    debris_class: str
    debris_label: str
    material: Optional[str] = None
    marine_life_hazard: str
    removal_strategy: str
    survey_id: int
    survey_title: str
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    depth_m: Optional[float] = None
    confidence: Optional[float] = None
    image_id: Optional[int] = None
    detected_at: str


class MarineHazardResponse(BaseModel):
    total_hazards: int
    critical_count: int
    high_count: int
    hazards: List[MarineHazardAlert]
    generated_at: str


@router.get("/marine-hazards", response_model=MarineHazardResponse)
def get_marine_life_hazard_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_researcher_access),
):
    """
    Retrieve all high-risk and critical threats to marine life.
    Aggregates detections, hotspots, and sonar images flagged as HIGH or CRITICAL risk.
    Includes ecological threat analysis and safe removal guidelines.
    """
    alerts: List[MarineHazardAlert] = []

    # ── 1. Detections flagged HIGH or CRITICAL ─────────────────────────────────
    # Detections linked to sonar images and surveys
    detections = (
        db.query(Detection, SonarImage, Survey)
        .join(SonarImage, Detection.sonar_image_id == SonarImage.id)
        .join(Survey, SonarImage.survey_id == Survey.id)
        .all()
    )

    for det, img, srv in detections:
        # Check risk level (handle both string values and Enum)
        risk_str = str(det.risk_level.value if hasattr(det.risk_level, 'value') else det.risk_level or '').upper()
        if risk_str not in ("HIGH", "CRITICAL"):
            # Check if class itself is inherently a high marine danger (e.g. ghost net or metal drum)
            if det.class_name in ("ghost_net", "fishing_net", "metal_drum", "cargo_container"):
                risk_str = "HIGH"
            else:
                continue

        intel = OBJECT_INTELLIGENCE.get(det.class_name, {})
        hazard_desc = (
            det.environmental_hazard
            or intel.get("hazard")
            or f"{risk_str} Risk — Acute hazard to marine life, fish stocks, and benthic habitats."
        )
        removal = (
            det.removal_suggestion
            or intel.get("removal_strategy")
            or "Deploy certified ROV or dive team with specialized rigging to safely extract debris without damaging coral reefs or marine fauna."
        )

        label = intel.get("label", det.class_name.replace("_", " ").title())
        material = det.material or intel.get("material", "Marine Composite")

        alerts.append(MarineHazardAlert(
            id=f"det-{det.id}",
            source_type="detection",
            severity=risk_str,
            title=f"{risk_str} DANGER: {label}",
            debris_class=det.class_name,
            debris_label=label,
            material=material,
            marine_life_hazard=hazard_desc,
            removal_strategy=removal,
            survey_id=srv.id,
            survey_title=srv.title,
            location_name=srv.location_name,
            latitude=srv.latitude,
            longitude=srv.longitude,
            depth_m=srv.depth_m,
            confidence=round(det.confidence, 2) if det.confidence else None,
            image_id=img.id,
            detected_at=det.created_at.isoformat() if det.created_at else datetime.utcnow().isoformat(),
        ))

    # ── 2. Hotspots flagged HIGH or CRITICAL ───────────────────────────────────
    hotspots = (
        db.query(Hotspot, Survey)
        .join(Survey, Hotspot.survey_id == Survey.id)
        .all()
    )

    for hs, srv in hotspots:
        hs_risk_str = str(hs.risk_level.value if hasattr(hs.risk_level, 'value') else hs.risk_level or '').upper()
        if hs_risk_str not in ("HIGH", "CRITICAL"):
            continue

        # Prevent duplicate if we already have detailed detections for this survey
        hotspot_id = f"hotspot-{hs.id}"
        notes = hs.notes or "High concentration of underwater marine debris detected."
        alerts.append(MarineHazardAlert(
            id=hotspot_id,
            source_type="hotspot",
            severity=hs_risk_str,
            title=f"{hs_risk_str} HOTSPOT: Critical Marine Debris Field",
            debris_class="debris_field",
            debris_label=f"Marine Pollution Hotspot ({hs.debris_count} items)",
            material="Mixed Marine Debris & Synthetics",
            marine_life_hazard=f"Concentrated debris zone endangering local marine fauna. {notes}",
            removal_strategy="Priority Ecological Intervention: Dispatch cleanup vessel and environmental response team to contain and extract debris field.",
            survey_id=srv.id,
            survey_title=srv.title,
            location_name=srv.location_name,
            latitude=hs.latitude or srv.latitude,
            longitude=hs.longitude or srv.longitude,
            depth_m=srv.depth_m,
            confidence=0.92,
            image_id=None,
            detected_at=hs.created_at.isoformat() if hs.created_at else datetime.utcnow().isoformat(),
        ))

    # Sort alerts: CRITICAL first, then newest
    alerts.sort(
        key=lambda a: (0 if a.severity == "CRITICAL" else 1, a.detected_at),
        reverse=False,
    )

    critical_count = sum(1 for a in alerts if a.severity == "CRITICAL")
    high_count = sum(1 for a in alerts if a.severity == "HIGH")

    return MarineHazardResponse(
        total_hazards=len(alerts),
        critical_count=critical_count,
        high_count=high_count,
        hazards=alerts[:25],  # Top 25 most urgent alerts
        generated_at=datetime.utcnow().isoformat(),
    )
