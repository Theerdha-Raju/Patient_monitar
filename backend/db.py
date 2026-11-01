"""
Database Manager for Quarantine Patient Health Monitoring System
Supports PostgreSQL as primary database with automatic, transparent SQLite fallback.
"""

import os
import sqlite3
from datetime import datetime, date, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Database Config
DB_TYPE = "postgresql"  # "postgresql" or "sqlite"
PG_HOST = os.getenv("PGHOST", "localhost")
PG_PORT = int(os.getenv("PGPORT", "5432"))
PG_USER = os.getenv("PGUSER", "postgres")
PG_PASSWORD = os.getenv("PGPASSWORD", "")
PG_DATABASE = os.getenv("PGDATABASE", "covid_monitor_db")
DATABASE_URL = os.getenv("DATABASE_URL")

SQLITE_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "health_monitor.db"

_pg_pool = None
_using_sqlite = False

try:
    import psycopg2
    from psycopg2 import pool, extras
except ImportError:
    psycopg2 = None


def get_connection():
    """Returns a database connection based on configured driver."""
    global DB_TYPE, _using_sqlite, _pg_pool

    if not _using_sqlite and psycopg2 is not None:
        try:
            if DATABASE_URL:
                conn = psycopg2.connect(DATABASE_URL)
            else:
                conn = psycopg2.connect(
                    host=PG_HOST,
                    port=PG_PORT,
                    user=PG_USER,
                    password=PG_PASSWORD,
                    database=PG_DATABASE,
                    connect_timeout=3
                )
            conn.autocommit = True
            return conn, "postgresql"
        except Exception as e:
            print(f"[Database] PostgreSQL connection failed ({e}). Falling back to local SQLite.")
            _using_sqlite = True
            DB_TYPE = "sqlite"

    # SQLite Fallback
    SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(SQLITE_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn, "sqlite"


def init_db():
    """Initializes tables and seeds initial demonstration patient P001."""
    conn, engine = get_connection()
    cursor = conn.cursor()

    try:
        if engine == "postgresql":
            # PostgreSQL Schema
            cursor.execute("""
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

                CREATE INDEX IF NOT EXISTS idx_health_readings_patient_time 
                    ON health_readings (patient_id, timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_alerts_patient_ack 
                    ON alerts (patient_id, acknowledged, timestamp DESC);
            """)

            # Check if patient P001 exists
            cursor.execute("SELECT COUNT(*) FROM patients WHERE patient_id = 'P001'")
            count = cursor.fetchone()[0]
            if count == 0:
                print("[Database] Seeding demonstration patient P001 & baseline readings into PostgreSQL...")
                cursor.execute("""
                    INSERT INTO patients (
                        patient_id, name, age, gender, room_number, quarantine_day, 
                        quarantine_start_date, status, comorbidities, contact_emergency, is_demo
                    ) VALUES (
                        'P001', 'Anonymized Subject P001 (John D.)', 45, 'Male', 
                        'Quarantine Ward 101', 5, CURRENT_DATE, 
                        'Active Quarantine', 'Mild Bronchitis (Post-Exposure Observation)', 
                        '+1-555-0144', TRUE
                    );

                    INSERT INTO devices (
                        device_id, patient_id, device_type, ip_address, status, firmware_version, last_seen
                    ) VALUES (
                        'ESP32_NODE_01', 'P001', 'ESP32-WROOM', '192.168.1.150', 'ONLINE', 'v1.4.2', CURRENT_TIMESTAMP
                    ) ON CONFLICT (device_id) DO NOTHING;
                """)

                # Seed initial 15 baseline points
                for i in range(15, 0, -1):
                    cursor.execute("""
                        INSERT INTO health_readings (patient_id, temperature, heart_rate, spo2, device_id, is_demo, timestamp)
                        VALUES ('P001', %s, %s, %s, 'ESP32_NODE_01', TRUE, CURRENT_TIMESTAMP - INTERVAL '%s minute')
                    """, (36.6 + (i % 3) * 0.15, 74 + (i % 5) * 2, 97.5 + (i % 3) * 0.5, i))

        else:
            # SQLite Schema
            cursor.executescript("""
                CREATE TABLE IF NOT EXISTS patients (
                    patient_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    age INTEGER NOT NULL,
                    gender TEXT DEFAULT 'Unspecified',
                    room_number TEXT NOT NULL,
                    quarantine_day INTEGER DEFAULT 1,
                    quarantine_start_date TEXT DEFAULT (DATE('now')),
                    status TEXT DEFAULT 'Active Quarantine',
                    comorbidities TEXT DEFAULT 'None reported',
                    contact_emergency TEXT DEFAULT '+1-555-0192',
                    is_demo INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT (DATETIME('now'))
                );

                CREATE TABLE IF NOT EXISTS devices (
                    device_id TEXT PRIMARY KEY,
                    patient_id TEXT REFERENCES patients(patient_id),
                    device_type TEXT DEFAULT 'ESP32',
                    ip_address TEXT DEFAULT '192.168.1.150',
                    status TEXT DEFAULT 'ONLINE',
                    firmware_version TEXT DEFAULT 'v1.4.2',
                    last_seen TEXT DEFAULT (DATETIME('now')),
                    created_at TEXT DEFAULT (DATETIME('now'))
                );

                CREATE TABLE IF NOT EXISTS health_readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
                    temperature REAL NOT NULL,
                    heart_rate REAL NOT NULL,
                    spo2 REAL NOT NULL,
                    device_id TEXT DEFAULT 'ESP32_NODE_01',
                    is_demo INTEGER DEFAULT 0,
                    timestamp TEXT DEFAULT (DATETIME('now'))
                );

                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    value REAL,
                    threshold REAL,
                    message TEXT NOT NULL,
                    acknowledged INTEGER DEFAULT 0,
                    acknowledged_at TEXT,
                    acknowledged_by TEXT,
                    timestamp TEXT DEFAULT (DATETIME('now'))
                );
            """)

            cursor.execute("SELECT COUNT(*) FROM patients WHERE patient_id = 'P001'")
            count = cursor.fetchone()[0]
            if count == 0:
                print("[Database] Seeding demonstration patient P001 into SQLite...")
                cursor.execute("""
                    INSERT INTO patients (
                        patient_id, name, age, gender, room_number, quarantine_day, 
                        quarantine_start_date, status, comorbidities, contact_emergency, is_demo
                    ) VALUES (
                        'P001', 'Anonymized Subject P001 (John D.)', 45, 'Male', 
                        'Quarantine Ward 101', 5, DATE('now'), 
                        'Active Quarantine', 'Mild Bronchitis (Post-Exposure Observation)', 
                        '+1-555-0144', 1
                    );
                """)
                cursor.execute("""
                    INSERT OR IGNORE INTO devices (
                        device_id, patient_id, device_type, ip_address, status, firmware_version, last_seen
                    ) VALUES (
                        'ESP32_NODE_01', 'P001', 'ESP32-WROOM', '192.168.1.150', 'ONLINE', 'v1.4.2', DATETIME('now')
                    );
                """)
                for i in range(15, 0, -1):
                    cursor.execute("""
                        INSERT INTO health_readings (patient_id, temperature, heart_rate, spo2, device_id, is_demo, timestamp)
                        VALUES ('P001', ?, ?, ?, 'ESP32_NODE_01', 1, DATETIME('now', ? || ' minutes'))
                    """, (36.6 + (i % 3) * 0.15, 74 + (i % 5) * 2, 97.5 + (i % 3) * 0.5, f"-{i}"))
                conn.commit()

        print(f"[Database] Initialized successfully ({engine}).")
    finally:
        conn.close()


def query_all(sql, params=None):
    """Executes a SELECT query and returns list of dictionaries."""
    conn, engine = get_connection()
    try:
        cursor = conn.cursor()
        if engine == "sqlite":
            sql_sqlite = sql.replace("%s", "?")
            cursor.execute(sql_sqlite, params or [])
            columns = [col[0] for col in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        else:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params or [])
                rows = cur.fetchall()
                # Format timestamps to ISO strings
                for r in rows:
                    for k, v in r.items():
                        if isinstance(v, (datetime, date)):
                            r[k] = v.isoformat()
                        elif hasattr(v, '__float__') and not isinstance(v, (int, bool)):
                            r[k] = float(v)
                return [dict(r) for r in rows]
    finally:
        conn.close()


def query_one(sql, params=None):
    """Executes a SELECT query and returns a single dictionary or None."""
    results = query_all(sql, params)
    return results[0] if results else None


def execute_write(sql, params=None):
    """Executes an INSERT, UPDATE, or DELETE query."""
    conn, engine = get_connection()
    try:
        cursor = conn.cursor()
        if engine == "sqlite":
            sql_sqlite = sql.replace("%s", "?")
            cursor.execute(sql_sqlite, params or [])
            conn.commit()
            return cursor.lastrowid
        else:
            cursor.execute(sql, params or [])
            return cursor.rowcount
    finally:
        conn.close()
