"""
Smart Health Monitoring System - FastAPI REST Gateway & WebSocket Hub
IoT-Based Smart Patient Health Monitoring System
"""

import asyncio
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import API_PORT, API_HOST
from backend.app.database import init_db
from backend.app.websocket_manager import manager
from backend.app.routes import readings, patients, alerts, devices, settings

app = FastAPI(
    title="Smart Health Monitoring System API",
    description=(
        "REST API & WebSocket Gateway for ESP32 physiological sensor telemetry. "
        "Notice: This project is an academic IoT healthcare telemetry demonstration and does NOT perform "
        "clinical medical diagnosis."
    ),
    version="2.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(readings.router)
app.include_router(patients.router)
app.include_router(alerts.router)
app.include_router(devices.router)
app.include_router(settings.router)


@app.on_event("startup")
async def on_startup():
    init_db()


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Smart Health Monitoring System API",
        "documentation": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
@app.get("/api/health/")
async def health_check():
    return {
        "status": "healthy",
        "service": "Smart Health Monitoring System Gateway",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "disclaimer": "Academic health telemetry monitoring prototype. General physiological vitals tracking."
    }


# Backward-compatible alias for /api/telemetry (legacy firmware)
@app.post("/api/telemetry")
async def telemetry_alias(payload: readings.ReadingCreate):
    return await readings.ingest_reading(payload)


# -------------------------------------------------------------------------
# WebSocket Endpoint: WS /ws and WS /ws/readings
# -------------------------------------------------------------------------
@app.websocket("/ws")
@app.websocket("/ws/readings")
async def websocket_readings(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to Smart Health Monitor Real-Time WebSocket",
            "server_time": datetime.now(timezone.utc).isoformat()
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    print(f"Starting Smart Health Monitor Gateway on port {API_PORT}...")
    uvicorn.run("backend.app.main:app", host=API_HOST, port=API_PORT, reload=False)
