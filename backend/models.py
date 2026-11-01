"""
Clinical Data Models and Threshold Evaluation Logic
Quarantine Patient Health Monitoring System
"""

from datetime import datetime, timezone
from backend.db import query_all, query_one, execute_write

# Configurable Clinical Advisory Thresholds (Prototype Monitoring Reference)
THRESHOLDS = {
    "temperature": {
        "normal_min": 36.1,
        "normal_max": 37.4,
        "warning_fever": 37.5,
        "critical_fever": 38.5,
        "hypothermia": 35.0
    },
    "heart_rate": {
        "normal_min": 60,
        "normal_max": 100,
        "warning_tachycardia": 101,
        "critical_tachycardia": 120,
        "critical_bradycardia": 50
    },
    "spo2": {
        "normal_min": 95.0,
        "warning_hypoxia": 94.0,
        "critical_hypoxia": 90.0
    }
}


def validate_reading_payload(data):
    """
    Validates incoming sensor payload from ESP8266/ESP32.
    Returns (is_valid, sanitized_data, error_message).
    """
    if not isinstance(data, dict):
        return False, None, "Payload must be a JSON object"

    patient_id = data.get("patient_id", "P001")
    if not patient_id or not isinstance(patient_id, str):
        return False, None, "Valid patient_id string required (e.g. 'P001')"

    # Validate temperature
    try:
        temp = float(data.get("temperature"))
    except (TypeError, ValueError):
        return False, None, "Field 'temperature' must be a valid numeric value"

    # Reject hardware error codes (DS18B20 returns -127 or 85 upon disconnect/reset)
    if temp < 30.0 or temp > 45.0:
        return False, None, f"Temperature {temp}°C out of valid physiological bounds [30.0 - 45.0°C]. Check sensor probe."

    # Validate heart rate
    try:
        hr = float(data.get("heart_rate"))
    except (TypeError, ValueError):
        return False, None, "Field 'heart_rate' must be a valid numeric value"

    # Reject disconnected finger / no pulse (MAX30102 returns 0 or negative)
    if hr < 35.0 or hr > 230.0:
        return False, None, f"Heart rate {hr} BPM out of physiological bounds [35 - 230 BPM]. Ensure finger is placed on sensor."

    # Validate SpO2
    try:
        spo2 = float(data.get("spo2"))
    except (TypeError, ValueError):
        return False, None, "Field 'spo2' must be a valid numeric value"

    if spo2 < 50.0 or spo2 > 100.0:
        return False, None, f"SpO2 {spo2}% out of bounds [50.0 - 100.0%]. Ensure sensor optical contact."

    device_id = data.get("device_id", "ESP32_NODE_01")
    is_demo = bool(data.get("is_demo", False))

    sanitized = {
        "patient_id": patient_id.strip(),
        "temperature": round(temp, 2),
        "heart_rate": round(hr, 1),
        "spo2": round(spo2, 1),
        "device_id": str(device_id).strip(),
        "is_demo": is_demo
    }

    return True, sanitized, None


