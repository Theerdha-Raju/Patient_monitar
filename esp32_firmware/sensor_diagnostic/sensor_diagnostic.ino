/*
 * MAX30102 Hardware Diagnostic & LED Glow Tester
 * This sketch will scan the I2C bus and turn on the MAX30102 Red LED.
 */
#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

#define SDA_PIN 21
#define SCL_PIN 22

void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println("\n=============================================");
  Serial.println("   MAX30102 HARDWARE DIAGNOSTIC TESTER       ");
  Serial.println("=============================================");

  pinMode(SDA_PIN, INPUT_PULLUP);
  pinMode(SCL_PIN, INPUT_PULLUP);
  Wire.begin(SDA_PIN, SCL_PIN, 100000);

  Serial.printf("Checking Pin Voltages:\n");
  Serial.printf(" - SDA (D21): %s\n", digitalRead(SDA_PIN) ? "HIGH [OK]" : "LOW [FAULT / SHORT TO GND]");
  Serial.printf(" - SCL (D22): %s\n", digitalRead(SCL_PIN) ? "HIGH [OK]" : "LOW [FAULT / SHORT TO GND]");
}

void loop() {
  Serial.println("\n--- Scanning I2C Bus ---");
  byte count = 0;
  bool maxFound = false;

  for (byte i = 1; i < 127; i++) {
    Wire.beginTransmission(i);
    if (Wire.endTransmission() == 0) {
      Serial.printf(" > Found device at I2C address: 0x%02X", i);
      if (i == 0x57) {
        Serial.print("  <-- THIS IS YOUR MAX30102!");
        maxFound = true;
      }
      Serial.println();
      count++;
    }
  }

  if (count == 0) {
    Serial.println("[!] NO I2C DEVICES FOUND!");
    Serial.println("    Possible causes:");
    Serial.println("    1. VCC/VIN is not connected or wrong voltage (Try ESP32 VIN/5V instead of 3.3V)");
    Serial.println("    2. GND is loose");
    Serial.println("    3. SDA (D21) and SCL (D22) are reversed");
  } else if (maxFound) {
    Serial.println("[SUCCESS] MAX30102 detected at 0x57! Attempting to power LED...");
    if (particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
      // Setup sensor with high LED power so it lights up visibly
      particleSensor.setup(0x7F, 1, 2, 400, 411, 4096);
      particleSensor.setPulseAmplitudeRed(0x7F); // Max bright red
      particleSensor.setPulseAmplitudeIR(0x7F);

      Serial.println(">>> RED LED SHOULD NOW BE GLOWING BRIGHTLY! <<<");
      long ir = particleSensor.getIR();
      long red = particleSensor.getRed();
      Serial.printf("Live Optical Reading -> Red: %ld | IR: %ld\n", red, ir);
    } else {
      Serial.println("[!] Communication with MAX30102 chip failed (Part ID mismatch or low voltage).");
    }
  }

  delay(2000);
}
