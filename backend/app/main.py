"""
NEXUS AQUA - FastAPI Application Entry Point
AI-Powered Underwater Marine Debris & Anomaly Detection

Startup sequence:
1. Create all database tables
2. Seed default admin user (if not exists)
3. Load YOLOv8n model (singleton, warm-up)
4. Start server
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models import Base, User, UserRole, UserStatus
from app.auth import hash_password

# Routers
from app.routers import auth, survey, ai, expert, environment, researcher, admin

load_dotenv()

# ─── Logging setup ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("nexus_aqua")

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")


def create_tables():
    """Create all SQLAlchemy tables in the database and ensure columns exist."""
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE detections ADD COLUMN removal_suggestion TEXT"))
            conn.commit()
    except Exception:
        pass
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE detections ADD COLUMN operator_notes TEXT"))
            conn.commit()
    except Exception:
        pass
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE sonar_images ADD COLUMN operator_notes TEXT"))
            conn.commit()
    except Exception:
        pass
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE sonar_images ADD COLUMN review_requested BOOLEAN DEFAULT 0"))
            conn.commit()
    except Exception:
        pass
    logger.info("✅ Database tables created/verified")


def seed_admin_user():
    """
    Ensure at least one admin user exists.
    Creates default demo users for all 5 roles if DB is empty.
    """
    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.role == UserRole.admin).first()
        if existing_admin:
            logger.info(f"Admin user already exists: {existing_admin.user_id}")
            return

        demo_users = [
            {
                "user_id": "admin001",
                "name": "System Administrator",
                "email": "admin@nexusaqua.in",
                "password": "Admin@123456",
                "role": UserRole.admin,
                "status": UserStatus.active,
            },
            {
                "user_id": "operator001",
                "name": "Survey Operator One",
                "email": "operator@nexusaqua.in",
                "password": "Operator@123",
                "role": UserRole.survey_operator,
                "status": UserStatus.active,
            },
            {
                "user_id": "officer001",
                "name": "Environment Officer One",
                "email": "officer@nexusaqua.in",
                "password": "Officer@123",
                "role": UserRole.environment_officer,
                "status": UserStatus.active,
            },
            {
                "user_id": "expert001",
                "name": "Dr. Marine Expert",
                "email": "expert@nexusaqua.in",
                "password": "Expert@123",
                "role": UserRole.marine_expert,
                "status": UserStatus.active,
            },
            {
                "user_id": "researcher001",
                "name": "Research Analyst One",
                "email": "researcher@nexusaqua.in",
                "password": "Researcher@123",
                "role": UserRole.researcher,
                "status": UserStatus.active,
            },
        ]

        for u in demo_users:
            user = User(
                user_id=u["user_id"],
                name=u["name"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
                status=u["status"],
            )
            db.add(user)

        db.commit()
        logger.info("✅ Demo users seeded for all 5 roles")
        logger.info("   Admin     → admin001 / Admin@123456")
        logger.info("   Operator  → operator001 / Operator@123")
        logger.info("   Officer   → officer001 / Officer@123")
        logger.info("   Expert    → expert001 / Expert@123")
        logger.info("   Researcher→ researcher001 / Researcher@123")

    except Exception as e:
        logger.error(f"Failed to seed demo users: {e}")
        db.rollback()
    finally:
        db.close()


def preload_ai_models():
    """Pre-load the YOLO model and preprocessor at startup for fast first inference."""
    try:
        from app.ai.preprocessor import get_preprocessor
        from app.ai.detector import get_detector
        from app.ai.risk_engine import get_risk_engine

        get_preprocessor()
        get_detector()   # This triggers model download + warmup if needed
        get_risk_engine()
        logger.info("✅ AI models pre-loaded and warmed up")
    except Exception as e:
        logger.warning(f"⚠️ AI model pre-loading encountered an issue: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: startup + shutdown."""
    logger.info("🚀 NEXUS AQUA starting up...")
    create_tables()
    seed_admin_user()
    preload_ai_models()
    logger.info("✅ NEXUS AQUA ready — http://localhost:8000")
    yield
    logger.info("🛑 NEXUS AQUA shutting down...")


# ─── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="NEXUS AQUA API",
    description=(
        "AI-Powered Automated Underwater Marine Debris & Anomaly Detection "
        "Using Side-Scan Sonar Imagery — Smart India Hackathon 2024"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# ─── Static files for uploads ─────────────────────────────────────────────────
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(survey.router)
app.include_router(ai.router)
app.include_router(expert.router)
app.include_router(environment.router)
app.include_router(researcher.router)
app.include_router(admin.router)


@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {
        "status": "operational",
        "service": "NEXUS AQUA API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
