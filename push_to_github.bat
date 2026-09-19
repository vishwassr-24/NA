@echo off
title Push Nexus Aqua to GitHub (vishwassr-24/MARINE)
color 0b
echo ================================================================
echo       NEXUS AQUA - Pushing Code to GitHub: vishwassr-24/MARINE
echo ================================================================
echo.
cd /d "%~dp0"

git branch -M main
echo Pushing code and AI models to https://github.com/vishwassr-24/MARINE ...
echo.
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Remote repository has existing commits. Syncing with force push...
    git push -u origin main --force
)

echo.
echo ================================================================
if %ERRORLEVEL% EQU 0 (
    echo   [SUCCESS] Code successfully pushed to GitHub!
    echo   Check your repo at: https://github.com/vishwassr-24/MARINE
) else (
    echo   [ERROR] Git push failed. Please check your GitHub login permissions.
)
echo ================================================================
echo.
pause
