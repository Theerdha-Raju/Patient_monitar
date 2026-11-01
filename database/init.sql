-- =======================================================================
-- Quarantine Patient Health Monitoring System - PostgreSQL Database Schema
-- MCA Project: IoT-Based Covid Patient Health Monitor in Quarantine
-- =======================================================================

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    patient_id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) DEFAULT 'Unspecified',
    room_number VARCHAR(50) NOT NULL,
    quarantine_day INT DEFAULT 1,
    quarantine_start_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'Active Quarantine',
    comorbidities TEXT DEFAULT 'None reported',
    contact_emergency VARCHAR(50) DEFAULT '+1-555-0192',
    is_demo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Devices Table
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(32) REFERENCES patients(patient_id) ON DELETE SET NULL,
    device_type VARCHAR(30) DEFAULT 'ESP32',
    ip_address VARCHAR(45) DEFAULT '192.168.1.150',
    status VARCHAR(30) DEFAULT 'ONLINE',
    firmware_version VARCHAR(20) DEFAULT 'v1.4.2',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Health Readings Table (Time-Series Telemetry)
CREATE TABLE IF NOT EXISTS health_readings (
    id BIGSERIAL PRIMARY KEY,
    patient_id VARCHAR(32) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    temperature NUMERIC(5, 2) NOT NULL,
    heart_rate NUMERIC(5, 1) NOT NULL,
    spo2 NUMERIC(5, 1) NOT NULL,
    device_id VARCHAR(50) DEFAULT 'ESP32_NODE_01',
    is_demo BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    patient_id VARCHAR(32) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    value NUMERIC(6, 2),
    threshold NUMERIC(6, 2),
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_health_readings_patient_time 
    ON health_readings (patient_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_ack 
    ON alerts (patient_id, acknowledged, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_devices_last_seen 
    ON devices (last_seen DESC);

-- 5. Seed Demonstration Patient & Device Data
INSERT INTO patients (
    patient_id, name, age, gender, room_number, quarantine_day, 
    quarantine_start_date, status, comorbidities, contact_emergency, is_demo
) VALUES (
    'P001', 'Anonymized Subject P001 (John D.)', 45, 'Male', 
    'Quarantine Ward 101', 5, CURRENT_DATE - INTERVAL '5 days', 
    'Active Quarantine', 'Mild Bronchitis (Post-Exposure Observation)', 
    '+1-555-0144', TRUE
) ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO devices (
    device_id, patient_id, device_type, ip_address, status, firmware_version, last_seen
) VALUES (
    'ESP32_NODE_01', 'P001', 'ESP32-WROOM', '192.168.1.150', 'ONLINE', 'v1.4.2', CURRENT_TIMESTAMP
) ON CONFLICT (device_id) DO UPDATE 
    SET last_seen = CURRENT_TIMESTAMP, status = 'ONLINE';

-- Seed initial 20 historical readings for P001 (baseline demonstration points)
INSERT INTO health_readings (patient_id, temperature, heart_rate, spo2, device_id, is_demo, timestamp)
SELECT 
    'P001',
    ROUND((36.7 + (RANDOM() * 0.5 - 0.2))::NUMERIC, 2),
    ROUND((74.0 + (RANDOM() * 8.0 - 4.0))::NUMERIC, 1),
    ROUND((97.5 + (RANDOM() * 1.5 - 0.5))::NUMERIC, 1),
    'ESP32_NODE_01',
    TRUE,
    CURRENT_TIMESTAMP - (i || ' minutes')::INTERVAL
FROM generate_series(20, 1, -1) AS i
ON CONFLICT DO NOTHING;
