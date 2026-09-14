# 🌊 NEXUS AQUA — Jury & Evaluator Guide

Welcome to **NEXUS AQUA**, an enterprise-grade AI-powered side-scan sonar intelligence system designed for autonomous detection, ecological impact assessment, and cleanup remediation of underwater marine debris.

---

## ⚡ Quick Start (1-Click Run)

### Method 1: Automatic 1-Click Launcher (Recommended for Windows)
Simply double-click:
```bat
START_NEXUS_AQUA.bat
```
This launcher will automatically:
1. Validate Python and Node.js environments.
2. Activate or initialize dependencies if needed.
3. Launch the **FastAPI Backend** on port `8000`.
4. Launch the **React + Vite Frontend** on port `5173`.
5. Automatically open `http://localhost:5173` in your default browser.
6. Display demo credentials directly in the console.

---

### Method 2: Manual Start (Command Line)

#### 1. Start Backend
```bash
cd backend
# If first time:
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Run server:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

#### 2. Start Frontend
In a separate terminal window:
```bash
cd frontend
# If first time:
npm install

# Run dev server:
npm run dev
```
- **Frontend App**: `http://localhost:5173`

---

## 👥 Jury Demo Login Credentials

The database comes pre-seeded with test accounts across all 5 operational roles:

| Role | User ID | Password | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| 🚢 **Survey Operator** | `operator001` | `Operator@123` | Sonar upload, AI debris detection, anomaly analysis, submit to expert |
| 🔬 **Marine Expert** | `expert001` | `Expert@123` | Validate AI detections, verify taxonomy, approve or adjust annotations |
| 🛡️ **System Administrator** | `admin001` | `Admin@123456` | User management, audit logs, system telemetry, database health |
| 🌍 **Environment Officer** | `officer001` | `Officer@123` | Geospatial hotspot map (Leaflet), cleanup priority scoring, action logs |
| 📊 **Scientific Researcher** | `researcher001` | `Research@123` | Data analytics, class distributions, CSV export & executive PDF reports |

---

## 🚀 Recommended Evaluation Walkthrough

Follow this 5-step flow to experience the complete end-to-end intelligence pipeline:

### Step 1: Login & Live Clock
1. Open `http://localhost:5173`.
2. Notice the real-time ticking date & clock badge in the header.
3. Sign in as **Survey Operator** (`operator001` / `Operator@123`).
4. Notice the dynamic, polite time-based greeting (e.g., *"Good morning / afternoon / evening, Rajesh Kumar!"*).

### Step 2: Sonar Upload & AI Inference
1. Navigate to **Upload & Analyze** (`/survey/upload`).
2. Upload a sample side-scan sonar image (sample images are available in `backend/dataset_marine_debris` or `backend/uploads`).
3. Click **Analyze Sonar Image**.
4. Observe the AI detection output:
   - **Column 1**: Visual sonar scan with high-contrast bounding boxes & confidence scores.
   - **Column 2**: Exact debris taxonomy (e.g. Ghost Nets, Plastic Containers, Metallic Debris, Tire/Rubber).
   - **Column 3**: Detailed scientific explanation of ecological risk & material hazard.
   - **Column 4**: Actionable marine removal & remediation protocol.
5. Click **Submit to Marine Expert for Confirmation**.

### Step 3: Marine Expert Review & Verification
1. Logout and sign in as **Marine Expert** (`expert001` / `Expert@123`).
2. Open the **Review Queue** (`/expert/queue`).
3. View the submitted survey scan, inspect AI detections, adjust confidence/status, add expert notes, and click **Confirm & Verify**.

### Step 4: Environmental Hotspot Mapping & Cleanup Tracking
1. Logout and sign in as **Environment Officer** (`officer001` / `Officer@123`).
2. Open the **Hotspot Map** (`/environment/map`) to see interactive geospatial clustering of verified debris.
3. Check the **Cleanup Priority** matrix ranked by ecological risk index.

### Step 5: Scientific Analytics & PDF Report Generation
1. Logout and sign in as **Researcher** (`researcher001` / `Research@123`).
2. Explore class distributions and confidence charts (`/researcher/analytics`).
3. Go to **Reports & Export** (`/researcher/reports`) and click **Download PDF Report** to generate an executive report with tables and risk summaries.

---

## 🛠️ Technology Stack

- **Computer Vision & AI**: PyTorch, Ultralytics YOLOv8 (`nexus_debris_v1.pt`), OpenCV, NumPy
- **Backend API**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy ORM, SQLite, Pydantic, ReportLab
- **Frontend Web**: React 18, Vite, TailwindCSS, Lucide Icons, Recharts, Leaflet / React-Leaflet
- **Authentication**: JWT (JSON Web Tokens), PBKDF2/Bcrypt password hashing, Role-Based Access Control (RBAC)

---

© 2026 NEXUS AQUA · Autonomous Marine AI System · All Rights Reserved
