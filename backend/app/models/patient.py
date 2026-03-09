import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(10), default="active", server_default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    archived_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    criteria_values: Mapped[list["PatientCriteriaValue"]] = relationship(
        "PatientCriteriaValue", back_populates="patient", cascade="all, delete-orphan"
    )
    hgo_result: Mapped["HGOResult"] = relationship(
        "HGOResult", back_populates="patient", uselist=False, cascade="all, delete-orphan"
    )


class PatientCriteriaValue(Base):
    __tablename__ = "patient_criteria_values"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"))
    criteria_id: Mapped[str] = mapped_column(String(36), ForeignKey("criteria.id"))
    raw_value: Mapped[str] = mapped_column(String(100))
    crisp_value: Mapped[int] = mapped_column(Integer)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="criteria_values")
    criteria: Mapped["Criteria"] = relationship("Criteria", back_populates="patient_values")
