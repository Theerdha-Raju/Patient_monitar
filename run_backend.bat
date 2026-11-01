@echo off
title COVID Patient Health Monitor - Backend
color 0A
echo =====================================================================
echo          COVID Patient Health Monitor - Backend Gateway
echo =====================================================================
echo.
cd /d "%~dp0"
echo [1/2] Starting FastAPI backend on port 5000...
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 5000 --reload
pause
