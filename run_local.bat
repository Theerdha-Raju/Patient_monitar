@echo off
title COVID Patient Health Monitor - Full Stack Launcher
color 0B
echo =======================================================================
echo          COVID-19 PATIENT HEALTH MONITOR - LOCAL LAUNCHER
echo =======================================================================
echo.
echo [1/2] Starting FastAPI Backend on Port 5000 in background window...
start "COVID Backend (FastAPI)" cmd /k "cd /d %~dp0 && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 5000 --reload"

echo [2/2] Starting React + Vite Dashboard on Port 3000...
cd /d "%~dp0frontend"
npm run dev
