@echo off
title COVID Patient Health Monitor - Backend Gateway
color 0A
echo =====================================================================
echo          COVID Patient Health Monitor - Backend Gateway
echo =====================================================================
echo.
cd /d "%~dp0backend"
echo Starting Node.js Backend Gateway on port 5000...
node server.js
pause