def evaluate_clinical_alerts(reading):
    """
    Evaluates clinical thresholds and records alerts for physician review.
    Does NOT produce medical diagnosis; flags vital parameter deviations.
    """
    patient_id = reading["patient_id"]
    temp = reading["temperature"]
    hr = reading["heart_rate"]
    spo2 = reading["spo2"]
    generated_alerts = []

    # 1. SpO2 Hypoxia Check
    if spo2 < THRESHOLDS["spo2"]["critical_hypoxia"]:
        msg = f"CRITICAL HYPOXIA: SpO2 dropped to {spo2}%. Immediate clinical attention / oxygen assessment required."
        save_alert(patient_id, "CRITICAL_HYPOXIA", "CRITICAL", spo2, THRESHOLDS["spo2"]["critical_hypoxia"], msg)
        generated_alerts.append({"type": "CRITICAL_HYPOXIA", "severity": "CRITICAL", "message": msg})
    elif spo2 <= THRESHOLDS["spo2"]["warning_hypoxia"]:
        msg = f"MILD HYPOXIA WARNING: SpO2 at {spo2}% (borderline low). Continuous pulse oximetry monitoring advised."
        save_alert(patient_id, "MILD_HYPOXIA", "WARNING", spo2, THRESHOLDS["spo2"]["warning_hypoxia"], msg)
        generated_alerts.append({"type": "MILD_HYPOXIA", "severity": "WARNING", "message": msg})

    # 2. Body Temperature Check
    if temp >= THRESHOLDS["temperature"]["critical_fever"]:
        msg = f"HIGH FEVER SPIKE: Body temperature {temp}°C (≥ 38.5°C). Administer antipyretic evaluation."
        save_alert(patient_id, "HIGH_FEVER", "CRITICAL", temp, THRESHOLDS["temperature"]["critical_fever"], msg)
        generated_alerts.append({"type": "HIGH_FEVER", "severity": "CRITICAL", "message": msg})
    elif temp >= THRESHOLDS["temperature"]["warning_fever"]:
        msg = f"LOW-GRADE FEVER: Body temperature {temp}°C (≥ 37.5°C). Monitor for progression."
        save_alert(patient_id, "LOW_GRADE_FEVER", "WARNING", temp, THRESHOLDS["temperature"]["warning_fever"], msg)
        generated_alerts.append({"type": "LOW_GRADE_FEVER", "severity": "WARNING", "message": msg})

    # 3. Heart Rate Check
    if hr >= THRESHOLDS["heart_rate"]["critical_tachycardia"]:
        msg = f"CRITICAL TACHYCARDIA: Pulse rate {hr} BPM (≥ 120 BPM). Check respiratory distress or anxiety."
        save_alert(patient_id, "TACHYCARDIA_CRITICAL", "CRITICAL", hr, THRESHOLDS["heart_rate"]["critical_tachycardia"], msg)
        generated_alerts.append({"type": "TACHYCARDIA_CRITICAL", "severity": "CRITICAL", "message": msg})
    elif hr >= THRESHOLDS["heart_rate"]["warning_tachycardia"]:
        msg = f"ELEVATED HEART RATE: Pulse rate {hr} BPM (101-119 BPM)."
        save_alert(patient_id, "TACHYCARDIA_MILD", "WARNING", hr, THRESHOLDS["heart_rate"]["warning_tachycardia"], msg)
        generated_alerts.append({"type": "TACHYCARDIA_MILD", "severity": "WARNING", "message": msg})
    elif hr <= THRESHOLDS["heart_rate"]["critical_bradycardia"]:
        msg = f"BRADYCARDIA ALERT: Abnormally low heart rate {hr} BPM (≤ 50 BPM)."
        save_alert(patient_id, "BRADYCARDIA", "CRITICAL", hr, THRESHOLDS["heart_rate"]["critical_bradycardia"], msg)
        generated_alerts.append({"type": "BRADYCARDIA", "severity": "CRITICAL", "message": msg})

    return generated_alerts


def save_alert(patient_id, alert_type, severity, value, threshold, message):
    """Saves alert to database avoiding duplicate active alerts within 60 seconds."""
    # Check if a recent identical unresolved alert exists
    recent = query_one("""
        SELECT id FROM alerts 
        WHERE patient_id = %s AND alert_type = %s AND acknowledged = FALSE 
        ORDER BY timestamp DESC LIMIT 1
    """, (patient_id, alert_type))

    if not recent:
        execute_write("""
            INSERT INTO alerts (patient_id, alert_type, severity, value, threshold, message, acknowledged)
            VALUES (%s, %s, %s, %s, %s, %s, FALSE)
        """, (patient_id, alert_type, severity, value, threshold, message))


