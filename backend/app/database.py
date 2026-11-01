import os
import sqlite3
from datetime import datetime, date, timezone
from pathlib import Path
from backend.app.config import PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE, DATABASE_URL, BASE_DIR

SQLITE_PATH = BASE_DIR / "data" / "health_monitor.db"

_using_sqlite = False

try:
    import psycopg2
    from psycopg2 import extras
except ImportError:
    psycopg2 = None


def get_connection():
    global _using_sqlite
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
            print(f"[DB] PostgreSQL connection failed ({e}). Using local SQLite fallback.")
            _using_sqlite = True

    SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(SQLITE_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn, "sqlite"


def init_db():
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        if engine == "postgresql":
            cur.execute("""
                CREATE TABLE IF NOT EXISTS patients (
                    patient_id VARCHAR(32) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    room_number VARCHAR(50) NOT NULL,
                    age INT DEFAULT 45,
                    gender VARCHAR(20) DEFAULT 'Unspecified',
                    status VARCHAR(30) DEFAULT 'Stable',
                    quarantine_start_date DATE DEFAULT CURRENT_DATE,
                    admission_date DATE DEFAULT CURRENT_DATE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS devices (
                    device_id VARCHAR(50) PRIMARY KEY,
                    patient_id VARCHAR(32) REFERENCES patients(patient_id) ON DELETE SET NULL,
                    status VARCHAR(30) DEFAULT 'ONLINE',
                    ip_address VARCHAR(45) DEFAULT '192.168.1.150',
                    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS health_readings (
                    id BIGSERIAL PRIMARY KEY,
                    patient_id VARCHAR(32) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
                    device_id VARCHAR(50) DEFAULT 'esp32-01',
                    spo2 NUMERIC(5, 1) NOT NULL,
                    heart_rate NUMERIC(5, 1) NOT NULL,
                    temperature NUMERIC(5, 2) NOT NULL,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS alerts (
                    id BIGSERIAL PRIMARY KEY,
                    patient_id VARCHAR(32) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
                    metric VARCHAR(50) NOT NULL,
                    value NUMERIC(6, 2) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    message TEXT NOT NULL,
                    acknowledged BOOLEAN DEFAULT FALSE,
                    acknowledged_at TIMESTAMP WITH TIME ZONE,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_health_readings_patient_time 
                    ON health_readings (patient_id, timestamp DESC);
            """)

            # Seed demonstration patients
            cur.execute("SELECT COUNT(*) FROM patients")
            count = cur.fetchone()[0]
            if count == 0:
                print("[DB] Seeding multi-patient registry into PostgreSQL...")
                cur.execute("""
                    INSERT INTO patients (patient_id, name, room_number, age, gender, status, admission_date, quarantine_start_date)
                    VALUES 
                      ('PATIENT-001', 'Demonstration Patient (Health Observation)', 'Ward 101', 45, 'Male', 'Active Monitoring', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE - INTERVAL '4 days'),
                      ('P001', 'John Doe (Ward 101)', 'Ward 101', 45, 'Male', 'Active Monitoring', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE - INTERVAL '4 days'),
                      ('P002', 'Elena Rostova', 'Ward 102', 38, 'Female', 'Active Monitoring', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days'),
                      ('P003', 'Marcus Vance', 'Ward 103', 68, 'Male', 'Attention Required', CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE - INTERVAL '6 days'),
                      ('P004', 'Aisha Sharma', 'Ward 104', 29, 'Female', 'Active Monitoring', CURRENT_DATE - INTERVAL '9 days', CURRENT_DATE - INTERVAL '9 days');

                    INSERT INTO devices (device_id, patient_id, status, ip_address, last_seen)
                    VALUES 
                      ('ESP32-001', 'PATIENT-001', 'ONLINE', '192.168.1.101', CURRENT_TIMESTAMP),
                      ('esp32-01', 'P001', 'ONLINE', '192.168.1.101', CURRENT_TIMESTAMP),
                      ('esp32-02', 'P002', 'ONLINE', '192.168.1.102', CURRENT_TIMESTAMP),
                      ('esp32-03', 'P003', 'ONLINE', '192.168.1.103', CURRENT_TIMESTAMP),
                      ('esp32-04', 'P004', 'ONLINE', '192.168.1.104', CURRENT_TIMESTAMP)
                    ON CONFLICT (device_id) DO NOTHING;
                """)

                # Seed historical readings for PATIENT-001 and P001-P004
                for p_id, base_s, base_h, base_t, dev in [
                    ('PATIENT-001', 97.5, 76.0, 36.8, 'ESP32-001'),
                    ('P001', 97.5, 76.0, 36.8, 'esp32-01'),
                    ('P002', 98.2, 72.0, 36.6, 'esp32-02'),
                    ('P003', 93.5, 96.0, 37.8, 'esp32-03'),
                    ('P004', 98.8, 68.0, 36.7, 'esp32-04'),
                ]:
                    for i in range(25, 0, -1):
                        cur.execute("""
                            INSERT INTO health_readings (patient_id, device_id, spo2, heart_rate, temperature, timestamp)
                            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP - (%s || ' minute')::INTERVAL)
                        """, (
                            p_id, dev,
                            round(base_s + (i % 3) * 0.4 - 0.2, 1),
                            round(base_h + (i % 4) * 1.5 - 1.0, 1),
                            round(base_t + (i % 3) * 0.1 - 0.05, 2),
                            i
                        ))

        else:
            # SQLite fallback
            cur.executescript("""
                CREATE TABLE IF NOT EXISTS patients (
                    patient_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    room_number TEXT NOT NULL,
                    age INTEGER DEFAULT 45,
                    gender TEXT DEFAULT 'Unspecified',
                    status TEXT DEFAULT 'Stable',
                    quarantine_start_date TEXT DEFAULT (DATE('now')),
                    created_at TEXT DEFAULT (DATETIME('now'))
                );

                CREATE TABLE IF NOT EXISTS devices (
                    device_id TEXT PRIMARY KEY,
                    patient_id TEXT REFERENCES patients(patient_id),
                    status TEXT DEFAULT 'ONLINE',
                    ip_address TEXT DEFAULT '192.168.1.150',
                    last_seen TEXT DEFAULT (DATETIME('now'))
                );

                CREATE TABLE IF NOT EXISTS health_readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
                    device_id TEXT DEFAULT 'esp32-01',
                    spo2 REAL NOT NULL,
                    heart_rate REAL NOT NULL,
                    temperature REAL NOT NULL,
                    timestamp TEXT DEFAULT (DATETIME('now'))
                );

                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
                    metric TEXT NOT NULL,
                    value REAL NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    acknowledged INTEGER DEFAULT 0,
                    acknowledged_at TEXT,
                    timestamp TEXT DEFAULT (DATETIME('now'))
                );
            """)

            cur.execute("SELECT COUNT(*) FROM patients")
            count = cur.fetchone()[0]
            if count == 0:
                cur.executescript("""
                    INSERT INTO patients (patient_id, name, room_number, age, gender, status, quarantine_start_date)
                    VALUES 
                      ('PATIENT-001', 'Demonstration Patient (Health Observation)', 'Ward 101', 45, 'Male', 'Active Monitoring', DATE('now', '-4 days')),
                      ('P001', 'John Doe (Ward 101)', 'Ward 101', 45, 'Male', 'Active Monitoring', DATE('now', '-4 days')),
                      ('P002', 'Elena Rostova', 'Ward 102', 38, 'Female', 'Active Monitoring', DATE('now', '-2 days')),
                      ('P003', 'Marcus Vance', 'Ward 103', 68, 'Male', 'Attention Required', DATE('now', '-6 days')),
                      ('P004', 'Aisha Sharma', 'Ward 104', 29, 'Female', 'Active Monitoring', DATE('now', '-9 days'));

                    INSERT OR IGNORE INTO devices (device_id, patient_id, status, ip_address, last_seen)
                    VALUES 
                      ('ESP32-001', 'PATIENT-001', 'ONLINE', '192.168.1.101', DATETIME('now')),
                      ('esp32-01', 'P001', 'ONLINE', '192.168.1.101', DATETIME('now')),
                      ('esp32-02', 'P002', 'ONLINE', '192.168.1.102', DATETIME('now')),
                      ('esp32-03', 'P003', 'ONLINE', '192.168.1.103', DATETIME('now')),
                      ('esp32-04', 'P004', 'ONLINE', '192.168.1.104', DATETIME('now'));
                """)
                for p_id, base_s, base_h, base_t, dev in [
                    ('PATIENT-001', 97.5, 76.0, 36.8, 'ESP32-001'),
                    ('P001', 97.5, 76.0, 36.8, 'esp32-01'),
                    ('P002', 98.2, 72.0, 36.6, 'esp32-02'),
                    ('P003', 93.5, 96.0, 37.8, 'esp32-03'),
                    ('P004', 98.8, 68.0, 36.7, 'esp32-04'),
                ]:
                    for i in range(25, 0, -1):
                        cur.execute("""
                            INSERT INTO health_readings (patient_id, device_id, spo2, heart_rate, temperature, timestamp)
                            VALUES (?, ?, ?, ?, ?, DATETIME('now', ? || ' minutes'))
                        """, (
                            p_id, dev,
                            round(base_s + (i % 3) * 0.4 - 0.2, 1),
                            round(base_h + (i % 4) * 1.5 - 1.0, 1),
                            round(base_t + (i % 3) * 0.1 - 0.05, 2),
                            f"-{i}"
                        ))
                conn.commit()

        print(f"[DB] Initialized successfully ({engine}).")
    finally:
        conn.close()


def query_all(sql: str, params: tuple = None):
    conn, engine = get_connection()
    try:
        cur = conn.cursor()
        if engine == "sqlite":
            sql_sqlite = sql.replace("%s", "?")
            cur.execute(sql_sqlite, params or ())
            cols = [col[0] for col in cur.description] if cur.description else []
            rows = cur.fetchall()
            return [dict(zip(cols, row)) for row in rows]
        else:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur_pg:
                cur_pg.execute(sql, params or ())
                rows = cur_pg.fetchall()
                for r in rows:
                    for k, v in list(r.items()):
                        if isinstance(v, (datetime, date)):
                            r[k] = v.isoformat()
                        elif hasattr(v, '__float__') and not isinstance(v, (int, bool)):
                            r[k] = float(v)
                return [dict(r) for r in rows]
    finally:
        conn.close()


def query_one(sql: str, params: tuple = None):
    rows = query_all(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: tuple = None):
    conn, engine = get_connection()
    try:
        cur = conn.cursor()
        if engine == "sqlite":
            sql_sqlite = sql.replace("%s", "?")
            cur.execute(sql_sqlite, params or ())
            conn.commit()
            return cur.lastrowid
        else:
            cur.execute(sql, params or ())
            return cur.rowcount
    finally:
        conn.close()
