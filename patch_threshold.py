path = r'C:\covid_patient\esp32_firmware\covid_patient_monitor\covid_patient_monitor.ino'
with open(path, 'rb') as f:
    content = f.read()

# Change threshold from 15000 to 7000 for better sensitivity
content = content.replace(b'if (irValue > 15000)', b'if (irValue > 7000)')
content = content.replace(b'(need > 15000)', b'(need > 7000)')
content = content.replace(b'< 15000)', b'< 7000)')

with open(path, 'wb') as f:
    f.write(content)

print("SUCCESS: Finger detection threshold optimized to 7000")
