from pydantic import BaseModel
from typing import Optional


class DashboardSummary(BaseModel):
    total_patients: int
    last_simulation: Optional[str] = None
    avg_hgod_index: Optional[float] = None
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int


class ScatterPoint(BaseModel):
    patient_code: str
    name: str
    output_score: float
    hgod_index: float
    priority_level: str


class DumbbellPoint(BaseModel):
    patient_code: str
    name: str
    output_score: float
    hgod_index: float
    rank: int
