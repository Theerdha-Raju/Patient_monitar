"""
REST API Routes for Quarantine Patient Health Monitoring System
Endpoints conform to project specifications:
  - POST /api/readings/
  - GET  /api/readings/latest/
  - GET  /api/readings/history/
  - GET  /api/patient/
  - GET  /api/alerts/
  - POST /api/alerts/<int:alert_id>/acknowledge/
  - GET  /api/device/
  - GET  /api/health/
  - POST /api/demo/simulate/
"""

import random
from flask import Blueprint, request, jsonify
from backend.models import (
    validate_reading_payload,
    save_reading,
    evaluate_clinical_alerts,
    get_latest_reading,
    get_readings_history,
    get_patient_profile,
    get_active_alerts,
    acknowledge_alert,
    get_device_status,
    THRESHOLDS
)

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/health/", methods=["GET"])
def health_check():
    """Health check endpoint indicating backend and database status."""
    return jsonify({
        "status": "healthy",
        "service": "Quarantine Patient Health Monitor REST Gateway",
        "version": "1.0.0",
        "medical_disclaimer": "Prototype health monitoring device only. Not intended for clinical COVID-19 diagnosis."
    }), 200


@api_bp.route("/readings/", methods=["POST"])
def ingest_reading():
    """
    Receives raw physiological telemetry from ESP8266 or ESP32.
    Validates measurement boundaries, stores in PostgreSQL/SQLite,
    and checks clinical advisory thresholds.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            "success": False,
            "error": "Invalid or missing JSON payload"
        }), 400

    is_valid, sanitized, error_msg = validate_reading_payload(data)
    if not is_valid:
        return jsonify({
            "success": False,
            "error": error_msg
        }), 400

    try:
        # Persist reading
        save_reading(sanitized)

        # Evaluate threshold alerts
        alerts_triggered = evaluate_clinical_alerts(sanitized)

        return jsonify({
            "success": True,
            "message": "Telemetry reading successfully recorded",
            "data": sanitized,
            "alerts_triggered": alerts_triggered
        }), 201

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Database ingestion error: {str(e)}"
        }), 500


@api_bp.route("/readings/latest/", methods=["GET"])
def latest_reading():
    """Returns the latest recorded physiological reading for the active patient."""
    patient_id = request.args.get("patient_id", "P001")
    reading = get_latest_reading(patient_id)
    if not reading:
        return jsonify({
            "success": False,
            "message": f"No telemetry readings found for patient {patient_id}",
            "data": None
        }), 404

    return jsonify({
        "success": True,
        "data": reading,
        "thresholds": THRESHOLDS
    }), 200


@api_bp.route("/readings/history/", methods=["GET"])
def readings_history():
    """Returns historical readings formatted for Chart.js time-series display."""
    patient_id = request.args.get("patient_id", "P001")
    limit = request.args.get("limit", 60)
    time_range = request.args.get("time_range", "all")

    try:
        history = get_readings_history(patient_id, limit=limit, time_range=time_range)
        return jsonify({
            "success": True,
            "patient_id": patient_id,
            "count": len(history),
            "data": history
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@api_bp.route("/patient/", methods=["GET"])
def patient_info():
    """Returns demonstration patient quarantine metadata."""
    patient_id = request.args.get("patient_id", "P001")
    patient = get_patient_profile(patient_id)
    if not patient:
        return jsonify({
            "success": False,
            "message": f"Patient profile not found for {patient_id}"
        }), 404

    return jsonify({
        "success": True,
        "data": patient,
        "notice": "DEMO DATA: Synthetic patient record for MCA project demonstration"
    }), 200


@api_bp.route("/alerts/", methods=["GET"])
def alerts_list():
    """Returns recent clinical alerts."""
    patient_id = request.args.get("patient_id", "P001")
    alerts = get_active_alerts(patient_id)
    return jsonify({
        "success": True,
        "count": len(alerts),
        "data": alerts
    }), 200


@api_bp.route("/alerts/<int:alert_id>/acknowledge/", methods=["POST"])
def ack_alert(alert_id):
    """Allows medical staff to acknowledge an alert."""
    payload = request.get_json(silent=True) or {}
    user = payload.get("user", "Physician on Duty")

    try:
        rows_updated = acknowledge_alert(alert_id, user=user)
        return jsonify({
            "success": True,
            "message": f"Alert {alert_id} acknowledged by {user}",
            "rows_affected": rows_updated
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@api_bp.route("/device/", methods=["GET"])
def device_status():
    """Returns microcontroller and network connectivity state."""
    device_id = request.args.get("device_id", "ESP32_NODE_01")
    status = get_device_status(device_id)
    return jsonify({
        "success": True,
        "data": status
    }), 200


@api_bp.route("/demo/simulate/", methods=["POST"])
def simulate_scenario():
    """
    Built-in simulation trigger for live MCA project demonstrations without physical hardware.
    Scenarios:
      - 'normal': Healthy quarantined patient baseline
      - 'hypoxia': COVID-related silent hypoxia drop (SpO2 88-91%, high HR)
      - 'fever': Hyperpyrexia spike (Temp 38.6-39.2°C)
      - 'tachycardia': Elevated pulse rate (HR 125-135 BPM)
    """
    payload = request.get_json(silent=True) or {}
    scenario = payload.get("scenario", "normal")
    patient_id = payload.get("patient_id", "P001")

    if scenario == "hypoxia":
        temp = round(37.6 + random.uniform(-0.2, 0.3), 2)
        hr = round(112.0 + random.uniform(0, 10), 1)
        spo2 = round(88.5 + random.uniform(0, 3.0), 1)
    elif scenario == "fever":
        temp = round(38.8 + random.uniform(0, 0.6), 2)
        hr = round(105.0 + random.uniform(0, 8), 1)
        spo2 = round(94.5 + random.uniform(-0.5, 1.0), 1)
    elif scenario == "tachycardia":
        temp = round(37.4 + random.uniform(-0.2, 0.3), 2)
        hr = round(128.0 + random.uniform(0, 12), 1)
        spo2 = round(95.0 + random.uniform(0, 2.0), 1)
    else:  # normal
        temp = round(36.7 + random.uniform(-0.3, 0.4), 2)
        hr = round(74.0 + random.uniform(-4, 6), 1)
        spo2 = round(97.8 + random.uniform(-0.5, 1.5), 1)

    reading = {
        "patient_id": patient_id,
        "temperature": temp,
        "heart_rate": hr,
        "spo2": spo2,
        "device_id": "DEMO_SIMULATOR_NODE",
        "is_demo": True
    }

    save_reading(reading)
    alerts = evaluate_clinical_alerts(reading)

    return jsonify({
        "success": True,
        "scenario": scenario,
        "generated_reading": reading,
        "alerts_triggered": alerts
    }), 201
