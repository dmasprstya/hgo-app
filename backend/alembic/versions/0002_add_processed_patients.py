"""add_processed_patients_to_simulation

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-05 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("simulation_sessions", sa.Column("processed_patients", sa.Integer, nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("simulation_sessions", "processed_patients")
