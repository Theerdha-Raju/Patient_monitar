"""
Models and Clinical Monitoring Rule Engine
Note: This system provides academic demonstration threshold warnings only.
It does NOT perform clinical medical diagnoses or disease classification.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone

# Demonstration Thresholds
DEFAULT_THRESHOLDS = {
    "spo2_normal_min": 95.0,
    "spo2_warning_min": 92.0,
    "pulse_normal_min": 60.0,
    "pulse_normal_max": 100.0,
    "pulse_warning_max": 120.0,
    "temp_normal_min": 36.1,
    "temp_normal_max": 37.2,
    "temp_warning_max": 38.0,
    "stale_timeout_sec": 30
}

def evaluate_reading_status(spo2: float, pulse: float, temp: float) -> Dict[str, Any]:
    """
    Evaluates readings against configured educational demonstration thresholds.
    Clearly distinguishes monitoring warnings from medical diagnoses.
    """
    warnings: List[str] = []
    sensor_errors: List[str] = []
    
    # 1. Sensor validity check
    if spo2 < 50.0 or spo2 > 100.0:
        sensor_errors.append("MAX30102 sensor optical range error: SpO2 reading out of valid physiological limits")
    if pulse < 35.0 or pulse > 230.0:
        sensor_errors.append("Pulse sensor artifact: rate out of valid range")
    if temp < 30.0 or temp > 45.0:
        sensor_errors.append("DS18B20 1-Wire probe disconnected or out of biological range")
    
    # 2. Demonstration Threshold Warnings
    spo2_status = "Normal"
    if spo2 >= DEFAULT_THRESHOLDS["spo2_normal_min"]:
        spo2_status = "Normal"
    elif spo2 >= DEFAULT_THRESHOLDS["spo2_warning_min"]:
        spo2_status = "Attention"
        warnings.append(f"SpO2 observation warning: {spo2:.1f}% is below target normal range (>= 95%)")
    else:
        spo2_status = "Warning"
        warnings.append(f"Low SpO2 alert: {spo2:.1f}% breaches demonstration safety threshold (< 92%)")

    pulse_status = "Normal"
    if DEFAULT_THRESHOLDS["pulse_normal_min"] <= pulse <= DEFAULT_THRESHOLDS["pulse_normal_max"]:
        pulse_status = "Normal"
    elif pulse < DEFAULT_THRESHOLDS["pulse_normal_min"]:
        pulse_status = "Attention"
        warnings.append(f"Pulse rate observation: {pulse:.0f} BPM is below standard resting target (60 BPM)")
    elif pulse <= DEFAULT_THRESHOLDS["pulse_warning_max"]:
        pulse_status = "Attention"
        warnings.append(f"Elevated pulse rate: {pulse:.0f} BPM exceeds resting target range (100 BPM)")
    else:
        pulse_status = "Warning"
        warnings.append(f"High pulse rate alert: {pulse:.0f} BPM exceeds demonstration threshold (> 120 BPM)")

    temp_status = "Normal"
    if DEFAULT_THRESHOLDS["temp_normal_min"] <= temp <= DEFAULT_THRESHOLDS["temp_normal_max"]:
        temp_status = "Normal"
    elif DEFAULT_THRESHOLDS["temp_normal_max"] < temp <= DEFAULT_THRESHOLDS["temp_warning_max"]:
        temp_status = "Attention"
        warnings.append(f"Elevated body temperature observation: {temp:.2f}°C is above typical normal range (37.2°C)")
    elif temp > DEFAULT_THRESHOLDS["temp_warning_max"]:
        temp_status = "Warning"
        warnings.append(f"High temperature alert: {temp:.2f}°C exceeds demonstration fever threshold (> 38.0°C)")
    else:
        temp_status = "Attention"
        warnings.append(f"Subnormal body temperature observation: {temp:.2f}°C (< 36.1°C)")

    # Overall monitoring status
    if sensor_errors:
        overall = "Sensor Error"
    elif "Warning" in (spo2_status, pulse_status, temp_status):
        overall = "Threshold Warning"
    elif "Attention" in (spo2_status, pulse_status, temp_status):
        overall = "Attention Required"
    else:
        overall = "Normal Range"

    return {
        "overall_status": overall,
        "spo2_status": spo2_status,
        "pulse_status": pulse_status,
        "temperature_status": temp_status,
        "warnings": warnings,
        "sensor_errors": sensor_errors
    }
