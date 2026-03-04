import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.patient import Patient, PatientCriteriaValue
from app.models.criteria import Criteria
from app.models.result import HGOResult
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientUpdate, PatientOut, PaginatedPatients
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


@router.get("", response_model=PaginatedPatients)
async def list_patients(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    query = select(Patient).options(selectinload(Patient.hgo_result))

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


@router.put("/{patient_id}", response_model=PatientOut)
async def update_patient(
    patient_id: str,
    body: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
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
    await db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    await db.delete(patient)
    await db.commit()
