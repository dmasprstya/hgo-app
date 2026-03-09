import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.patient import Patient, PatientCriteriaValue
from app.models.criteria import Criteria
from app.models.result import HGOResult
from app.models.user import User
from app.schemas.patient import (
    PatientCreate, PatientUpdate, PatientOut,
    PaginatedPatients, BulkActionRequest, BulkActionResponse,
)
from app.api.auth import get_current_user
from app.utils.hgo import convert_to_crisp, CRITERIA_ORDER

router = APIRouter()


COLUMN_MAP = {
    "insurance": "Cr1",
    "surgery": "Cr2",
    "room_class": "Cr3",
    "admission_type": "Cr4",
    "severity_score": "Cr5",
    "test_result": "Cr6",
}


async def _build_patient_code(db: AsyncSession) -> str:
    result = await db.execute(select(func.count()).select_from(Patient))
    count = result.scalar() or 0
    return f"P{str(count + 1).zfill(6)}"


async def _save_criteria_values(
    db: AsyncSession, patient_id: str, data: dict, criteria_map: dict
):
    for field, code in COLUMN_MAP.items():
        raw = data.get(field)
        if raw is None:
            continue
        crisp = convert_to_crisp(code, str(raw))
        crit = criteria_map.get(code)
        if not crit:
            continue
        pcv = PatientCriteriaValue(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            criteria_id=crit.id,
            raw_value=str(raw),
            crisp_value=crisp,
        )
        db.add(pcv)


# ── List active patients ─────────────────────────────────────────────────────
@router.get("", response_model=PaginatedPatients)
async def list_patients(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    query = (
        select(Patient)
        .options(selectinload(Patient.hgo_result))
        .where(Patient.deleted_at.is_(None), Patient.status == "active")
    )

    if search:
        query = query.where(
            or_(
                Patient.name.ilike(f"%{search}%"),
                Patient.patient_code.ilike(f"%{search}%"),
            )
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset(offset).limit(limit).order_by(Patient.created_at.desc())
    result = await db.execute(query)
    patients = result.scalars().all()

    return PaginatedPatients(
        data=patients,
        meta={"page": page, "limit": limit, "total": total, "total_pages": -(-total // limit)},
    )


# ── List archived patients ───────────────────────────────────────────────────
@router.get("/archived", response_model=PaginatedPatients)
async def list_archived_patients(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    query = (
        select(Patient)
        .options(selectinload(Patient.hgo_result))
        .where(Patient.deleted_at.is_(None), Patient.status == "archived")
    )

    if search:
        query = query.where(
            or_(
                Patient.name.ilike(f"%{search}%"),
                Patient.patient_code.ilike(f"%{search}%"),
            )
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset(offset).limit(limit).order_by(Patient.created_at.desc())
    result = await db.execute(query)
    patients = result.scalars().all()

    return PaginatedPatients(
        data=patients,
        meta={"page": page, "limit": limit, "total": total, "total_pages": -(-total // limit) if total else 0},
    )


# ── Bulk action (archive / soft-delete) ──────────────────────────────────────
@router.patch("/bulk", response_model=BulkActionResponse)
async def bulk_action(
    body: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate all IDs exist
    result = await db.execute(
        select(Patient).where(Patient.id.in_(body.ids), Patient.deleted_at.is_(None))
    )
    patients = result.scalars().all()

    if len(patients) != len(body.ids):
        found_ids = {p.id for p in patients}
        missing = [pid for pid in body.ids if pid not in found_ids]
        raise HTTPException(
            status_code=404,
            detail=f"Patients not found: {', '.join(missing)}",
        )

    now = datetime.now(timezone.utc)
    for patient in patients:
        if body.action == "archive":
            patient.status = "archived"
            patient.archived_at = now
        elif body.action == "delete":
            patient.deleted_at = now

    await db.commit()
    return BulkActionResponse(success=True, affected=len(patients))


# ── Create patient ───────────────────────────────────────────────────────────
@router.post("", response_model=PatientOut, status_code=201)
async def create_patient(
    body: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    criteria_res = await db.execute(select(Criteria))
    criteria_map = {c.code: c for c in criteria_res.scalars()}

    code = body.patient_code or await _build_patient_code(db)
    patient = Patient(
        id=str(uuid.uuid4()),
        patient_code=code,
        name=body.name,
        age=body.age,
        gender=body.gender,
    )
    db.add(patient)
    await db.flush()
    await _save_criteria_values(db, patient.id, body.model_dump(), criteria_map)
    await db.commit()
    await db.refresh(patient)
    return patient


# ── Get single patient ───────────────────────────────────────────────────────
@router.get("/{patient_id}", response_model=PatientOut)
async def get_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Patient).options(selectinload(Patient.hgo_result)).where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# ── Update patient ───────────────────────────────────────────────────────────
@router.put("/{patient_id}", response_model=PatientOut)
async def update_patient(
    patient_id: str,
    body: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.hgo_result))
        .where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = body.model_dump(exclude_unset=True)
    for field in ("name", "age", "gender"):
        if field in update_data:
            setattr(patient, field, update_data[field])

    criteria_res = await db.execute(select(Criteria))
    criteria_map = {c.code: c for c in criteria_res.scalars()}
    await _save_criteria_values(db, patient.id, update_data, criteria_map)

    await db.commit()

    # Re-fetch with eager load so PatientOut serialization works
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.hgo_result))
        .where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    return patient


# ── Archive patient ──────────────────────────────────────────────────────────
@router.patch("/{patient_id}/archive", response_model=PatientOut)
async def archive_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.hgo_result))
        .where(Patient.id == patient_id, Patient.deleted_at.is_(None))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.status = "archived"
    patient.archived_at = datetime.now(timezone.utc)
    await db.commit()

    # Re-fetch with eager load so PatientOut serialization works
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.hgo_result))
        .where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    return patient


# ── Restore patient ──────────────────────────────────────────────────────────
@router.patch("/{patient_id}/restore", response_model=PatientOut)
async def restore_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.hgo_result))
        .where(Patient.id == patient_id, Patient.deleted_at.is_(None))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.status = "active"
    patient.archived_at = None
    await db.commit()

    # Re-fetch with eager load so PatientOut serialization works
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.hgo_result))
        .where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    return patient


# ── Soft delete patient ──────────────────────────────────────────────────────
@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.deleted_at.is_(None))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.deleted_at = datetime.now(timezone.utc)
    await db.commit()
