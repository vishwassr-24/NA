"""
NEXUS AQUA - Researcher Router
Handles: data access, reports, CSV/PDF export
Accessible by: Researcher + Admin
"""

import csv
import io
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Survey, SonarImage, Detection, ExpertReview, Hotspot
from app.dependencies import researcher_access, get_current_user

router = APIRouter(prefix="/researcher", tags=["Researcher"])


@router.get("/summary")
def get_research_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(researcher_access),
):
    """
    High-level summary statistics for researcher dashboard:
    surveys, images processed, detections, hotspots, reviews.
    """
    from app.models import DetectionStatus, RiskLevel

    total_surveys = db.query(Survey).count()
    total_images = db.query(SonarImage).count()
    processed_images = db.query(SonarImage).filter(SonarImage.processed == True).count()
    total_detections = db.query(Detection).count()
    auto_confirmed = db.query(Detection).filter(Detection.status == DetectionStatus.auto_confirmed).count()
    expert_confirmed = db.query(Detection).filter(Detection.status == DetectionStatus.confirmed).count()
    rejected = db.query(Detection).filter(Detection.status == DetectionStatus.rejected).count()
    total_hotspots = db.query(Hotspot).count()
    critical_hotspots = db.query(Hotspot).filter(Hotspot.risk_level == RiskLevel.critical).count()
    total_reviews = db.query(ExpertReview).count()

    # Average inference latency
    latencies = [
        img.inference_latency_ms
        for img in db.query(SonarImage).filter(SonarImage.inference_latency_ms != None).all()
    ]
    avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0.0
    min_latency = round(min(latencies), 2) if latencies else 0.0
    max_latency = round(max(latencies), 2) if latencies else 0.0

    # Class distribution
    detections = db.query(Detection).all()
    class_dist = {}
    for d in detections:
        class_dist[d.class_name] = class_dist.get(d.class_name, 0) + 1

    return {
        "surveys": {
            "total": total_surveys,
        },
        "images": {
            "total": total_images,
            "processed": processed_images,
        },
        "detections": {
            "total": total_detections,
            "auto_confirmed": auto_confirmed,
            "expert_confirmed": expert_confirmed,
            "rejected": rejected,
            "class_distribution": class_dist,
        },
        "hotspots": {
            "total": total_hotspots,
            "critical": critical_hotspots,
        },
        "expert_reviews": {
            "total": total_reviews,
        },
        "ai_performance": {
            "average_latency_ms": avg_latency,
            "min_latency_ms": min_latency,
            "max_latency_ms": max_latency,
            "total_inferences": processed_images,
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/detections")
def list_all_detections(
    db: Session = Depends(get_db),
    current_user: User = Depends(researcher_access),
):
    """List all confirmed/changed detections with survey context for research analysis."""
    from app.models import DetectionStatus

    detections = (
        db.query(Detection)
        .filter(Detection.status.in_([
            DetectionStatus.confirmed,
            DetectionStatus.changed,
            DetectionStatus.auto_confirmed,
        ]))
        .order_by(Detection.created_at.desc())
        .all()
    )

    results = []
    for d in detections:
        img = db.query(SonarImage).filter(SonarImage.id == d.sonar_image_id).first()
        survey = db.query(Survey).filter(Survey.id == img.survey_id).first() if img else None
        review = db.query(ExpertReview).filter(ExpertReview.detection_id == d.id).first()

        results.append({
            "detection_id": d.id,
            "class_name": d.class_name,
            "confidence": d.confidence,
            "status": d.status.value,
            "risk_level": d.risk_level.value if d.risk_level else None,
            "bbox": {"x1": d.bbox_x1, "y1": d.bbox_y1, "x2": d.bbox_x2, "y2": d.bbox_y2},
            "survey_id": survey.id if survey else None,
            "survey_title": survey.title if survey else None,
            "location_name": survey.location_name if survey else None,
            "latitude": survey.latitude if survey else None,
            "longitude": survey.longitude if survey else None,
            "sonar_image_id": d.sonar_image_id,
            "anomaly_score": img.anomaly_score if img else None,
            "expert_reviewed": review is not None,
            "expert_action": review.action if review else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    return results


@router.get("/export/csv")
def export_detections_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(researcher_access),
):
    """Export all detection data as a CSV file for offline research."""
    from app.models import DetectionStatus

    detections = db.query(Detection).order_by(Detection.created_at.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "detection_id", "class_name", "confidence", "status", "risk_level",
        "bbox_x1", "bbox_y1", "bbox_x2", "bbox_y2",
        "sonar_image_id", "survey_id", "survey_title",
        "location_name", "latitude", "longitude",
        "anomaly_score", "inference_latency_ms",
        "expert_action", "expert_comment", "created_at",
    ])

    for d in detections:
        img = db.query(SonarImage).filter(SonarImage.id == d.sonar_image_id).first()
        survey = db.query(Survey).filter(Survey.id == img.survey_id).first() if img else None
        review = db.query(ExpertReview).filter(ExpertReview.detection_id == d.id).first()

        writer.writerow([
            d.id, d.class_name, d.confidence, d.status.value,
            d.risk_level.value if d.risk_level else "",
            d.bbox_x1, d.bbox_y1, d.bbox_x2, d.bbox_y2,
            d.sonar_image_id,
            survey.id if survey else "",
            survey.title if survey else "",
            survey.location_name if survey else "",
            survey.latitude if survey else "",
            survey.longitude if survey else "",
            img.anomaly_score if img else "",
            img.inference_latency_ms if img else "",
            review.action if review else "",
            review.comment if review else "",
            d.created_at.isoformat() if d.created_at else "",
        ])

    output.seek(0)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=nexus_aqua_detections_{timestamp}.csv"
        },
    )


