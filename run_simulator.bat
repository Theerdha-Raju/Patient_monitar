@echo off
title COVID-19 Telemetry Simulator - ESP32 Multi-Patient Isolation Node
color 0A
echo =======================================================================
echo    ESP32 TELEMETRY SIMULATOR - COVID QUARANTINE ISOLATION WARDS
echo =======================================================================
cd /d "%~dp0"
node simulator.js

pause
