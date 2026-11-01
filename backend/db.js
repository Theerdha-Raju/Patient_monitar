const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL Connection Pool
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD !== undefined ? process.env.PGPASSWORD : '',
      database: process.env.PGDATABASE || 'covid_monitor_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

/**
 * Initializes database schemas, indexes, and seed patients
 */
async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('[PostgreSQL] Connected successfully. Initializing tables...');

    // 1. Patients Table - Ensure table exists with both patient_id and id
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        patient_id VARCHAR(32) PRIMARY KEY,
        id VARCHAR(32),
        name VARCHAR(100) NOT NULL,
        age INT NOT NULL,
        gender VARCHAR(20) DEFAULT 'Unspecified',
        room_number VARCHAR(50) NOT NULL,
        quarantine_day INT DEFAULT 1,
        quarantine_start_date DATE DEFAULT CURRENT_DATE,
        admission_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(30) DEFAULT 'ACTIVE_MONITORING',
        comorbidities TEXT DEFAULT 'None reported',
        contact_emergency VARCHAR(50) DEFAULT '+1-555-0192',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_id VARCHAR(32);
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS id VARCHAR(32);
      UPDATE patients SET id = COALESCE(id, patient_id) WHERE id IS NULL;
      UPDATE patients SET patient_id = COALESCE(patient_id, id) WHERE patient_id IS NULL;

      -- Sync trigger so writing to either id or patient_id keeps both in sync
      CREATE OR REPLACE FUNCTION sync_patient_id() RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.id IS NULL AND NEW.patient_id IS NOT NULL THEN
          NEW.id := NEW.patient_id;
        ELSIF NEW.patient_id IS NULL AND NEW.id IS NOT NULL THEN
          NEW.patient_id := NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_sync_patient_id ON patients;
      CREATE TRIGGER trg_sync_patient_id
      BEFORE INSERT OR UPDATE ON patients
      FOR EACH ROW EXECUTE FUNCTION sync_patient_id();
    `);

    // 2. Telemetry Records Table (Time-Series) - References patient_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id BIGSERIAL PRIMARY KEY,
        patient_id VARCHAR(32) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
        heart_rate NUMERIC(5,1) NOT NULL,
        spo2 NUMERIC(5,1) NOT NULL,
        temperature NUMERIC(5,2) NOT NULL,
        respiration_rate NUMERIC(5,1) NOT NULL,
        battery_level NUMERIC(5,1) DEFAULT 100.0,
        motion_detected BOOLEAN DEFAULT FALSE,
        device_id VARCHAR(50) DEFAULT 'ESP32_TELEMETRY_NODE',
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Clinical Alerts Table - Ensure resolved columns exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id BIGSERIAL PRIMARY KEY,
        patient_id VARCHAR(32) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        value NUMERIC(6,2),
        threshold NUMERIC(6,2),
        message TEXT NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by VARCHAR(50),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(50);
    `);

    // Indexes for high performance querying
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_patient_time 
      ON telemetry (patient_id, timestamp DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_patient_resolved 
      ON alerts (patient_id, resolved, timestamp DESC);
    `);

    // 4. Ensure Patients exist
    console.log('[PostgreSQL] Ensuring COVID monitoring patients exist...');
    await client.query(`
      INSERT INTO patients (patient_id, id, name, age, gender, room_number, quarantine_day, status, comorbidities, contact_emergency)
      VALUES 
        ('PAT-101', 'PAT-101', 'Elena Rostova', 46, 'Female', 'Isolation Ward 301', 6, 'ACTIVE_MONITORING', 'Mild Asthma, Post-Covid Cough', '+1-555-4021'),
        ('PAT-102', 'PAT-102', 'Marcus Vance', 68, 'Male', 'Isolation Ward 302', 3, 'CRITICAL', 'Hypertension, Type-2 Diabetes (High Hypoxia Risk)', '+1-555-8832'),
        ('PAT-103', 'PAT-103', 'Aisha Sharma', 29, 'Female', 'Isolation Ward 303', 11, 'OBSERVATION', 'None (Recovering, Day 11)', '+1-555-1994')
      ON CONFLICT (patient_id) DO UPDATE SET
        name = EXCLUDED.name,
        room_number = EXCLUDED.room_number,
        status = EXCLUDED.status,
        comorbidities = EXCLUDED.comorbidities,
        id = EXCLUDED.patient_id;
    `);

    // 5. Seed baseline telemetry if empty
    const { rows: telemetryCount } = await client.query('SELECT COUNT(*) AS count FROM telemetry');
    if (parseInt(telemetryCount[0].count, 10) === 0) {
      console.log('[PostgreSQL] Seeding initial baseline telemetry for patients...');
      const now = Date.now();
      for (let i = 20; i >= 0; i--) {
        const timePoint = new Date(now - i * 60 * 1000); // 1-minute intervals
        // PAT-101 vitals (slightly elevated temp, borderline normal SpO2)
        await client.query(`
          INSERT INTO telemetry (patient_id, heart_rate, spo2, temperature, respiration_rate, battery_level, motion_detected, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          'PAT-101',
          (78 + Math.sin(i * 0.5) * 4).toFixed(1),
          (96.2 + Math.cos(i * 0.3) * 1.0).toFixed(1),
          (37.6 + Math.sin(i * 0.2) * 0.3).toFixed(2),
          (18 + Math.round(Math.sin(i * 0.4) * 2)),
          (95 - (20 - i) * 0.1).toFixed(1),
          false,
          timePoint
        ]);

        // PAT-102 vitals (frequent hypoxia drops ~91-93%, higher temp ~38.4C)
        await client.query(`
          INSERT INTO telemetry (patient_id, heart_rate, spo2, temperature, respiration_rate, battery_level, motion_detected, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          'PAT-102',
          (92 + Math.cos(i * 0.4) * 6).toFixed(1),
          (92.4 + Math.sin(i * 0.5) * 1.8).toFixed(1),
          (38.3 + Math.cos(i * 0.2) * 0.4).toFixed(2),
          (22 + Math.round(Math.sin(i * 0.3) * 2)),
          (91 - (20 - i) * 0.1).toFixed(1),
          false,
          timePoint
        ]);

        // PAT-103 vitals (healthy recovering range)
        await client.query(`
          INSERT INTO telemetry (patient_id, heart_rate, spo2, temperature, respiration_rate, battery_level, motion_detected, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          'PAT-103',
          (72 + Math.sin(i * 0.6) * 3).toFixed(1),
          (98.1 + Math.sin(i * 0.4) * 0.8).toFixed(1),
          (36.8 + Math.cos(i * 0.2) * 0.2).toFixed(2),
          (16 + Math.round(Math.cos(i * 0.3) * 1)),
          (98 - (20 - i) * 0.1).toFixed(1),
          false,
          timePoint
        ]);
      }

      // Seed sample active alert for PAT-102 (Hypoxia Warning)
      await client.query(`
        INSERT INTO alerts (patient_id, alert_type, severity, value, threshold, message, resolved)
        VALUES 
          ('PAT-102', 'HYPOXIA_ALERT', 'CRITICAL', 91.5, 93.0, 'Critical Blood Oxygen drop detected (SpO2: 91.5%). Supplemental Oxygen may be required.', false),
          ('PAT-102', 'HIGH_FEVER', 'WARNING', 38.6, 38.0, 'Elevated body temperature detected (38.6°C / 101.5°F). Administer antipyretic protocol.', false);
      `);
    }

    // Ensure P001 has telemetry rows if present in health_readings
    const { rows: p001Count } = await client.query("SELECT COUNT(*) AS count FROM telemetry WHERE patient_id = 'P001'");
    if (parseInt(p001Count[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO telemetry (patient_id, heart_rate, spo2, temperature, respiration_rate, battery_level, motion_detected, device_id, timestamp)
        SELECT patient_id, heart_rate, spo2, temperature, 18.0, 95.0, false, COALESCE(device_id, 'ESP32_NODE_01'), timestamp
        FROM health_readings
        WHERE patient_id = 'P001'
        ORDER BY timestamp DESC
        LIMIT 30
        ON CONFLICT DO NOTHING;
      `);
    }

    console.log('[PostgreSQL] Database ready with tables & seed data.');
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDatabase,
  query: (text, params) => pool.query(text, params),
};
