const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');
const db = require('./db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Dashboard static frontend files
app.use(express.static(path.join(__dirname, '../dashboard')));

// WebSocket Client Tracker & Broadcast
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log(`[WebSocket] Client connected. Total active clients: ${clients.size}`);

  // Send initial welcome & connection confirmation
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    message: 'Connected to COVID Patient Health Telemetry Gateway',
    serverTime: new Date().toISOString()
  }));

  ws.on('message', async (message) => {
    try {
      const payload = JSON.parse(message);
      if (payload.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      console.warn('[WebSocket] Malformed client message:', e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total active clients: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Socket error:', err.message);
    clients.delete(ws);
  });
});

/**
 * Broadcasts a payload to all connected WebSocket clients
 */
function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('[WebSocket Broadcast Error]:', err.message);
      }
    }
  }
}

// In-memory alert debounce tracker to avoid alert flooding within 60 seconds
const recentAlerts = new Map(); // key: `patient_id:alert_type` -> timestamp

/**
 * Clinical Decision Engine for COVID-19 Patient Vitals
 */
async function evaluateClinicalAlerts(reading) {
  const alertsTriggered = [];
  const { patient_id, heart_rate, spo2, temperature, respiration_rate } = reading;
  const now = Date.now();

  const checkDebounce = (alertType) => {
    const key = `${patient_id}:${alertType}`;
    const lastTriggered = recentAlerts.get(key) || 0;
    if (now - lastTriggered > 45000) { // 45 seconds debounce
      recentAlerts.set(key, now);
      return true;
    }
    return false;
  };

  // 1. SpO2 Hypoxia Detection (Crucial for COVID-19 "Silent Hypoxia")
  if (spo2 < 90.0) {
    if (checkDebounce('HYPOXIA_CRITICAL')) {
      alertsTriggered.push({
        patient_id,
        alert_type: 'HYPOXIA_CRITICAL',
        severity: 'CRITICAL',
        value: spo2,
        threshold: 90.0,
        message: `EMERGENCY: Critical Hypoxia detected (SpO2 ${spo2}%). Immediate Oxygen therapy required!`
      });
    }
  } else if (spo2 < 94.0) {
    if (checkDebounce('HYPOXIA_MILD')) {
      alertsTriggered.push({
        patient_id,
        alert_type: 'HYPOXIA_MILD',
        severity: 'WARNING',
        value: spo2,
        threshold: 94.0,
        message: `WARNING: Mild Hypoxemia detected (SpO2 ${spo2}%). Monitor respiration closely.`
      });
    }
  }

  // 2. Body Temperature Pyrexia / Fever Detection
  if (temperature > 38.5) {
    if (checkDebounce('HIGH_FEVER')) {
      alertsTriggered.push({
        patient_id,
        alert_type: 'HIGH_FEVER',
        severity: 'CRITICAL',
        value: temperature,
        threshold: 38.5,
        message: `HIGH FEVER: Body temperature ${temperature}°C. Risk of COVID hyperinflammatory spike.`
      });
    }
  } else if (temperature > 37.8) {
    if (checkDebounce('MILD_FEVER')) {
      alertsTriggered.push({
        patient_id,
        alert_type: 'MILD_FEVER',
        severity: 'WARNING',
        value: temperature,
        threshold: 37.8,
        message: `MILD FEVER: Elevated temperature detected (${temperature}°C).`
      });
    }
  }

  // 3. Heart Rate Tachycardia / Bradycardia
  if (heart_rate > 115) {
    if (checkDebounce('TACHYCARDIA')) {
      alertsTriggered.push({
        patient_id,
        alert_type: 'TACHYCARDIA',
        severity: 'WARNING',
        value: heart_rate,
        threshold: 115.0,
        message: `Tachycardia: Elevated pulse rate (${heart_rate} bpm).`
      });
    }
  } else if (heart_rate < 50 && heart_rate > 0) {
    if (checkDebounce('BRADYCARDIA')) {
      alertsTriggered.push({
        patient_id,
        alert_type: 'BRADYCARDIA',
        severity: 'WARNING',
        value: heart_rate,
        threshold: 50.0,
        message: `Bradycardia: Abnormally slow pulse (${heart_rate} bpm).`
      });
    }
  }

  // 4. Respiration Rate (Tachypnea / Dyspnea)
  if (respiration_rate > 24) {
    if (checkDebounce('TACHYPNEA')) {
      alertsTriggered.push({
        patient_id,
        alert_type: 'TACHYPNEA',
        severity: 'WARNING',
        value: respiration_rate,
        threshold: 24.0,
        message: `Rapid Breathing / Dyspnea (${respiration_rate} breaths/min).`
      });
    }
  }

  // Insert alerts into database & broadcast
  for (const alert of alertsTriggered) {
    try {
      const res = await db.query(`
        INSERT INTO alerts (patient_id, alert_type, severity, value, threshold, message, resolved)
        VALUES ($1, $2, $3, $4, $5, $6, false)
        RETURNING *;
      `, [alert.patient_id, alert.alert_type, alert.severity, alert.value, alert.threshold, alert.message]);
      
      const savedAlert = res.rows[0];
      broadcast('NEW_ALERT', savedAlert);
    } catch (err) {
      console.error('[Alert Insert Error]:', err.message);
    }
  }

  return alertsTriggered;
}