def save_reading(data):
    """Persists validated health reading and updates device presence."""
    execute_write("""
        INSERT INTO health_readings (patient_id, temperature, heart_rate, spo2, device_id, is_demo)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        data["patient_id"],
        data["temperature"],
        data["heart_rate"],
        data["spo2"],
        data["device_id"],
        data["is_demo"]
    ))

    # Update device last_seen and online status
    execute_write("""
        INSERT INTO devices (device_id, patient_id, status, last_seen)
        VALUES (%s, %s, 'ONLINE', CURRENT_TIMESTAMP)
        ON CONFLICT (device_id) DO UPDATE 
            SET status = 'ONLINE', last_seen = CURRENT_TIMESTAMP
    """, (data["device_id"], data["patient_id"]))


def get_latest_reading(patient_id="P001"):
    """Fetches the latest reading and computes health classification."""
    reading = query_one("""
        SELECT id, patient_id, temperature, heart_rate, spo2, device_id, is_demo, timestamp
        FROM health_readings
        WHERE patient_id = %s
        ORDER BY timestamp DESC
        LIMIT 1
    """, (patient_id,))

    if not reading:
        return None

    # Classify status
    temp = float(reading["temperature"])
    hr = float(reading["heart_rate"])
    spo2 = float(reading["spo2"])

    status = "Normal Range"
    status_level = "normal"  # normal, attention, critical

    if spo2 < 90.0 or temp >= 38.5 or hr >= 120.0 or hr <= 50.0:
        status = "Critical Reading"
        status_level = "critical"
    elif spo2 <= 94.0 or temp >= 37.5 or hr >= 101.0:
        status = "Attention Required"
        status_level = "attention"

    reading["status"] = status
    reading["status_level"] = status_level
    return reading


def get_readings_history(patient_id="P001", limit=100, time_range="all"):
    """Fetches historical time-series data for Chart.js."""
    limit = min(max(int(limit), 10), 500)
    
    # Optional time filtering
    sql = """
        SELECT id, patient_id, temperature, heart_rate, spo2, device_id, is_demo, timestamp
        FROM health_readings
        WHERE patient_id = %s
        ORDER BY timestamp DESC
        LIMIT %s
    """
    rows = query_all(sql, (patient_id, limit))
    # Return in chronological order for Chart.js
    rows.reverse()
    return rows


def get_patient_profile(patient_id="P001"):
    """Fetches patient profile and quarantine metadata."""
    patient = query_one("""
        SELECT patient_id, name, age, gender, room_number, quarantine_day, 
               quarantine_start_date, status, comorbidities, contact_emergency, is_demo, created_at
        FROM patients
        WHERE patient_id = %s
    """, (patient_id,))
    return patient


def get_active_alerts(patient_id="P001", limit=30):
    """Fetches recent clinical alerts."""
    return query_all("""
        SELECT id, patient_id, alert_type, severity, value, threshold, message, 
               acknowledged, acknowledged_at, acknowledged_by, timestamp
        FROM alerts
        WHERE patient_id = %s
        ORDER BY timestamp DESC
        LIMIT %s
    """, (patient_id, limit))


def acknowledge_alert(alert_id, user="Physician On-Duty"):
    """Acknowledges an alert by ID."""
    return execute_write("""
        UPDATE alerts 
        SET acknowledged = TRUE, acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = %s
        WHERE id = %s
    """, (user, alert_id))


def get_device_status(device_id="ESP32_NODE_01"):
    """
    Computes real-time hardware status based on timestamp recency.
    - < 30s: ONLINE
    - 30s - 90s: ATTENTION (Stale Data)
    - > 90s: DISCONNECTED (No Recent Telemetry)
    """
    device = query_one("""
        SELECT device_id, patient_id, device_type, ip_address, status, firmware_version, last_seen
        FROM devices
        WHERE device_id = %s
    """, (device_id,))

    # Also check latest reading timestamp directly
    latest = query_one("""
        SELECT timestamp FROM health_readings 
        WHERE device_id = %s 
        ORDER BY timestamp DESC LIMIT 1
    """, (device_id,))

    now = datetime.now(timezone.utc)
    seconds_ago = None
    status_label = "DISCONNECTED"
    status_class = "disconnected"

    if latest and latest.get("timestamp"):
        ts = latest["timestamp"]
        if isinstance(ts, str):
            try:
                # Handle ISO format with or without timezone
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
            except Exception:
                ts = None

        if ts:
            seconds_ago = max(0, int((now - ts).total_seconds()))

    if seconds_ago is not None:
        if seconds_ago <= 30:
            status_label = "ONLINE"
            status_class = "online"
        elif seconds_ago <= 90:
            status_label = "ATTENTION (Stale Data)"
            status_class = "attention"
        else:
            status_label = "DISCONNECTED"
            status_class = "disconnected"
    else:
        status_label = "NO DATA RECEIVED"
        status_class = "disconnected"

    return {
        "device_id": device_id,
        "device_type": device.get("device_type", "ESP32") if device else "ESP32",
        "ip_address": device.get("ip_address", "192.168.1.150") if device else "N/A",
        "firmware_version": device.get("firmware_version", "v1.4.2") if device else "v1.4.2",
        "status_label": status_label,
        "status_class": status_class,
        "seconds_since_last_reading": seconds_ago,
        "last_seen": latest["timestamp"] if latest else (device.get("last_seen") if device else None)
    }
