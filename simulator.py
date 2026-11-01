"""
ESP32 IoT Telemetry Hardware Simulator
Simulates continuous streaming from ESP32 Dev Module (MAX30102 + DS18B20)
Target: POST /api/readings
"""

import sys
import time
import math
import random
from datetime import datetime, timezone
import requests

API_ENDPOINT = "http://localhost:5000/api/readings"
PATIENT_ID = "P001"
DEVICE_ID = "esp32-01"
INTERVAL_SEC = 2.0

# Parse CLI arguments
scenario = "normal"
if "--scenario" in sys.argv:
    idx = sys.argv.index("--scenario")
    if idx + 1 < len(sys.argv):
        scenario = sys.argv[idx + 1]

if "--patient" in sys.argv:
    idx = sys.argv.index("--patient")
    if idx + 1 < len(sys.argv):
        PATIENT_ID = sys.argv[idx + 1]

if "--device" in sys.argv:
    idx = sys.argv.index("--device")
    if idx + 1 < len(sys.argv):
        DEVICE_ID = sys.argv[idx + 1]
else:
    # Auto-map P001 -> esp32-01, P002 -> esp32-02, etc.
    if PATIENT_ID.startswith("P00"):
        DEVICE_ID = f"esp32-0{PATIENT_ID[-1]}"

if "--interval" in sys.argv:
    idx = sys.argv.index("--interval")
    if idx + 1 < len(sys.argv):
        INTERVAL_SEC = float(sys.argv[idx + 1])

print("=======================================================================")
print("  COVID QUARANTINE HEALTH MONITOR - IoT TELEMETRY HARDWARE SIMULATOR   ")
print(f"  Target Gateway:  {API_ENDPOINT}                                      ")
print(f"  Patient ID:      {PATIENT_ID}                                        ")
print(f"  Device ID:       {DEVICE_ID}                                         ")
print(f"  Active Scenario: {scenario.upper()}                                  ")
print(f"  Transmission:    Every {INTERVAL_SEC:.1f} seconds (ESP32 cycle)      ")
print("=======================================================================\n")

step = 0
packet_num = 0

try:
    while True:
        packet_num += 1
        step += 1

        # Calculate physiological parameters based on scenario
        if scenario == "hypoxia":
            # Silent hypoxia event (<92% SpO2)
            spo2 = round(max(86.0, 90.5 + math.sin(step * 0.25) * 3.5 + (random.random() - 0.5)), 1)
            hr = round(105.0 + (100.0 - spo2) * 1.6 + math.sin(step * 0.3) * 4.0)
            temp = round(37.5 + math.cos(step * 0.15) * 0.3, 2)
        elif scenario == "fever":
            # Hyperpyrexia (>38.0°C)
            temp = round(38.8 + math.sin(step * 0.2) * 0.45, 2)
            hr = round(108.0 + math.cos(step * 0.3) * 6.0)
            spo2 = round(94.2 + (random.random() - 0.5) * 1.0, 1)
        elif scenario == "tachycardia":
            # Cardiac tachycardia (>120 BPM)
            hr = round(128.0 + math.sin(step * 0.3) * 12.0)
            temp = round(37.3 + (random.random() - 0.5) * 0.2, 2)
            spo2 = round(95.5 + (random.random() - 0.5) * 1.5, 1)
        else:
            # Normal baseline (SpO2 >= 95, HR 60-100, Temp 36.1-37.2)
            temp = round(36.7 + math.sin(step * 0.18) * 0.35, 2)
            hr = round(74.0 + math.sin(step * 0.25) * 6.0)
            spo2 = round(min(100.0, 97.6 + math.cos(step * 0.2) * 1.2), 1)

        payload = {
            "patient_id": PATIENT_ID,
            "device_id": DEVICE_ID,
            "spo2": spo2,
            "heart_rate": hr,
            "temperature": temp,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        try:
            resp = requests.post(API_ENDPOINT, json=payload, timeout=3.0)
            if resp.status_code == 201:
                data = resp.json()
                alerts_count = data.get("alerts_triggered", 0)
                alert_flag = f"[ALERT - {alerts_count} TRIGGERED]" if alerts_count > 0 else "[NORMAL - OK]"
                print(f"[TX #{packet_num:04d}] {payload['timestamp'][11:19]} | SpO2: {spo2:4.1f}% | HR: {hr:3.0f} BPM | Temp: {temp:4.2f}°C -> HTTP 201 {alert_flag}", flush=True)
            else:
                print(f"[TX #{packet_num:04d}] HTTP {resp.status_code}: {resp.text}", flush=True)
        except Exception as e:
            print(f"[TX #{packet_num:04d} ERROR] Could not reach gateway at {API_ENDPOINT}: {e}", flush=True)

        time.sleep(INTERVAL_SEC)

except KeyboardInterrupt:
    print("\n[Simulator Stopped by User]")