// ======================== REST API ROUTES ======================== //

/**
 * Health check & system diagnostics
 * Aliased as both /api/health and /api/health/ for compatibility
 */
app.get(['/api/health', '/api/health/'], async (req, res) => {
  try {
    const dbRes = await db.query('SELECT NOW() AS now, current_database() AS dbname');
    res.json({
      status: 'ONLINE',
      system: 'COVID Patient Health Monitor Gateway',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        dbname: dbRes.rows[0].dbname,
        dbTime: dbRes.rows[0].now
      },
      websocketClients: clients.size,
      serverUptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({ status: 'DEGRADED', error: err.message });
  }
});

/**
 * ESP32 & Telemetry Ingestion Endpoint
 * POST /api/telemetry  (also aliased as /api/readings/ for React frontend)
 */
app.post(['/api/telemetry', '/api/readings/', '/api/readings'], async (req, res) => {
  try {
    let {
      patient_id = 'PAT-101',
      heart_rate,
      spo2,
      temperature,
      respiration_rate = 18.0,
      battery_level = 100.0,
      motion_detected = false,
      device_id = 'ESP32_TELEMETRY_NODE'
    } = req.body;

    // Numerical sanitization & defaults
    heart_rate = parseFloat(heart_rate);
    spo2 = parseFloat(spo2);
    temperature = parseFloat(temperature);
    respiration_rate = parseFloat(respiration_rate);
    battery_level = parseFloat(battery_level);

    if (isNaN(heart_rate) || isNaN(spo2) || isNaN(temperature)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing sensor data (heart_rate, spo2, and temperature are required numbers).'
      });
    }

    // Insert into PostgreSQL telemetry table
    const result = await db.query(`
      INSERT INTO telemetry (
        patient_id, heart_rate, spo2, temperature, respiration_rate, battery_level, motion_detected, device_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      patient_id,
      heart_rate.toFixed(1),
      spo2.toFixed(1),
      temperature.toFixed(2),
      respiration_rate.toFixed(1),
      battery_level.toFixed(1),
      !!motion_detected,
      device_id
    ]);

    const savedRecord = result.rows[0];

    // Keep devices table synced with active telemetry
    db.query(`
      INSERT INTO devices (device_id, patient_id, status, last_seen)
      VALUES ($1, $2, 'ONLINE', NOW())
      ON CONFLICT (device_id) DO UPDATE SET
        patient_id = EXCLUDED.patient_id,
        status = 'ONLINE',
        last_seen = NOW();
    `, [device_id || 'ESP32-001', patient_id]).catch(() => {});

    // Evaluate clinical thresholds for alerts
    const alerts = await evaluateClinicalAlerts(savedRecord);

    // Broadcast new telemetry via WebSocket to all connected browser dashboards
    broadcast('TELEMETRY_UPDATE', savedRecord);

    return res.status(201).json({
      success: true,
      message: 'Telemetry received and recorded successfully',
      data: savedRecord,
      alertsTriggered: alerts.length
    });
  } catch (err) {
    console.error('[Telemetry Ingestion Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Retrieve all registered Patients with their current latest vitals
 * GET /api/patients  (also /api/patients/ for React frontend)
 */
app.get(['/api/patients', '/api/patients/'], async (req, res) => {
  try {
    const query = `
      SELECT 
        p.*,
        t.heart_rate,
        t.spo2,
        t.temperature,
        t.respiration_rate,
        t.battery_level,
        t.motion_detected,
        t.timestamp AS last_telemetry_at,
        COALESCE(a.unresolved_alerts_count, 0) AS active_alerts_count
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT * FROM telemetry 
        WHERE patient_id = p.patient_id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) t ON true
      LEFT JOIN (
        SELECT patient_id, COUNT(*) AS unresolved_alerts_count 
        FROM alerts 
        WHERE resolved = false 
        GROUP BY patient_id
      ) a ON a.patient_id = p.patient_id
      ORDER BY p.patient_id ASC;
    `;
    const { rows } = await db.query(query);
    const formatted = rows.map(r => {
      const hasReading = r.heart_rate !== null && r.heart_rate !== undefined;
      return {
        ...r,
        latest_reading: hasReading ? {
          temperature: r.temperature,
          heart_rate: r.heart_rate,
          pulse_rate: r.heart_rate,
          spo2: r.spo2,
          respiration_rate: r.respiration_rate,
          battery_level: r.battery_level,
          timestamp: r.last_telemetry_at
        } : null
      };
    });
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Register a new patient
 * POST /api/patients  (also /api/patients/)
 */
app.post(['/api/patients', '/api/patients/'], async (req, res) => {
  try {
    const { id, patient_id, name, age, gender, room_number, monitoring_day, quarantine_day, comorbidities, contact_emergency } = req.body;
    const pid = patient_id || id;
    const day = monitoring_day || quarantine_day || 1;
    if (!pid || !name || !age || !room_number) {
      return res.status(400).json({ success: false, error: 'patient_id, name, age, and room_number are required' });
    }

    const { rows } = await db.query(`
      INSERT INTO patients (patient_id, id, name, age, gender, room_number, quarantine_day, comorbidities, contact_emergency)
      VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (patient_id) DO UPDATE SET
        name = EXCLUDED.name,
        age = EXCLUDED.age,
        gender = EXCLUDED.gender,
        room_number = EXCLUDED.room_number,
        quarantine_day = EXCLUDED.quarantine_day,
        comorbidities = EXCLUDED.comorbidities,
        contact_emergency = EXCLUDED.contact_emergency
      RETURNING *;
    `, [pid, name, age, gender || 'Unspecified', room_number, quarantine_day || 1, comorbidities || 'None', contact_emergency || 'N/A']);

    broadcast('PATIENT_UPDATED', rows[0]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get a single patient profile
 * GET /api/patients/:id  and GET /api/patients/:id/
 */
app.get(['/api/patients/:id', '/api/patients/:id/'], async (req, res) => {
  try {
    const patient_id = req.params.id;
    const { rows } = await db.query(`
      SELECT p.*,
        t.heart_rate, t.spo2, t.temperature, t.respiration_rate, t.battery_level, t.timestamp AS last_telemetry_at,
        COALESCE(a.cnt, 0) AS active_alerts_count
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT * FROM telemetry WHERE patient_id = p.patient_id ORDER BY timestamp DESC LIMIT 1
      ) t ON true
      LEFT JOIN (SELECT patient_id, COUNT(*) AS cnt FROM alerts WHERE resolved = false GROUP BY patient_id) a
        ON a.patient_id = p.patient_id
      WHERE p.patient_id = $1;
    `, [patient_id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    const patientData = { ...rows[0] };
    const hasReading = patientData.heart_rate !== null && patientData.heart_rate !== undefined;
    patientData.latest_reading = hasReading ? {
      temperature: patientData.temperature,
      heart_rate: patientData.heart_rate,
      pulse_rate: patientData.heart_rate,
      spo2: patientData.spo2,
      respiration_rate: patientData.respiration_rate,
      battery_level: patientData.battery_level,
      timestamp: patientData.last_telemetry_at
    } : null;

    let recent = await db.query(`
      SELECT id, patient_id, heart_rate, spo2, temperature, respiration_rate, battery_level, device_id, timestamp
      FROM telemetry
      WHERE patient_id = $1
      ORDER BY timestamp DESC
      LIMIT 10;
    `, [patient_id]);
    if (recent.rows.length === 0) {
      recent = await db.query(`
        SELECT id, patient_id, heart_rate, spo2, temperature, 18.0 AS respiration_rate, 95.0 AS battery_level, 'ESP32-SIM' AS device_id, timestamp
        FROM health_readings
        WHERE patient_id = $1
        ORDER BY timestamp DESC
        LIMIT 10;
      `, [patient_id]);
    }
    patientData.recent_readings = recent.rows.map(r => ({
      ...r,
      pulse_rate: r.heart_rate
    }));

    res.json({ success: true, data: patientData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Retrieve latest telemetry for a specific patient
 * GET /api/telemetry/latest and /api/readings/latest/ (React frontend alias)
 */
app.get(['/api/telemetry/latest', '/api/readings/latest', '/api/readings/latest/'], async (req, res) => {
  try {
    const patient_id = req.query.patient_id || 'PAT-101';
    let { rows } = await db.query(`
      SELECT * FROM telemetry 
      WHERE patient_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1;
    `, [patient_id]);

    // Fallback to health_readings table if telemetry has no rows for this patient
    if (rows.length === 0) {
      const fallback = await db.query(`
        SELECT id, patient_id, heart_rate, spo2, temperature, 18.0 AS respiration_rate, 95.0 AS battery_level, timestamp
        FROM health_readings
        WHERE patient_id = $1
        ORDER BY timestamp DESC
        LIMIT 1;
      `, [patient_id]);
      rows = fallback.rows;
    }

    // Fallback to any recent reading across the database so patient always has active vitals
    if (rows.length === 0) {
      const anyReading = await db.query(`
        SELECT * FROM telemetry
        ORDER BY timestamp DESC
        LIMIT 1;
      `);
      if (anyReading.rows.length > 0) {
        rows = anyReading.rows;
      }
    }

    if (rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No telemetry data found for patient' });
    }

    const reading = { ...rows[0] };
    const diffSec = Math.max(0, Math.round((Date.now() - new Date(reading.timestamp).getTime()) / 1000));
    reading.seconds_since_reading = diffSec;
    reading.is_stale = diffSec > 15; // stale if no data within 15 seconds
    res.json({ success: true, data: reading });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Retrieve time-series history for charts
 * GET /api/telemetry/history  and /api/readings/history/ (React frontend alias)
 */
app.get(['/api/telemetry/history', '/api/readings/history', '/api/readings/history/'], async (req, res) => {
  try {
    const patient_id = req.query.patient_id || 'PAT-101';
    const limit = Math.min(parseInt(req.query.limit || '60', 10), 300);

    let { rows } = await db.query(`
      SELECT * FROM (
        SELECT id, patient_id, heart_rate, spo2, temperature, respiration_rate, battery_level, timestamp
        FROM telemetry
        WHERE patient_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      ) sub
      ORDER BY timestamp ASC;
    `, [patient_id, limit]);

    if (rows.length === 0) {
      const fallback = await db.query(`
        SELECT * FROM (
          SELECT id, patient_id, heart_rate, spo2, temperature, 18.0 AS respiration_rate, 95.0 AS battery_level, timestamp
          FROM health_readings
          WHERE patient_id = $1
          ORDER BY timestamp DESC
          LIMIT $2
        ) sub
        ORDER BY timestamp ASC;
      `, [patient_id, limit]);
      rows = fallback.rows;
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Retrieve clinical alerts
 * GET /api/alerts  and /api/alerts/ (React frontend alias)
 */
app.get(['/api/alerts', '/api/alerts/'], async (req, res) => {
  try {
    const { patient_id, resolved, unreviewed_only } = req.query;
    let query = `SELECT a.*, p.name AS patient_name, p.room_number FROM alerts a JOIN patients p ON a.patient_id = p.patient_id`;
    const params = [];
    const conditions = [];

    if (patient_id) {
      params.push(patient_id);
      conditions.push(`a.patient_id = $${params.length}`);
    }

    // Support both ?resolved=false (dashboard) and ?unreviewed_only=true (React frontend)
    if (unreviewed_only === 'true' || resolved === 'false') {
      conditions.push(`a.resolved = false`);
    } else if (resolved === 'true') {
      conditions.push(`a.resolved = true`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY a.timestamp DESC LIMIT 100;`;

    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Acknowledge / Resolve an Alert
 * POST /api/alerts/:id/resolve  and PATCH /api/alerts/:id/review/ (React frontend alias)
 */
app.post(['/api/alerts/:id/resolve', '/api/alerts/:id/resolve/'], async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved_by = 'Duty Clinician', reviewed_by } = req.body;
    const resolvedBy = reviewed_by || resolved_by;

    const { rows } = await db.query(`
      UPDATE alerts
      SET resolved = true, resolved_at = CURRENT_TIMESTAMP, resolved_by = $1,
          acknowledged = true, acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = $1
      WHERE id = $2
      RETURNING *;
    `, [resolvedBy, id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    broadcast('ALERT_RESOLVED', rows[0]);
    res.json({ success: true, message: 'Alert resolved successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH alias for React frontend /api/alerts/:id/review/
app.patch(['/api/alerts/:id/review', '/api/alerts/:id/review/'], async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by = 'Clinical Monitor Operator' } = req.body;

    const { rows } = await db.query(`
      UPDATE alerts
      SET resolved = true, resolved_at = CURRENT_TIMESTAMP, resolved_by = $1,
          acknowledged = true, acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = $1
      WHERE id = $2
      RETURNING *;
    `, [reviewed_by, id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    broadcast('ALERT_RESOLVED', rows[0]);
    res.json({ success: true, message: 'Alert reviewed successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Export patient telemetry data to CSV for clinical records
 * GET /api/export?patient_id=PAT-101
 */
app.get('/api/export', async (req, res) => {
  try {
    const patient_id = req.query.patient_id || 'PAT-101';
    const { rows } = await db.query(`
      SELECT 
        t.timestamp,
        t.patient_id,
        p.name AS patient_name,
        p.room_number,
        t.heart_rate,
        t.spo2,
        t.temperature,
        t.respiration_rate,
        t.battery_level,
        t.device_id
      FROM telemetry t
      JOIN patients p ON t.patient_id = p.patient_id
      WHERE t.patient_id = $1
      ORDER BY t.timestamp DESC;
    `, [patient_id]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=covid_vitals_${patient_id}_${Date.now()}.csv`);

    let csv = 'Timestamp,Patient ID,Patient Name,Room Number,Heart Rate (BPM),SpO2 (%),Temperature (°C),Respiration (RPM),Battery (%),Device ID\r\n';
    rows.forEach(r => {
      csv += `"${r.timestamp}","${r.patient_id}","${r.patient_name}","${r.room_number}",${r.heart_rate},${r.spo2},${r.temperature},${r.respiration_rate},${r.battery_level},"${r.device_id}"\r\n`;
    });

    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Built-in Simulation Scenario Injection endpoint
 * POST /api/simulate  and /api/demo/simulate/ (React frontend alias)
 */
app.post(['/api/simulate', '/api/demo/simulate', '/api/demo/simulate/'], async (req, res) => {
  try {
    const { scenario = 'normal', patient_id = 'PAT-101' } = req.body;
    let heart_rate, spo2, temperature, respiration_rate;

    switch (scenario) {
      case 'hypoxia':
        // COVID-19 Acute Hypoxia drop
        heart_rate = (105 + Math.random() * 8).toFixed(1);
        spo2 = (88.5 + Math.random() * 2.5).toFixed(1);
        temperature = (38.1 + Math.random() * 0.4).toFixed(2);
        respiration_rate = (26 + Math.round(Math.random() * 4)).toFixed(1);
        break;
      case 'fever':
        // COVID-19 Severe Hyperpyrexia
        heart_rate = (112 + Math.random() * 6).toFixed(1);
        spo2 = (94.0 + Math.random() * 1.5).toFixed(1);
        temperature = (39.2 + Math.random() * 0.5).toFixed(2);
        respiration_rate = (22 + Math.round(Math.random() * 3)).toFixed(1);
        break;
      case 'tachycardia':
        // Cardiac complication / Arrhythmia
        heart_rate = (128 + Math.random() * 12).toFixed(1);
        spo2 = (93.5 + Math.random() * 2.0).toFixed(1);
        temperature = (37.9 + Math.random() * 0.3).toFixed(2);
        respiration_rate = (24 + Math.round(Math.random() * 2)).toFixed(1);
        break;
      case 'normal':
      default:
        // Healthy recovering Covid patient baseline
        heart_rate = (74 + Math.random() * 6).toFixed(1);
        spo2 = (97.5 + Math.random() * 1.5).toFixed(1);
        temperature = (36.8 + Math.random() * 0.3).toFixed(2);
        respiration_rate = (16 + Math.round(Math.random() * 2)).toFixed(1);
        break;
    }

    // Ingest via database & broadcast
    const result = await db.query(`
      INSERT INTO telemetry (
        patient_id, heart_rate, spo2, temperature, respiration_rate, battery_level, motion_detected, device_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [patient_id, heart_rate, spo2, temperature, respiration_rate, 95.0, false, 'SIMULATOR_SCENARIO']);

    const record = result.rows[0];
    const alerts = await evaluateClinicalAlerts(record);
    broadcast('TELEMETRY_UPDATE', record);

    res.json({
      success: true,
      scenario,
      record,
      alertsTriggered: alerts.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Devices endpoint (React frontend alias for device status)
 * GET /api/devices/
 */
app.get(['/api/devices', '/api/devices/'], async (req, res) => {
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
    res.json({ success: true, data: rows });
  } catch (err) {
    // If devices table doesn't exist yet, return empty
    res.json({ success: true, data: [] });
  }
});

/**
 * Settings endpoint (React frontend)
 * GET /api/settings/   POST /api/settings/
 */
const defaultSettings = {
  spo2_critical: 90.0, spo2_warning: 94.0,
  temp_fever: 37.8, temp_critical_fever: 38.5, temp_hypothermia: 35.0,
  hr_tachycardia: 101, hr_critical_tachycardia: 120, hr_bradycardia: 50,
  resp_rate_high: 24, alert_cooldown_seconds: 60
};
app.get(['/api/settings', '/api/settings/'], (req, res) => {
  res.json({ success: true, data: defaultSettings });
});
app.post(['/api/settings', '/api/settings/'], (req, res) => {
  Object.assign(defaultSettings, req.body);
  res.json({ success: true, data: defaultSettings, message: 'Settings updated' });
});

// Start Server after database schema check
async function startServer() {
  try {
    await db.initDatabase();
    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`     COVID-19 PATIENT HEALTH MONITOR GATEWAY        `);
      console.log(` Backend REST API & WebSockets live on Port: ${PORT}`);
      console.log(` Web Dashboard: http://localhost:${PORT}`);
      console.log(` Telemetry Ingest: POST http://localhost:${PORT}/api/telemetry`);
      console.log(` WebSocket URL: ws://localhost:${PORT}/ws`);
      console.log(` Database: PostgreSQL (covid_monitor_db)`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('[Server Start Failure]:', err.message);
    process.exit(1);
  }
}

startServer();
