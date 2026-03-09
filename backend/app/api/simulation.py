import uuid
import io
import math
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.result import SimulationSession, SimulationStatus, HGOResult
from app.models.patient import Patient, PatientCriteriaValue
from app.models.criteria import Criteria
from app.models.user import User
from app.schemas.simulation import SimulationRunRequest, SimulationResultOut
from app.api.auth import get_current_user

router = APIRouter()

PRIORITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


def _priority_level(rank: int, total: int) -> str:
    pct = rank / total if total > 0 else 1
    if pct <= 0.25:
        return "Critical"
    if pct <= 0.50:
        return "High"
    if pct <= 0.75:
        return "Medium"
    return "Low"


@router.post("/run")
async def run_simulation(
    body: SimulationRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Count patients
    count_result = await db.execute(
        select(func.count()).select_from(Patient).where(Patient.deleted_at.is_(None))
    )
    total = count_result.scalar() or 0
    if total == 0:
        raise HTTPException(400, "No patients found. Import data first.")

    session = SimulationSession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        total_patients=total,
        status=SimulationStatus.pending,
        notes=body.notes,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    from app.tasks.simulation_task import run_hgo_simulation
    run_hgo_simulation.delay(session.id)

    return {
        "status": "success",
        "data": {
            "job_id": session.id,
            "status": session.status,
            "total_patients": total,
        },
    }


@router.get("/status/{job_id}")
async def simulation_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(SimulationSession).where(SimulationSession.id == job_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Simulation session not found")
    return {
        "status": "success",
        "data": {
            "job_id": session.id,
            "status": session.status,
            "total_patients": session.total_patients,
            "processed_patients": session.processed_patients,
            "notes": session.notes,
            "created_at": session.created_at.isoformat(),
        },
    }


@router.get("/results")
async def simulation_results(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    sort: str = Query("rank", regex="^(rank|hgod_index|output_score)$"),
    priority: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit

    # Dynamic sort mapping
    sort_map = {
        "rank": HGOResult.rank.asc(),
        "hgod_index": HGOResult.hgod_index.asc(),
        "output_score": HGOResult.output_score.desc(),
    }
    order = sort_map.get(sort, HGOResult.rank.asc())

    q = (
        select(HGOResult, Patient)
        .join(Patient, HGOResult.patient_id == Patient.id)
        .order_by(order)
    )

    # Total count for priority boundary calculation
    all_count_q = select(func.count()).select_from(HGOResult)
    all_total = (await db.execute(all_count_q)).scalar() or 0

    # Early return if no simulation data
    if all_total == 0:
        return {
            "status": "success",
            "data": [],
            "meta": {"page": page, "limit": limit, "total": 0, "total_pages": 0},
        }

    # Priority filter via SQL rank range
    if priority:
        bounds = {"Critical": (0, 0.25), "High": (0.25, 0.50), "Medium": (0.50, 0.75), "Low": (0.75, 1.0)}
        lo_pct, hi_pct = bounds.get(priority, (0, 1))
        rank_lo = math.floor(all_total * lo_pct) + 1
        rank_hi = math.floor(all_total * hi_pct)
        if priority == "Low":
            rank_hi = all_total  # include last patient
        q = q.where(HGOResult.rank.between(rank_lo, rank_hi))

    # Count after filter
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.offset(offset).limit(limit)
    rows = (await db.execute(q)).all()

    results = []
    for hgo, patient in rows:
        pl = _priority_level(hgo.rank, all_total)
        results.append(SimulationResultOut(
            patient_id=patient.id,
            patient_code=patient.patient_code,
            patient_name=patient.name,
            output_score=hgo.output_score,
            hgod_index=hgo.hgod_index,
            rank=hgo.rank,
            priority_level=pl,
            calculated_at=hgo.calculated_at,
        ))

    return {
        "status": "success",
        "data": results,
        "meta": {"page": page, "limit": limit, "total": total, "total_pages": -(-total // limit) if total > 0 else 0},
    }


@router.get("/export")
async def export_results(
    format: str = Query("xlsx", regex="^(xlsx|csv)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import pandas as pd

    q = (
        select(HGOResult, Patient)
        .join(Patient, HGOResult.patient_id == Patient.id)
        .order_by(HGOResult.rank.asc())
    )
    rows = (await db.execute(q)).all()
    total = len(rows)

    data = []
    for hgo, patient in rows:
        data.append({
            "Rank": hgo.rank,
            "Patient Code": patient.patient_code,
            "Name": patient.name,
            "Age": patient.age,
            "Gender": patient.gender,
            "Output Score": hgo.output_score,
            "HGOd Index": hgo.hgod_index,
            "Priority Level": _priority_level(hgo.rank, total),
            "Calculated At": hgo.calculated_at.isoformat(),
        })

    df = pd.DataFrame(data)
    buf = io.BytesIO()
    if format == "xlsx":
        df.to_excel(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=hgo_results.xlsx"},
        )
    else:
        csv_data = df.to_csv(index=False)
        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=hgo_results.csv"},
        )
