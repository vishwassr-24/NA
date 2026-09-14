@echo off
title NEXUS AQUA - Public Cloudflare Tunnel
echo ========================================================
echo        NEXUS AQUA - Creating Free Public Share Link
echo ========================================================
echo.
echo Tunneling Frontend (Port 5173) + Backend (/api) to the Internet...
echo.
"%~dp0cloudflared.exe" tunnel --url http://localhost:5173
pause
