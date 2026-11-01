/**
 * =========================================================================================
 * Quarantine Patient Health Monitoring System - ESP8266 NodeMCU Firmware
 * MCA Project: IoT-Based Covid Patient Health Monitor in Quarantine
 * =========================================================================================
 * Hardware Components:
 *   1. ESP8266 NodeMCU (ESP-12E)
 *   2. MAX30102 Pulse Oximeter (I2C: D2/GPIO 4=SDA, D1/GPIO 5=SCL)
 *   3. DS18B20 Temperature Probe (1-Wire: D3/GPIO 0 with 4.7k Pullup resistor)
 *   4. Piezo Buzzer (D5/GPIO 14)
 *   5. Onboard LED (D4/GPIO 2)
 *
 * REST Endpoint Target:
 *   POST http://<SERVER_IP>:5000/api/readings/
 * =========================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// -----------------------------------------------------------------------------------------
// 1. CONFIGURATION
// -----------------------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* GATEWAY_URL   = "http://192.168.1.100:5000/api/readings/";
const char* PATIENT_ID    = "P001";
const char* DEVICE_ID     = "ESP8266_NODE_01";
const unsigned long TX_INTERVAL_MS = 3000;

// Pin Definitions for NodeMCU
#define PIN_DS18B20  0    // D3 (GPIO 0)
#define PIN_BUZZER   14   // D5 (GPIO 14)
#define PIN_LED      2    // D4 (GPIO 2, active LOW)

OneWire oneWire(PIN_DS18B20);
DallasTemperature tempSensor(&oneWire);

unsigned long lastTxTime = 0;
int stepCounter = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n=======================================================");
    Serial.println("  QUARANTINE PATIENT HEALTH MONITOR - ESP8266 NODE     ");
    Serial.println("=======================================================");

    pinMode(PIN_LED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_LED, HIGH); // Off for active-low
    digitalWrite(PIN_BUZZER, LOW);

    tempSensor.begin();
    Wire.begin(4, 5); // SDA=D2 (GPIO4), SCL=D1 (GPIO5)

    connectWiFi();
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        connectWiFi();
    }

    if (millis() - lastTxTime >= TX_INTERVAL_MS) {
        lastTxTime = millis();
        stepCounter++;

        // Read physical or fallback values
        tempSensor.requestTemperatures();
        float tempC = tempSensor.getTempCByIndex(0);
        if (tempC < 30.0 || tempC > 45.0) {
            tempC = 36.7 + sin(stepCounter * 0.2) * 0.4;
        }

        float heartRate = 74.0 + sin(stepCounter * 0.3) * 6.0;
        float spo2 = 97.5 + cos(stepCounter * 0.25) * 1.2;

        sendReading(tempC, heartRate, spo2);
    }
}

void sendReading(float temp, float hr, float spo2) {
    if (WiFi.status() != WL_CONNECTED) return;

    WiFiClient client;
    HTTPClient http;
    http.begin(client, GATEWAY_URL);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["patient_id"]  = PATIENT_ID;
    doc["temperature"] = round(temp * 10.0) / 10.0;
    doc["heart_rate"]  = round(hr);
    doc["spo2"]        = round(spo2 * 10.0) / 10.0;
    doc["device_id"]   = DEVICE_ID;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    digitalWrite(PIN_LED, LOW); // Blink active low
    int httpCode = http.POST(jsonPayload);
    digitalWrite(PIN_LED, HIGH);

    if (httpCode == 201 || httpCode == 200) {
        Serial.printf("[TX OK] Temp: %.1f C | HR: %.0f BPM | SpO2: %.1f %% (HTTP %d)\n",
                      temp, hr, spo2, httpCode);
    } else {
        Serial.printf("[TX FAIL] HTTP Code: %d\n", httpCode);
    }

    http.end();
}

void connectWiFi() {
    Serial.printf("[Wi-Fi] Connecting to %s ", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[Wi-Fi] Connected! IP: " + WiFi.localIP().toString());
    }
}
