from fastapi import APIRouter
from backend.app.schemas import ThresholdsConfig
from backend.app.models import DEFAULT_THRESHOLDS

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("/")
@router.get("")
async def get_settings():
    return {
        "success": True,
        "disclaimer": "These thresholds are for academic demonstration monitoring only and do not constitute clinical guidance.",
        "thresholds": DEFAULT_THRESHOLDS
    }

@router.post("/")
@router.post("")
async def update_settings(payload: ThresholdsConfig):
    DEFAULT_THRESHOLDS["spo2_normal_min"] = payload.spo2_min_normal
    DEFAULT_THRESHOLDS["spo2_warning_min"] = payload.spo2_warning_low
    DEFAULT_THRESHOLDS["pulse_normal_min"] = payload.pulse_min_normal
    DEFAULT_THRESHOLDS["pulse_normal_max"] = payload.pulse_max_normal
    DEFAULT_THRESHOLDS["pulse_warning_max"] = payload.pulse_warning_high
    DEFAULT_THRESHOLDS["temp_normal_min"] = payload.temp_min_normal
    DEFAULT_THRESHOLDS["temp_normal_max"] = payload.temp_max_normal
    DEFAULT_THRESHOLDS["temp_warning_max"] = payload.temp_warning_max
    DEFAULT_THRESHOLDS["stale_timeout_sec"] = payload.stale_timeout_seconds

    return {
        "success": True,
        "message": "Demonstration thresholds updated successfully",
        "thresholds": DEFAULT_THRESHOLDS
    }
