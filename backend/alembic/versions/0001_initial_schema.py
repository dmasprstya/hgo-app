"""initial schema

Revision ID: 0001
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "doctor", "manager", name="userrole"), nullable=False, server_default="doctor"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # Criteria
    op.create_table(
        "criteria",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("code", sa.String(10), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("type", sa.Enum("positive", "negative", name="criteriatype"), nullable=False),
        sa.Column("weight", sa.Float, nullable=False),
    )

    # Crisp values
    op.create_table(
        "crisp_values",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("criteria_id", sa.String(36), sa.ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("value", sa.Integer, nullable=False),
    )

    # Patients
    op.create_table(
        "patients",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_code", sa.String(20), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("age", sa.Integer, nullable=False),
        sa.Column("gender", sa.String(10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_patients_patient_code", "patients", ["patient_code"])

    # Patient criteria values
    op.create_table(
        "patient_criteria_values",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("criteria_id", sa.String(36), sa.ForeignKey("criteria.id"), nullable=False),
        sa.Column("raw_value", sa.String(100), nullable=False),
        sa.Column("crisp_value", sa.Integer, nullable=False),
    )

    # HGO Results
    op.create_table(
        "hgo_results",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("output_score", sa.Float, nullable=False),
        sa.Column("hgod_index", sa.Float, nullable=False),
        sa.Column("rank", sa.Integer, nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Simulation sessions
    op.create_table(
        "simulation_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("total_patients", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.Enum("pending", "running", "completed", "failed", name="simulationstatus"), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("notes", sa.Text, nullable=True),
    )

    # Import jobs
    op.create_table(
        "import_jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("total_rows", sa.Integer, nullable=False, server_default="0"),
        sa.Column("processed_rows", sa.Integer, nullable=False, server_default="0"),
        sa.Column("failed_rows", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.Enum("pending", "processing", "completed", "failed", name="importjobstatus"), nullable=False, server_default="pending"),
        sa.Column("error_log", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Audit logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=True),
        sa.Column("meta_json", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Seed criteria data
    op.execute("""
        INSERT INTO criteria (id, code, name, type, weight) VALUES
        (gen_random_uuid()::text, 'Cr1', 'Insurance Provider', 'positive', 0.10),
        (gen_random_uuid()::text, 'Cr2', 'Surgery',            'negative', 0.20),
        (gen_random_uuid()::text, 'Cr3', 'Room Class',         'positive', 0.075),
        (gen_random_uuid()::text, 'Cr4', 'Admission Type',     'positive', 0.125),
        (gen_random_uuid()::text, 'Cr5', 'Severity Score',     'positive', 0.20),
        (gen_random_uuid()::text, 'Cr6', 'Test Result',        'positive', 0.15)
        ON CONFLICT (code) DO NOTHING;
    """)

    # Default admin user (password: Admin@123)
    op.execute("""
        INSERT INTO users (id, name, email, hashed_password, role)
        VALUES (
            gen_random_uuid()::text,
            'Administrator',
            'admin@spk-hgo.local',
            '$2b$12$EKf6zQNIL3qPLrKvFiLUNOIwXqf5jQ3rN3TQJc63zUMx1.K/nODMu',
            'admin'
        ) ON CONFLICT (email) DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("import_jobs")
    op.drop_table("simulation_sessions")
    op.drop_table("hgo_results")
    op.drop_table("patient_criteria_values")
    op.drop_table("patients")
    op.drop_table("crisp_values")
    op.drop_table("criteria")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS criteriatype")
    op.execute("DROP TYPE IF EXISTS simulationstatus")
    op.execute("DROP TYPE IF EXISTS importjobstatus")
