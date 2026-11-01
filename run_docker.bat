@echo off
title COVID Patient Health Monitor - Docker Launcher
color 0B
echo =======================================================================
echo     COVID-19 PATIENT HEALTH MONITOR - DOCKER CONTAINER DEPLOYMENT
echo =======================================================================
echo.
echo [1/3] Checking Docker Desktop status...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Docker Desktop is not running!
    echo     Please open "Docker Desktop" from your Start Menu first, then run this file again.
    echo.
    pause
    exit /b 1
)

echo [2/3] Building and starting all services (PostgreSQL, Backend, Frontend)...
docker compose up --build -d

echo.
echo [3/3] Deployment complete! Containers running:
docker compose ps
echo.
echo =======================================================================
echo Access URLs:
echo  - Real-time React Dashboard : http://localhost:3000
echo  - Hospital Central Gateway  : http://localhost:5000
echo  - PostgreSQL Database       : localhost:5432 (covid_monitor_db)
echo =======================================================================
pause
