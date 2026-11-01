# ESP32 Smart Patient Health Monitor - Hardware & Firmware Guide

This directory contains the production-grade Arduino C++ firmware and hardware documentation for interfacing physiological sensors with an **ESP32-WROOM-32** microcontroller.

---

## 1. Hardware Pinout & Wiring Table

| Component | Sensor Pin | ESP32 GPIO / Pin | Function | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **MAX30102** | `VCC` | `3.3V` | Power Supply | 3.3V regulated rail |
| **MAX30102** | `GND` | `GND` | Ground | Common ground |
| **MAX30102** | `SDA` | `GPIO 21` | I2C Data Line | Requires 4.7kΩ pull-up (onboard on breakout) |
| **MAX30102** | `SCL` | `GPIO 22` | I2C Clock Line | Hardware I2C bus default |
| **DS18B20** | `VCC` | `3.3V` | Power Supply | Red wire on waterproof probe |
| **DS18B20** | `GND` | `GND` | Ground | Black wire on waterproof probe |
| **DS18B20** | `DATA (DQ)` | `GPIO 4` | 1-Wire Digital Bus | Yellow wire; attach **4.7kΩ pull-up resistor** between DATA and 3.3V |
| **Piezo Buzzer** | `Positive (+)` | `GPIO 18` | Audio Emergency Siren | Activates upon SpO2 < 90% or Temp > 38.5°C |
| **Piezo Buzzer** | `Negative (-)` | `GND` | Ground | Ground return |
| **Onboard LED** | `Anode` | `GPIO 2` | Telemetry TX Indicator | Blinks on each successful HTTP POST |

---

## 2. Visual Circuit Schematic

Refer to [`circuit_diagram.svg`](./circuit_diagram.svg) for the complete graphical wiring illustration.

---

## 3. Required Arduino IDE Libraries

Before compiling [`covid_patient_monitor.ino`](./covid_patient_monitor.ino), install the following official libraries via **Arduino IDE Library Manager** (`Ctrl+Shift+I`):

1. **`ArduinoJson`** (by *Benoit Blanchon*): JSON serialization and formatting for REST telemetry payloads.
2. **`SparkFun MAX3010x Pulse and Proximity Sensor Library`**: Optical driver for MAX30102 pulse oximeter and heart-rate sensor.
3. **`DallasTemperature`** (by *Miles Burton*): Maxim/Dallas 1-Wire digital thermometer protocol.
4. **`OneWire`** (by *Paul Stoffregen*): Low-level bit-banging communication bus for DS18B20.

---

## 4. Configuration Instructions

Open `covid_patient_monitor.ino` and configure your local Wi-Fi credentials and the IP address of the backend server:

```cpp
// 1. Wi-Fi Configuration
const char* WIFI_SSID     = "Amal Jyothi New";
const char* WIFI_PASSWORD = "amaljyothi";

// 2. Gateway REST API Ingestion Endpoint (FastAPI on Port 5000)
const char* BACKEND_SERVER_URL = "http://192.168.53.76:5000/api/readings/";

// 3. Target Patient ID
const char* PATIENT_ID = "P001"; // Target Bed/Patient (matches Dashboard default)
```

---

## 5. Resilient Hardware Fallback Simulator Feature

The firmware includes an **automatic hardware detection mechanism**:
- Upon startup, the ESP32 scans the I2C bus for the MAX30102 and polls the 1-Wire bus for the DS18B20.
- If physical sensor modules are connected, it reads live biological values.
- If sensors are **not yet plugged in or disconnected**, the firmware safely prints a diagnostic message to the Serial Monitor and switches into **Autonomous Fallback Mode**, generating realistic clinical test vitals and transmitting them over Wi-Fi!
- This ensures examiners and students can verify Wi-Fi connectivity, HTTP POST requests, and database storage even before wiring physical hardware!
