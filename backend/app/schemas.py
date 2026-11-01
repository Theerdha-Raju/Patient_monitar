from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

class ReadingCreate(BaseModel):
    patient_id: str = Field(default="PATIENT-001", description="Patient identifier")
    device_id: str = Field(default="ESP32-001", description="ESP32 telemetry node identifier")
    temperature: float = Field(..., ge=20.0, le=50.0, description="Temperature reading in °C")
    pulse_rate: Optional[float] = Field(default=None, ge=30.0, le=240.0, description="Pulse rate in BPM")
    heart_rate: Optional[float] = Field(default=None, ge=30.0, le=240.0, description="Heart rate alias in BPM")
    spo2: float = Field(..., ge=40.0, le=100.0, description="Estimated blood oxygen saturation percentage")
    timestamp: Optional[str] = Field(default=None, description="ISO reading timestamp")
    is_demo: Optional[bool] = Field(default=False, description="Flag indicating simulated demonstration reading")

    @model_validator(mode='before')
    @classmethod
    def reconcile_pulse_and_heart_rate(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Support both pulse_rate and heart_rate payloads
            pr = data.get("pulse_rate")
            hr = data.get("heart_rate")
            if pr is None and hr is not None:
                data["pulse_rate"] = hr
            elif hr is None and pr is not None:
                data["heart_rate"] = pr
        return data

class ReadingResponse(BaseModel):
    id: Optional[int] = None
    patient_id: str
    device_id: str
    temperature: float
    pulse_rate: float
    heart_rate: float
    spo2: float
    timestamp: str
    is_demo: bool = False
    monitoring_status: Optional[str] = None
    warnings: List[str] = []

class AlertReviewPayload(BaseModel):
    reviewed_by: Optional[str] = Field(default="Healthcare Monitor Operator", description="Name/Role of reviewer")
    notes: Optional[str] = Field(default=None, description="Optional review notes")

class ThresholdsConfig(BaseModel):
    temp_min_normal: float = 36.1
    temp_max_normal: float = 37.2
    temp_warning_max: float = 38.0  # > 38.0 = elevated temperature warning
    pulse_min_normal: float = 60.0
    pulse_max_normal: float = 100.0
    pulse_warning_high: float = 120.0
    spo2_min_normal: float = 95.0
    spo2_warning_low: float = 92.0  # < 92% = low SpO2 warning
    stale_timeout_seconds: int = 30
