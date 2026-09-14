# 🌊 NEXUS AQUA — AI-Powered Underwater Marine Debris Detection

> Autonomous Side-Scan Sonar Intelligence, Marine Anomaly Recognition & Cleanup Tracking System.

## 🚀 Quick Start for Evaluators & Jury
For complete evaluation steps and credentials, please refer to **[JURY_GUIDE.md](JURY_GUIDE.md)**.

### 1-Click Launch (Windows)
Double-click `START_NEXUS_AQUA.bat` in this folder. It will start both backend & frontend servers and open `http://localhost:5173`.

### Demo Login Credentials
- **Survey Operator**: `operator001` / `Operator@123`
- **Marine Expert**: `expert001` / `Expert@123`
- **Administrator**: `admin001` / `Admin@123456`
- **Environment Officer**: `officer001` / `Officer@123`
- **Researcher**: `researcher001` / `Research@123`

---

## 📁 Repository Structure
```
nexus aqua sih/
├── START_NEXUS_AQUA.bat      # 1-click launcher for evaluators
├── JURY_GUIDE.md             # Complete jury evaluation walkthrough
├── run_backend.bat           # Standalone backend launcher
├── run_frontend.bat          # Standalone frontend launcher
├── backend/
│   ├── app/                  # FastAPI routers, models, schemas, AI service
│   ├── dataset_marine_debris/# Underwater sonar training & test imagery
│   ├── uploads/              # Uploaded scans & AI annotated outputs
│   ├── nexus_debris_v1.pt    # Custom trained YOLOv8 marine debris model weights
│   ├── nexus_aqua.db         # Pre-seeded SQLite database
│   └── requirements.txt      # Python dependencies
└── frontend/
    ├── src/                  # React 18 components, pages, context, styles
    ├── dist/                 # Production-built bundle
    └── package.json          # Node dependencies
```
