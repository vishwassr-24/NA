"""
NEXUS AQUA - Risk Engine
Combines YOLO detections + anomaly score + object metadata
to produce a final risk level: LOW / MEDIUM / HIGH / CRITICAL

Also determines:
- Whether the result needs expert review (low confidence)
- Cleanup priority
- Human-readable explanation
"""

from typing import List, Optional
from dataclasses import dataclass
from app.ai.detector import DetectionBox

# ─── Risk scoring weights ─────────────────────────────────────────────────────

# Base risk score by debris class (0.0 – 1.0)
CLASS_RISK_SCORES = {
    "ghost_net":          0.85,   # Critical entanglement risk for marine life
    "fishing_net":        0.85,
    "metal_drum":         0.80,   # Toxic chemical/oil leak risk, collision hazard
    "cargo_container":    0.80,   # Heavy navigation hazard, benthic crushing
    "shipwreck_hull":     0.75,   # Massive structural debris, fuel residue
    "submerged_tire":     0.70,   # Chemical leaching, microplastics, 6PPD-quinone
    "tire":               0.70,
    "subsea_pipe_cable":  0.65,   # Industrial snag hazard, artificial reef disturbance
    "metal_object":       0.65,
    "plastic_waste":      0.60,   # Seabed smothering, ingestion hazard
    "wood_timber":        0.45,   # Navigation hazard, structural wood
    "other_debris":       0.45,
    "plastic_bottle":     0.40,   # High volume microplastic breakdown
    "bottle":             0.35,
    "glass_debris":       0.30,   # Physical cutting hazard
    "unknown_anomaly":    0.55,   # Unclassified anomaly
}

# Risk thresholds
RISK_THRESHOLDS = {
    "CRITICAL": 0.80,
    "HIGH":     0.60,
    "MEDIUM":   0.35,
    "LOW":      0.0,
}

# High-confidence threshold (above this = auto-confirm, below = expert review)
HIGH_CONFIDENCE_THRESHOLD = 0.65


@dataclass
class RiskAssessment:
    risk_level: str              # LOW / MEDIUM / HIGH / CRITICAL
    risk_score: float            # 0.0 – 1.0
    cleanup_priority: str        # low / medium / high / urgent
    needs_expert_review: bool
    explanation: str
    per_detection_risks: List[dict]


