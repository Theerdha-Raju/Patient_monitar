path = r'C:\covid_patient\esp32_firmware\covid_patient_monitor\covid_patient_monitor.ino'
with open(path, 'rb') as f:
    content = f.read()

old = (
    b'    if (!max30102Detected) {\r\n'
    b'      Serial.println("|  [!] SENSOR HARDWARE NOT DETECTED ON I2C!       |");\r\n'
    b'      Serial.println("|  Check: VIN(5V), GND, SDA(D21), SCL(D22)       |");\r\n'
    b'    } else if (fingerDetected) {'
)

new = (
    b'    if (!max30102Detected) {\r\n'
    b'      Serial.println("|                                                  |");\r\n'
    b'      Serial.printf( "|  PULSE RATE  : %5.1f BPM    [SIMULATOR MODE]   |\\n", simHeartRate);\r\n'
    b'      Serial.printf( "|  SpO2        : %5.1f %%      [SIMULATOR MODE]   |\\n", simSpO2);\r\n'
    b'      Serial.printf( "|  Temperature : %5.2f C      [SIMULATOR MODE]   |\\n", simTemp);\r\n'
    b'      Serial.println("|                                                  |");\r\n'
    b'      Serial.println("|  [!] MAX30102 not detected - Simulator active    |");\r\n'
    b'      Serial.println("|  Wire: VIN->5V GND->GND SDA->D21 SCL->D22      |");\r\n'
    b'    } else if (fingerDetected) {'
)

if old in content:
    content = content.replace(old, new)
    with open(path, 'wb') as f:
        f.write(content)
    print('SUCCESS: Firmware patched - pulse rate will now display in Serial Monitor')
else:
    print('Pattern NOT found. Dumping lines 264-270:')
    lines = content.split(b'\r\n')
    for i, line in enumerate(lines[263:272], start=264):
        print(f'  Line {i}: {repr(line)}')
