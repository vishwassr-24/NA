@echo off
title NEXUS AQUA - FastAPI Backend Server
echo ========================================================
echo        NEXUS AQUA - Starting FastAPI Backend Server
echo ========================================================
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
    echo Initializing virtual environment (.venv)...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
)

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
