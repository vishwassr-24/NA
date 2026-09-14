@echo off
title NEXUS AQUA - 1-Click Launch Console
color 0b
echo ================================================================
echo             NEXUS AQUA - Autonomous Marine AI System
echo       AI-Powered Underwater Sonar Debris Detection & Tracking
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Python environment...
python --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in system PATH!
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo Make sure to check "Add python.exe to PATH" during installation.
    pause
    exit /b 1
)

echo [2/4] Initializing Backend Environment...
cd /d "%~dp0backend"
set VENV_OK=0
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" --version >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set VENV_OK=1
        call .venv\Scripts\activate.bat
    )
)

if %VENV_OK% EQU 0 (
    echo Local Python virtual environment needs initialization...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    echo Installing backend dependencies...
    pip install -r requirements.txt
)

echo Starting Backend Server on port 8000...
start "NEXUS AQUA - Backend (FastAPI)" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [3/4] Initializing Frontend Environment...
cd /d "%~dp0frontend"
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Node.js / npm not found in system PATH!
    echo Please install Node.js (v18+) from https://nodejs.org/
    pause
) else (
    if not exist "node_modules\" (
        echo Installing frontend dependencies (npm install)...
        call npm install
    )
    echo Starting Frontend Server on port 5173...
    start "NEXUS AQUA - Frontend (React + Vite)" cmd /k "npm run dev"
)

echo.
echo ================================================================
echo                   SYSTEM LAUNCHED SUCCESSFULLY!
echo ================================================================
echo.
echo   Local Web App URL:     http://localhost:5173
echo   Interactive API Docs:  http://localhost:8000/docs
echo.
echo   DEMO CREDENTIALS FOR JURY EVALUATION:
echo   ---------------------------------------------------------------
echo   Role                 User ID        Password
echo   ---------------------------------------------------------------
echo   1. Survey Operator   operator001    Operator@123
echo   2. Marine Expert     expert001      Expert@123
echo   3. System Admin      admin001       Admin@123456
echo   4. Env. Officer      officer001     Officer@123
echo   5. Researcher        researcher001  Research@123
echo   ---------------------------------------------------------------
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo Servers are running in separate windows. Close those windows to stop servers.
pause
