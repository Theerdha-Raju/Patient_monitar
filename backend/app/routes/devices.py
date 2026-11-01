from fastapi import APIRouter
from datetime import datetime, timezone
from backend.app.database import query_all
from backend.app.models import DEFAULT_THRESHOLDS

router = APIRouter(prefix="/api/devices", tags=["Devices"])

@router.get("/")
@router.get("")
async def get_devices():
    devices = query_all("""
        SELECT d.device_id, d.patient_id, p.name as patient_name, d.status, d.ip_address, d.last_seen
        FROM devices d
        LEFT JOIN patients p ON d.patient_id = p.patient_id
        ORDER BY d.device_id ASC
    """)

    now = datetime.now(timezone.utc)
    timeout_sec = DEFAULT_THRESHOLDS.get("stale_timeout_sec", 30)

    for dev in devices:
        last_seen = dev.get("last_seen")
        seconds_ago = None
        if last_seen:
            try:
                dt = datetime.fromisoformat(str(last_seen).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                seconds_ago = max(0, int((now - dt).total_seconds()))
            except Exception:
                pass

        dev["seconds_since_last_seen"] = seconds_ago
        dev["timeout_threshold_seconds"] = timeout_sec

        # Check offline condition strictly: do NOT assume online merely because dashboard is open
        if seconds_ago is None or seconds_ago > timeout_sec:
            dev["is_online"] = False
            dev["status"] = "OFFLINE"
            dev["status_message"] = f"No telemetry received for > {timeout_sec}s (Sensor Offline)"
        else:
            dev["is_online"] = True
            dev["status"] = "ONLINE"
            dev["status_message"] = f"Active transmission (Last heard {seconds_ago}s ago)"

    return {
        "success": True,
        "count": len(devices),
        "timeout_seconds": timeout_sec,
        "data": devices
    }

@router.delete("/{device_id}")
async def delete_device(device_id: str):
    execute("DELETE FROM devices WHERE device_id = %s", (device_id,))
    return {"success": True, "message": f"Device {device_id} removed"}

@router.delete("/offline/cleanup")
@router.post("/offline/cleanup")
async def cleanup_offline_devices():
    execute("""
        DELETE FROM devices 
        WHERE status = 'OFFLINE' 
           OR last_seen < CURRENT_TIMESTAMP - INTERVAL '60 seconds'
           OR last_seen IS NULL
    """)
    return {"success": True, "message": "Offline devices cleared"}

