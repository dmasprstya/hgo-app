"""add status, archived_at, deleted_at to patients

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-07 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("status", sa.String(10), nullable=False, server_default="active"))
    op.add_column("patients", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("patients", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "deleted_at")
    op.drop_column("patients", "archived_at")
    op.drop_column("patients", "status")
