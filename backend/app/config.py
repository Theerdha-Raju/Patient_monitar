import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

PG_HOST = os.getenv("PGHOST", "localhost")
PG_PORT = int(os.getenv("PGPORT", "5432"))
PG_USER = os.getenv("PGUSER", "postgres")
PG_PASSWORD = os.getenv("PGPASSWORD", "")
PG_DATABASE = os.getenv("PGDATABASE", "covid_monitor_db")
DATABASE_URL = os.getenv("DATABASE_URL")

API_PORT = int(os.getenv("PORT", "8000"))
API_HOST = os.getenv("HOST", "0.0.0.0")

# Clinical Thresholds
THRESHOLDS = {
    "spo2": {
        "normal_min": 95.0,
        "amber_min": 92.0,
        "amber_max": 94.0,
        "red_max": 91.9,
    },
    "heart_rate": {
        "normal_min": 60.0,
        "normal_max": 100.0,
        "amber_low_min": 50.0,
        "amber_low_max": 59.9,
        "amber_high_min": 101.0,
        "amber_high_max": 120.0,
    },
    "temperature": {
        "normal_min": 36.1,
        "normal_max": 37.2,
        "amber_min": 37.3,
        "amber_max": 38.0,
        "fever_critical": 38.0,
    }
}
