"""
Main Application Entry Point - Flask REST Gateway & Dashboard Host
Quarantine Patient Health Monitoring System
"""

import os
from pathlib import Path
from flask import Flask, send_from_directory, jsonify
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

# Determine frontend static path
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")

# Enable CORS for all routes
try:
    from flask_cors import CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
except ImportError:
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
        return response

# Register REST API Blueprint
from backend.routes import api_bp
app.register_blueprint(api_bp)

# Initialize Database Schema & Initial Data
from backend.db import init_db
with app.app_context():
    try:
        init_db()
    except Exception as e:
        print(f"[Warning] DB Initialization notice: {e}")


# Frontend Static File Serving
@app.route("/")
def serve_index():
    """Serves the main quarantine health monitoring dashboard."""
    return send_from_directory(str(FRONTEND_DIR), "index.html")


@app.route("/<path:path>")
def serve_static_assets(path):
    """Serves CSS, JS, and image assets from the frontend directory."""
    target_file = FRONTEND_DIR / path
    if target_file.exists():
        return send_from_directory(str(FRONTEND_DIR), path)
    return send_from_directory(str(FRONTEND_DIR), "index.html")


# Global Error Handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "success": False,
        "error": "Resource not found",
        "documentation": "/api/health/"
    }), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500


if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "0.0.0.0")

    print("=======================================================================")
    print("  QUARANTINE PATIENT HEALTH MONITORING SYSTEM - FLASK REST GATEWAY     ")
    print(f"  Web Dashboard:    http://localhost:{PORT}                            ")
    print(f"  Telemetry Ingest: POST http://localhost:{PORT}/api/readings/        ")
    print(f"  Health Check:     GET  http://localhost:{PORT}/api/health/          ")
    print(f"  Serving Frontend: {FRONTEND_DIR}                                     ")
    print("=======================================================================")

    app.run(host=HOST, port=PORT, debug=False)
