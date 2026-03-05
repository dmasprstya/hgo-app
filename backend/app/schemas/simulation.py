from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SimulationRunRequest(BaseModel):
    notes: Optional[str] = None


class SimulationSessionOut(BaseModel):
    id: str
    job_id: str
    status: str
    total_patients: int
    processed_patients: int
    notes: Optional[str] = None
    created_at: datetime


class SimulationResultOut(BaseModel):
    patient_id: str
    patient_code: str
    patient_name: str
    output_score: float
    hgod_index: float
    rank: int
    priority_level: str
    calculated_at: datetime


class SimulationStepData(BaseModel):
    crisp_matrix: list[dict]
    normalized_matrix: list[dict]
    output_scores: list[dict]
    hgod_indices: list[dict]
    ranking: list[dict]
