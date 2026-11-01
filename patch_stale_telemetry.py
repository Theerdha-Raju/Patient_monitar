with open(r'C:\covid_patient\backend\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_res = """    if (rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No telemetry data found for patient' });
    }

    res.json({ success: true, data: rows[0] });"""

new_res = """    if (rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No telemetry data found for patient' });
    }

    const reading = { ...rows[0] };
    const diffSec = Math.max(0, Math.round((Date.now() - new Date(reading.timestamp).getTime()) / 1000));
    reading.seconds_since_reading = diffSec;
    reading.is_stale = diffSec > 15; // stale if no data within 15 seconds
    res.json({ success: true, data: reading });"""

if old_res in content:
    content = content.replace(old_res, new_res)
    print("PATCHED GET /api/telemetry/latest with seconds_since_reading & is_stale")
else:
    print("FAILED to find old_res")

with open(r'C:\covid_patient\backend\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated server.js")