class RiskEngine:
    """
    Computes the overall risk level for a sonar image inference result.
    Inputs: list of YOLO detections + anomaly score
    Output: RiskAssessment
    """

    def assess(
        self,
        detections: List[DetectionBox],
        anomaly_score: float,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> RiskAssessment:
        """
        Main risk assessment pipeline:
        1. Score each detection individually
        2. Combine scores (max + weighted average)
        3. Apply anomaly score boost
        4. Determine risk level + expert review flag
        5. Generate explanation
        """
        per_detection_risks = []
        detection_scores = []
        low_confidence_detected = False

        for det in detections:
            base_risk = CLASS_RISK_SCORES.get(det.class_name, 0.45)

            # Confidence-weighted risk
            conf_weight = det.confidence
            weighted_risk = base_risk * (0.5 + 0.5 * conf_weight)  # Confidence scales 50-100% of risk

            # Detect low confidence
            if det.confidence < HIGH_CONFIDENCE_THRESHOLD:
                low_confidence_detected = True

            per_detection_risks.append({
                "class_name": det.class_name,
                "confidence": det.confidence,
                "base_risk": round(base_risk, 3),
                "weighted_risk": round(weighted_risk, 3),
                "bbox": {"x1": det.x1, "y1": det.y1, "x2": det.x2, "y2": det.y2},
            })
            detection_scores.append(weighted_risk)

        # ── Aggregate detection score ─────────────────────────────────────────
        if detection_scores:
            # Dominant risk = max score, tempered by average
            max_score = max(detection_scores)
            avg_score = sum(detection_scores) / len(detection_scores)
            # More detections = higher overall risk
            count_boost = min(len(detection_scores) * 0.05, 0.20)  # Up to +20% for many objects
            detection_aggregate = (0.7 * max_score + 0.3 * avg_score) + count_boost
        else:
            detection_aggregate = 0.0

        # ── Anomaly score contribution ─────────────────────────────────────────
        # Anomaly boosts risk even if no YOLO detections
        if detection_aggregate > 0:
            # Anomaly is secondary when detections exist
            combined_score = 0.75 * detection_aggregate + 0.25 * anomaly_score
        else:
            # Anomaly is primary signal when no detections
            combined_score = anomaly_score * 0.70  # Cap at 70% when YOLO found nothing

        combined_score = float(min(combined_score, 1.0))

        # ── Risk level determination ───────────────────────────────────────────
        risk_level = "LOW"
        for level, threshold in RISK_THRESHOLDS.items():
            if combined_score >= threshold:
                risk_level = level
                break

        # ── Expert review decision ────────────────────────────────────────────
        # Force review if: low confidence OR high anomaly with no confirmable detections
        needs_review = (
            low_confidence_detected or
            (anomaly_score > 0.65 and not detections) or
            (risk_level in ["HIGH", "CRITICAL"] and low_confidence_detected)
        )

        # ── Cleanup priority ──────────────────────────────────────────────────
        cleanup_priority_map = {
            "CRITICAL": "urgent",
            "HIGH":     "high",
            "MEDIUM":   "medium",
            "LOW":      "low",
        }
        cleanup_priority = cleanup_priority_map[risk_level]

        # ── Human-readable explanation ────────────────────────────────────────
        explanation = self._generate_explanation(
            detections, anomaly_score, combined_score, risk_level, needs_review
        )

        return RiskAssessment(
            risk_level=risk_level,
            risk_score=round(combined_score, 4),
            cleanup_priority=cleanup_priority,
            needs_expert_review=needs_review,
            explanation=explanation,
            per_detection_risks=per_detection_risks,
        )

    def _generate_explanation(
        self,
        detections: List[DetectionBox],
        anomaly_score: float,
        combined_score: float,
        risk_level: str,
        needs_review: bool,
    ) -> str:
        """Generate a readable explanation of the risk assessment."""
        parts = []

        if detections:
            classes = [d.class_name.replace("_", " ") for d in detections]
            class_counts = {}
            for c in classes:
                class_counts[c] = class_counts.get(c, 0) + 1
            class_summary = ", ".join(f"{v}x {k}" for k, v in class_counts.items())
            parts.append(f"Detected {len(detections)} debris object(s): {class_summary}.")

            avg_conf = sum(d.confidence for d in detections) / len(detections)
            parts.append(f"Average detection confidence: {avg_conf:.1%}.")
        else:
            parts.append("No specific debris objects identified by object detector.")

        if anomaly_score > 0.65:
            parts.append(
                f"High anomaly score ({anomaly_score:.2f}) detected — unusual sonar texture "
                f"patterns suggest possible unclassified debris or seafloor disturbance."
            )
        elif anomaly_score > 0.35:
            parts.append(f"Moderate anomaly score ({anomaly_score:.2f}) — minor irregularities noted.")
        else:
            parts.append(f"Low anomaly score ({anomaly_score:.2f}) — sonar texture appears normal.")

        parts.append(f"Overall risk score: {combined_score:.2f} → Risk Level: {risk_level}.")

        if needs_review:
            parts.append(
                "⚠️ Flagged for Marine Expert review due to low detection confidence or ambiguous anomaly."
            )
        else:
            parts.append("✅ High-confidence result — auto-confirmed.")

        return " ".join(parts)


# ─── Singleton ────────────────────────────────────────────────────────────────
_risk_engine_instance: Optional[RiskEngine] = None


def get_risk_engine() -> RiskEngine:
    global _risk_engine_instance
    if _risk_engine_instance is None:
        _risk_engine_instance = RiskEngine()
    return _risk_engine_instance
