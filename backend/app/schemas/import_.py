from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ImportJobOut(BaseModel):
    job_id: str
    status: str
    filename: str
    total_rows: int
    processed_rows: int
    failed_rows: int
    error_log: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ImportStatusOut(BaseModel):
    job_id: str
    status: str
    total_rows: int
    processed_rows: int
    failed_rows: int
    progress_pct: float
    error_log: Optional[str] = None