@router.get("/export/report")
def export_pdf_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(researcher_access),
):
    """
    Generate a PDF summary report of the project's findings.
    Uses ReportLab for PDF generation.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle(
            "Title", parent=styles["Title"],
            textColor=colors.HexColor("#0e7490"),
            fontSize=22, spaceAfter=12,
        )
        story.append(Paragraph("NEXUS AQUA", title_style))
        story.append(Paragraph("AI-Powered Underwater Marine Debris Detection Report", styles["Heading2"]))
        story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
        story.append(Spacer(1, 0.5*cm))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0e7490")))
        story.append(Spacer(1, 0.5*cm))

        # Summary stats
        from app.models import DetectionStatus, RiskLevel as RL
        stats = {
            "Total Surveys": db.query(Survey).count(),
            "Total Sonar Images": db.query(SonarImage).count(),
            "Processed Images": db.query(SonarImage).filter(SonarImage.processed == True).count(),
            "Total Detections": db.query(Detection).count(),
            "Critical Hotspots": db.query(Hotspot).filter(Hotspot.risk_level == RL.critical).count(),
            "Expert Reviews": db.query(ExpertReview).count(),
        }

        story.append(Paragraph("Executive Summary", styles["Heading2"]))
        table_data = [["Metric", "Value"]] + [[k, str(v)] for k, v in stats.items()]
        table = Table(table_data, colWidths=[10*cm, 5*cm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0e7490")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f9ff")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(table)
        story.append(Spacer(1, 0.5*cm))

        # Class distribution
        story.append(Paragraph("Debris Class Distribution", styles["Heading2"]))
        detections = db.query(Detection).all()
        class_dist = {}
        for d in detections:
            class_dist[d.class_name] = class_dist.get(d.class_name, 0) + 1

        if class_dist:
            cd_data = [["Class", "Count"]] + [[k.replace("_", " ").title(), str(v)] for k, v in sorted(class_dist.items(), key=lambda x: -x[1])]
            cd_table = Table(cd_data, colWidths=[10*cm, 5*cm])
            cd_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#155e75")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#ecfeff")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(cd_table)
        else:
            story.append(Paragraph("No detections recorded yet.", styles["Normal"]))

        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph("Hotspot Locations", styles["Heading2"]))
        hotspots = db.query(Hotspot).all()
        if hotspots:
            hs_data = [["ID", "Latitude", "Longitude", "Risk", "Priority", "Status"]]
            for h in hotspots:
                hs_data.append([
                    str(h.id), f"{h.latitude:.4f}", f"{h.longitude:.4f}",
                    h.risk_level.value, h.cleanup_priority.value, h.cleanup_status
                ])
            hs_table = Table(hs_data, colWidths=[1.5*cm, 3*cm, 3*cm, 3*cm, 3*cm, 3*cm])
            hs_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#155e75")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#ecfeff")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("PADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(hs_table)
        else:
            story.append(Paragraph("No hotspots recorded yet.", styles["Normal"]))

        story.append(Spacer(1, 1*cm))
        story.append(Paragraph("© 2024 NEXUS AQUA | Smart India Hackathon Project", styles["Normal"]))

        doc.build(story)
        buffer.seek(0)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=nexus_aqua_report_{timestamp}.pdf"},
        )

    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="ReportLab not installed. Install reportlab to enable PDF export.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
