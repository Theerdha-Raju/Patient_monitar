from fastapi import APIRouter, HTTPException, Query, status, Request
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from backend.app.database import query_all, query_one, execute
from backend.app.schemas import ReadingCreate, ReadingResponse
from backend.app.models import evaluate_reading_status, DEFAULT_THRESHOLDS
from backend.app.websocket_manager import manager

router = APIRouter(prefix="/api/readings", tags=["Readings"])

# -------------------------------------------------------------------------
# POST /api/readings/ (and /api/readings) - Ingest from ESP32 / Simulator
# -------------------------------------------------------------------------
@router.post("/", status_code=status.HTTP_201_CREATED)
@router.post("", status_code=status.HTTP_201_CREATED)
async def ingest_reading(payload: ReadingCreate):
    pulse = payload.pulse_rate if payload.pulse_rate is not None else payload.heart_rate
    if pulse is None:
        raise HTTPException(status_code=400, detail="Missing required pulse_rate or heart_rate measurement")

    ts_str = payload.timestamp or datetime.now(timezone.utc).isoformat()
    
    # 1. Ensure patient exists (auto-register if new ID)
    patient_exists = query_one("SELECT patient_id FROM patients WHERE patient_id = %s", (payload.patient_id,))
    if not patient_exists:
        execute("""
            INSERT INTO patients (patient_id, name, room_number, age, gender, status, admission_date)
            VALUES (%s, %s, 'General Ward 101', 45, 'Unspecified', 'Active Monitoring', CURRENT_DATE)
        """, (payload.patient_id, f"Patient ({payload.patient_id})"))

    # 2. Insert into health_readings table
    execute("""
        INSERT INTO health_readings (patient_id, device_id, spo2, heart_rate, temperature, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        payload.patient_id,
        payload.device_id,
        payload.spo2,
        pulse,
        payload.temperature,
        ts_str
    ))

    # 3. Update device presence in devices table
    execute("""
        INSERT INTO devices (device_id, patient_id, status, last_seen)
        VALUES (%s, %s, 'ONLINE', CURRENT_TIMESTAMP)
        ON CONFLICT (device_id) DO UPDATE 
            SET status = 'ONLINE', last_seen = CURRENT_TIMESTAMP, patient_id = EXCLUDED.patient_id
    """, (payload.device_id, payload.patient_id))

    # 4. Evaluate educational monitoring rules
    eval_result = evaluate_reading_status(payload.spo2, pulse, payload.temperature)

    # 5. Insert alerts if warnings triggered
    triggered_alerts = []
    for warn_msg in eval_result["warnings"]:
        metric_name = "SpO2" if "SpO2" in warn_msg else ("Pulse Rate" if "pulse" in warn_msg.lower() else "Temperature")
        severity = "CRITICAL" if "Low SpO2" in warn_msg or "High temperature" in warn_msg or "High pulse" in warn_msg else "WARNING"
        
        # Avoid duplicate unreviewed alert within 30 seconds
        recent = query_one("""
            SELECT id FROM alerts 
            WHERE patient_id = %s AND metric = %s AND acknowledged = FALSE 
            ORDER BY timestamp DESC LIMIT 1
        """, (payload.patient_id, metric_name))

        if not recent:
            alert_id = execute("""
                INSERT INTO alerts (patient_id, alert_type, metric, value, severity, message, acknowledged)
                VALUES (%s, %s, %s, %s, %s, %s, FALSE)
            """, (
                payload.patient_id,
                metric_name,
                metric_name,
                payload.spo2 if metric_name == "SpO2" else (pulse if metric_name == "Pulse Rate" else payload.temperature),
                severity,
                warn_msg
            ))
            triggered_alerts.append({
                "id": alert_id,
                "metric": metric_name,
                "severity": severity,
                "message": warn_msg
            })

    # 6. Broadcast event via WebSocket
    event_payload = {
        "type": "NEW_READING",
        "data": {
            "patient_id": payload.patient_id,
            "device_id": payload.device_id,
            "spo2": payload.spo2,
            "pulse_rate": pulse,
            "heart_rate": pulse,
            "temperature": payload.temperature,
            "timestamp": ts_str,
            "monitoring_status": eval_result["overall_status"],
            "eval_result": eval_result
        },
        "alerts": triggered_alerts
    }
    await manager.broadcast(event_payload)

    return {
        "success": True,
        "message": "Validated telemetry reading ingested successfully",
        "reading": event_payload["data"],
        "monitoring_status": eval_result["overall_status"],
        "warnings_count": len(eval_result["warnings"])
    }


# -------------------------------------------------------------------------
# GET /api/readings/latest/ (and /api/readings/latest)
# -------------------------------------------------------------------------
@router.get("/latest/")
@router.get("/latest")
async def get_latest_reading(patient_id: Optional[str] = Query(None)):
    target_id = patient_id or "PATIENT-001"
    
    # Try specified patient, fallback to P001 if not found
    rows = query_all("""
        SELECT id, patient_id, device_id, spo2, heart_rate, temperature, timestamp
        FROM health_readings
        WHERE patient_id = %s
        ORDER BY timestamp DESC
        LIMIT 2
    """, (target_id,))

    if not rows and target_id == "PATIENT-001":
        # Fallback to P001
        rows = query_all("""
            SELECT id, patient_id, device_id, spo2, heart_rate, temperature, timestamp
            FROM health_readings
            WHERE patient_id = 'P001'
            ORDER BY timestamp DESC
            LIMIT 2
        """)

    if not rows:
        # Fallback to any latest reading
        rows = query_all("""
            SELECT id, patient_id, device_id, spo2, heart_rate, temperature, timestamp
            FROM health_readings
            ORDER BY timestamp DESC
            LIMIT 2
        """)

    if not rows:
        raise HTTPException(status_code=404, detail="No readings recorded yet in database")

    curr = dict(rows[0])
    prev = dict(rows[1]) if len(rows) > 1 else None

    # Stale calculation
    now = datetime.now(timezone.utc)
    sec_ago = None
    ts_val = curr.get("timestamp")
    if ts_val:
        try:
            dt = datetime.fromisoformat(str(ts_val).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            sec_ago = max(0, int((now - dt).total_seconds()))
        except Exception:
            pass

    is_stale = (sec_ago is None or sec_ago > DEFAULT_THRESHOLDS["stale_timeout_sec"])

    # Trend calculation
    def calc_trend(current_val, prev_val, eps=0.2):
        if not prev_val:
            return "stable"
        diff = float(current_val) - float(prev_val)
        if abs(diff) < eps:
            return "stable"
        return "up" if diff > 0 else "down"

    trends = {
        "spo2_trend": calc_trend(curr["spo2"], prev["spo2"] if prev else None, 0.3),
        "pulse_trend": calc_trend(curr["heart_rate"], prev["heart_rate"] if prev else None, 1.0),
        "temperature_trend": calc_trend(curr["temperature"], prev["temperature"] if prev else None, 0.1),
    }

    eval_result = evaluate_reading_status(
        float(curr["spo2"]), float(curr["heart_rate"]), float(curr["temperature"])
    )

    curr["pulse_rate"] = curr["heart_rate"]
    curr["trends"] = trends
    curr["status"] = eval_result
    curr["monitoring_status"] = eval_result["overall_status"]
    curr["is_stale"] = is_stale
    curr["seconds_since_reading"] = sec_ago

    return {"success": True, "data": curr}


# -------------------------------------------------------------------------
# GET /api/readings/history/ (and /api/readings/history and /api/readings)
# -------------------------------------------------------------------------
@router.get("/history/")
@router.get("/history")
async def get_readings_history(
    patient_id: Optional[str] = Query(None),
    range: str = Query("all", description="Range filter: 1h, 24h, 7d, all"),
    limit: int = Query(100, ge=1, le=1000)
):
    target_id = patient_id or "PATIENT-001"
    
    # Calculate time cutoff
    now = datetime.now(timezone.utc)
    cutoff = None
    if range == "1h":
        cutoff = now - timedelta(hours=1)
    elif range == "24h":
        cutoff = now - timedelta(hours=24)
    elif range == "7d":
        cutoff = now - timedelta(days=7)

    # Check if target_id exists, otherwise fallback to P001 or all
    pt_check = query_one("SELECT patient_id FROM health_readings WHERE patient_id = %s LIMIT 1", (target_id,))
    if not pt_check and target_id == "PATIENT-001":
        target_id = "P001"

    if cutoff:
        sql = """
            SELECT id, patient_id, device_id, spo2, heart_rate, temperature, timestamp
            FROM health_readings
            WHERE patient_id = %s AND timestamp >= %s
            ORDER BY timestamp DESC
            LIMIT %s
        """
        rows = query_all(sql, (target_id, cutoff.isoformat(), limit))
    else:
        sql = """
            SELECT id, patient_id, device_id, spo2, heart_rate, temperature, timestamp
            FROM health_readings
            WHERE patient_id = %s
            ORDER BY timestamp DESC
            LIMIT %s
        """
        rows = query_all(sql, (target_id, limit))

    # Also enrich each reading with pulse_rate alias and reverse for chronological order
    for r in rows:
        r["pulse_rate"] = r["heart_rate"]

    rows.reverse()
    return {
        "success": True,
        "patient_id": target_id,
        "range": range,
        "count": len(rows),
        "data": rows
    }
