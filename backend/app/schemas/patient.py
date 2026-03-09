from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class PatientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    age: int = Field(..., ge=0, le=150)
    gender: str = Field(..., pattern="^(male|female|laki-laki|perempuan)$")
    insurance: str
    surgery: str
    room_class: str
    admission_type: str
    severity_score: str
    test_result: str


class PatientCreate(PatientBase):
    patient_code: Optional[str] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    insurance: Optional[str] = None
    surgery: Optional[str] = None
    room_class: Optional[str] = None
    admission_type: Optional[str] = None
    severity_score: Optional[str] = None
    test_result: Optional[str] = None


class HGOResultOut(BaseModel):
    output_score: float
    hgod_index: float
    rank: int
    calculated_at: datetime

    model_config = {"from_attributes": True}


class PatientOut(BaseModel):
    id: str
    patient_code: str
    name: str
    age: int
    gender: str
    status: str
    created_at: datetime
    archived_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    hgo_result: Optional[HGOResultOut] = None

    model_config = {"from_attributes": True}


class PaginatedPatients(BaseModel):
    status: str = "success"
    data: list[PatientOut]
    meta: dict


class BulkActionRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1)
    action: Literal["archive", "delete"]


class BulkActionResponse(BaseModel):
    success: bool
    affected: int
