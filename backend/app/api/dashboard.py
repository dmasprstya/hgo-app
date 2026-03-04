from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.models.result import HGOResult, SimulationSession
from app.models.patient import Patient
from app.models.user import User
from app.api.auth import get_current_user

router = APIRouter()


def _priority_level(rank: int, total: int) -> str:
    pct = rank / total if total > 0 else 1
    if pct <= 0.25:
        return "Critical"
    if pct <= 0.50:
        return "High"
    if pct <= 0.75:
        return "Medium"
    return "Low"


@router.get("/summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_patients = (await db.execute(select(func.count()).select_from(Patient))).scalar() or 0

    last_session = (
        await db.execute(
            select(SimulationSession)
            .order_by(desc(SimulationSession.created_at))
            .limit(1)
        )
    ).scalar_one_or_none()

    avg_result = (
        await db.execute(select(func.avg(HGOResult.hgod_index)))
    ).scalar()

    total_results = (await db.execute(select(func.count()).select_from(HGOResult))).scalar() or 0

    critical = high = medium = low = 0
    if total_results > 0:
        rows = (await db.execute(select(HGOResult.rank))).scalars().all()
        for r in rows:
            pl = _priority_level(r, total_results)
            if pl == "Critical":
                critical += 1
            elif pl == "High":
                high += 1
            elif pl == "Medium":
                medium += 1
            else:
                low += 1

    return {
        "status": "success",
        "data": {
            "total_patients": total_patients,
            "last_simulation": last_session.created_at.isoformat() if last_session else None,
            "avg_hgod_index": round(avg_result, 6) if avg_result else None,
            "critical_count": critical,
            "high_count": high,
            "medium_count": medium,
            "low_count": low,
        },
    }


@router.get("/scatter-data")
async def scatter_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(
            select(HGOResult, Patient)
            .join(Patient, HGOResult.patient_id == Patient.id)
            .order_by(HGOResult.rank.asc())
        )
    ).all()
    total = len(rows)
    data = [
        {
            "patient_code": p.patient_code,
            "name": p.name,
            "output_score": h.output_score,
            "hgod_index": h.hgod_index,
            "priority_level": _priority_level(h.rank, total),
        }
        for h, p in rows
    ]
    return {"status": "success", "data": data}


@router.get("/dumbbell-data")
async def dumbbell_data(
    sample: int = Query(20, ge=5, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(
            select(HGOResult, Patient)
            .join(Patient, HGOResult.patient_id == Patient.id)
            .order_by(HGOResult.rank.asc())
            .limit(sample)
        )
    ).all()
    data = [
        {
            "patient_code": p.patient_code,
            "name": p.name,
            "output_score": h.output_score,
            "hgod_index": h.hgod_index,
            "rank": h.rank,
        }
        for h, p in rows
    ]
    return {"status": "success", "data": data}


@router.get("/ranking")
async def ranking(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(
            select(HGOResult, Patient)
            .join(Patient, HGOResult.patient_id == Patient.id)
            .order_by(HGOResult.rank.asc())
            .limit(limit)
        )
    ).all()
    total = (await db.execute(select(func.count()).select_from(HGOResult))).scalar() or 0
    data = [
        {
            "rank": h.rank,
            "patient_code": p.patient_code,
            "name": p.name,
            "output_score": h.output_score,
            "hgod_index": h.hgod_index,
            "priority_level": _priority_level(h.rank, total),
        }
        for h, p in rows
    ]
    return {"status": "success", "data": data}
