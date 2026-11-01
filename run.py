"""
Entry-point for the COVID Patient Health Monitoring Dashboard.
Run from the project root:  python run.py
"""
import os, sys

# Ensure project root is on the path so 'from backend.xxx import' works
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import app
from backend.db import init_db

with app.app_context():
    try:
        init_db()
    except Exception as e:
        print(f"[Warning] DB init notice: {e}")

if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "0.0.0.0")

    print("=" * 71)
    print("        PATIENT HEALTH MONITORING SYSTEM - FLASK REST GATEWAY        ")
    print(f"  Web Dashboard:    http://localhost:{PORT}                          ")
    print(f"  Telemetry Ingest: POST http://localhost:{PORT}/api/readings/       ")
    print(f"  Health Check:     GET  http://localhost:{PORT}/api/health/         ")
    print("=" * 71)

    app.run(host=HOST, port=PORT, debug=False)
