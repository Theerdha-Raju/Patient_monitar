from fastapi import APIRouter, HTTPException, Query, status
from datetime import datetime, timezone
from typing import Optional, List
from backend.app.database import query_all, query_one, execute
from backend.app.schemas import AlertReviewPayload

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("/")
@router.get("")
async def get_alerts(
    patient_id: Optional[str] = Query(None),
    unreviewed_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200)
):
    sql = """
        SELECT a.id, a.patient_id, p.name as patient_name, a.metric, a.value, a.severity, 
               a.message, a.acknowledged, a.acknowledged_at, a.timestamp
        FROM alerts a
        LEFT JOIN patients p ON a.patient_id = p.patient_id
    """
    conditions = []
    params = []

    if patient_id:
        conditions.append("a.patient_id = %s")
        params.append(patient_id)
    
    if unreviewed_only:
        conditions.append("a.acknowledged = FALSE")

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    sql += " ORDER BY a.timestamp DESC LIMIT %s"
    params.append(limit)

    rows = query_all(sql, tuple(params))
    
    # Map 'acknowledged' to 'reviewed' for compatibility
    for r in rows:
        r["reviewed"] = bool(r.get("acknowledged"))
        r["reviewed_at"] = r.get("acknowledged_at")

    return {"success": True, "count": len(rows), "data": rows}


@router.patch("/{alert_id}/review/")
@router.patch("/{alert_id}/review")
@router.post("/{alert_id}/acknowledge")
async def review_alert(alert_id: int, payload: Optional[AlertReviewPayload] = None):
    reviewer = payload.reviewed_by if payload and payload.reviewed_by else "Clinical Monitor Operator"
    
    res = execute("""
        UPDATE alerts 
        SET acknowledged = TRUE, acknowledged_at = CURRENT_TIMESTAMP 
        WHERE id = %s
    """, (alert_id,))

    if res == 0:
        raise HTTPException(status_code=404, detail=f"Alert #{alert_id} not found")

    return {
        "success": True,
        "message": f"Alert #{alert_id} successfully marked as reviewed",
        "alert_id": alert_id,
        "reviewed_by": reviewer,
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
