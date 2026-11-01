from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional, List
from backend.app.database import query_all, query_one
from backend.app.models import evaluate_reading_status, DEFAULT_THRESHOLDS

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("/")
@router.get("")
async def get_patients(search: Optional[str] = Query(None, description="Search by Patient ID or Name")):
    sql = """
        SELECT patient_id, name, room_number, age, gender, status, 
               COALESCE(admission_date, quarantine_start_date) AS admission_date,
               COALESCE(quarantine_start_date, admission_date) AS quarantine_start_date,
               created_at
        FROM patients
    """
    params = ()
    if search:
        sql += " WHERE LOWER(patient_id) LIKE %s OR LOWER(name) LIKE %s"
        pattern = f"%{search.lower()}%"
        params = (pattern, pattern)
    
    sql += " ORDER BY patient_id ASC"
    patients = query_all(sql, params)

    now = datetime.now(timezone.utc)
    
    # Enrich each patient with latest telemetry reading and status
    for p in patients:
        latest = query_one("""
            SELECT id, spo2, heart_rate, temperature, timestamp, device_id
            FROM health_readings
            WHERE patient_id = %s
            ORDER BY timestamp DESC
            LIMIT 1
        """, (p["patient_id"],))

        if latest:
            latest["pulse_rate"] = latest["heart_rate"]
            sec_ago = None
            if latest.get("timestamp"):
                try:
                    dt = datetime.fromisoformat(str(latest["timestamp"]).replace("Z", "+00:00"))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    sec_ago = max(0, int((now - dt).total_seconds()))
                except Exception:
                    pass

            is_stale = (sec_ago is None or sec_ago > DEFAULT_THRESHOLDS["stale_timeout_sec"])
            status_eval = evaluate_reading_status(
                float(latest["spo2"]), float(latest["heart_rate"]), float(latest["temperature"])
            )

            p["latest_reading"] = latest
            p["seconds_since_reading"] = sec_ago
            p["is_stale"] = is_stale
            p["monitoring_status"] = "Stale (No Data)" if is_stale else status_eval["overall_status"]
            p["status_eval"] = status_eval
        else:
            p["latest_reading"] = None
            p["seconds_since_reading"] = None
            p["is_stale"] = True
            p["monitoring_status"] = "No Data Recorded"
            p["status_eval"] = None

    return {"success": True, "count": len(patients), "data": patients}


@router.get("/{patient_id}/")
@router.get("/{patient_id}")
async def get_patient_detail(patient_id: str):
    patient = query_one("""
        SELECT patient_id, name, room_number, age, gender, status, 
               COALESCE(admission_date, quarantine_start_date) AS admission_date,
               COALESCE(quarantine_start_date, admission_date) AS quarantine_start_date,
               created_at
        FROM patients
        WHERE patient_id = %s
    """, (patient_id,))

    if not patient:
        # Fallback check for P001 alias
        if patient_id == "PATIENT-001":
            patient = query_one("SELECT * FROM patients WHERE patient_id = 'P001'")
        if not patient:
            raise HTTPException(status_code=404, detail=f"Patient record '{patient_id}' not found")

    now = datetime.now(timezone.utc)
    
    # Get latest reading
    latest = query_one("""
        SELECT id, spo2, heart_rate, temperature, timestamp, device_id
        FROM health_readings
        WHERE patient_id = %s
        ORDER BY timestamp DESC
        LIMIT 1
    """, (patient["patient_id"],))

    if latest:
        latest["pulse_rate"] = latest["heart_rate"]
        sec_ago = None
        if latest.get("timestamp"):
            try:
                dt = datetime.fromisoformat(str(latest["timestamp"]).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                sec_ago = max(0, int((now - dt).total_seconds()))
            except Exception:
                pass

        is_stale = (sec_ago is None or sec_ago > DEFAULT_THRESHOLDS["stale_timeout_sec"])
        status_eval = evaluate_reading_status(
            float(latest["spo2"]), float(latest["heart_rate"]), float(latest["temperature"])
        )
        patient["latest_reading"] = latest
        patient["seconds_since_reading"] = sec_ago
        patient["is_stale"] = is_stale
        patient["monitoring_status"] = "Stale (No Data)" if is_stale else status_eval["overall_status"]
        patient["status_eval"] = status_eval
    else:
        patient["latest_reading"] = None
        patient["seconds_since_reading"] = None
        patient["is_stale"] = True
        patient["monitoring_status"] = "No Data Recorded"
        patient["status_eval"] = None

    # Get recent 10 readings summary
    recent_readings = query_all("""
        SELECT id, spo2, heart_rate, temperature, timestamp, device_id
        FROM health_readings
        WHERE patient_id = %s
        ORDER BY timestamp DESC
        LIMIT 10
    """, (patient["patient_id"],))
    for r in recent_readings:
        r["pulse_rate"] = r["heart_rate"]

    patient["recent_readings"] = recent_readings

    return {"success": True, "data": patient}
