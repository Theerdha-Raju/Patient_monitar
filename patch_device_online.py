with open(r'C:\covid_patient\backend\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update POST /api/telemetry to keep devices table synced
old_telemetry_insert = """    // Evaluate clinical thresholds for alerts
    const alerts = await evaluateClinicalAlerts(savedRecord);"""

new_telemetry_insert = """    // Keep devices table synced with active telemetry
    db.query(`
      INSERT INTO devices (device_id, patient_id, status, last_seen)
      VALUES ($1, $2, 'ONLINE', NOW())
      ON CONFLICT (device_id) DO UPDATE SET
        patient_id = EXCLUDED.patient_id,
        status = 'ONLINE',
        last_seen = NOW();
    `, [device_id || 'ESP32-001', patient_id]).catch(() => {});

    // Evaluate clinical thresholds for alerts
    const alerts = await evaluateClinicalAlerts(savedRecord);"""

if old_telemetry_insert in content:
    content = content.replace(old_telemetry_insert, new_telemetry_insert)
    print("PATCHED POST /api/telemetry device sync")
else:
    print("FAILED to find old_telemetry_insert")

# 2. Update GET /api/devices to return is_online and fresh last_seen
old_get_devices = """app.get(['/api/devices', '/api/devices/'], async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        d.*,
        p.name AS patient_name,
        p.room_number,
        t.heart_rate, t.spo2, t.temperature, t.battery_level,
        t.timestamp AS last_reading_at,
        EXTRACT(EPOCH FROM (NOW() - d.last_seen)) AS seconds_since_seen
      FROM devices d
      LEFT JOIN patients p ON d.patient_id = p.patient_id
      LEFT JOIN LATERAL (
        SELECT heart_rate, spo2, temperature, battery_level, timestamp
        FROM telemetry WHERE patient_id = d.patient_id ORDER BY timestamp DESC LIMIT 1
      ) t ON true
      ORDER BY d.last_seen DESC;
    `);
    res.json({ success: true, data: rows });"""

new_get_devices = """app.get(['/api/devices', '/api/devices/'], async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        d.device_id,
        d.patient_id,
        d.device_type,
        d.ip_address,
        d.firmware_version,
        CASE 
          WHEN t.timestamp >= NOW() - INTERVAL '45 seconds' THEN 'ONLINE'
          WHEN d.last_seen >= NOW() - INTERVAL '45 seconds' THEN 'ONLINE'
          ELSE 'OFFLINE'
        END AS status,
        CASE 
          WHEN t.timestamp >= NOW() - INTERVAL '45 seconds' THEN true
          WHEN d.last_seen >= NOW() - INTERVAL '45 seconds' THEN true
          ELSE false
        END AS is_online,
        COALESCE(t.timestamp, d.last_seen) AS last_seen,
        p.name AS patient_name,
        p.room_number,
        t.heart_rate, t.spo2, t.temperature, t.battery_level,
        t.timestamp AS last_reading_at,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(t.timestamp, d.last_seen))) AS seconds_since_seen
      FROM devices d
      LEFT JOIN patients p ON d.patient_id = p.patient_id
      LEFT JOIN LATERAL (
        SELECT heart_rate, spo2, temperature, battery_level, timestamp
        FROM telemetry WHERE patient_id = d.patient_id ORDER BY timestamp DESC LIMIT 1
      ) t ON true
      ORDER BY d.device_id ASC;
    `);
    res.json({ success: true, data: rows });"""

if old_get_devices in content:
    content = content.replace(old_get_devices, new_get_devices)
    print("PATCHED GET /api/devices")
else:
    print("FAILED to find old_get_devices")

with open(r'C:\covid_patient\backend\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated backend/server.js")
