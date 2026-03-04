import uuid
from sqlalchemy import String, Float, Enum as SAEnum, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import enum


class CriteriaType(str, enum.Enum):
    positive = "positive"
    negative = "negative"


class Criteria(Base):
    __tablename__ = "criteria"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(10), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[CriteriaType] = mapped_column(SAEnum(CriteriaType))
    weight: Mapped[float] = mapped_column(Float)

    crisp_values: Mapped[list["CrispValue"]] = relationship(
        "CrispValue", back_populates="criteria", cascade="all, delete-orphan"
    )
    patient_values: Mapped[list["PatientCriteriaValue"]] = relationship(
        "PatientCriteriaValue", back_populates="criteria"
    )


class CrispValue(Base):
    __tablename__ = "crisp_values"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    criteria_id: Mapped[str] = mapped_column(String(36), ForeignKey("criteria.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(100))
    value: Mapped[int] = mapped_column(Integer)

    criteria: Mapped["Criteria"] = relationship("Criteria", back_populates="crisp_values")
