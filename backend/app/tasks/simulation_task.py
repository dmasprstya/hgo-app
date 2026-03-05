import uuid
from datetime import datetime, timezone
from celery import Task

from app.core.celery_app import celery_app
from app.core.config import settings


@celery_app.task(bind=True, name="app.tasks.simulation_task.run_hgo_simulation")
def run_hgo_simulation(self: Task, session_id: str):
    """Fetch all patients, run full HGO pipeline, bulk upsert results."""
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import Session

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url)

    with Session(engine) as session:
        try:
            # Update status to running
            session.execute(
                text("UPDATE simulation_sessions SET status='running' WHERE id=:id"),
                {"id": session_id},
            )
            session.commit()

            # Fetch all patients with crisp values
            rows = session.execute(
                text(
                    """
                    SELECT p.id, p.patient_code, p.name,
                           c.code as criteria_code, pcv.raw_value
                    FROM patients p
                    JOIN patient_criteria_values pcv ON pcv.patient_id = p.id
                    JOIN criteria c ON c.id = pcv.criteria_id
                    ORDER BY p.created_at
                    """
                )
            ).fetchall()

            # Group by patient
            from collections import defaultdict
            patient_map = defaultdict(lambda: {"id": None, "patient_code": None, "name": None})
            for row in rows:
                pid = row.id
                patient_map[pid]["id"] = row.id
                patient_map[pid]["patient_code"] = row.patient_code
                patient_map[pid]["name"] = row.name
                patient_map[pid][row.criteria_code] = row.raw_value

            patients = list(patient_map.values())

            from app.utils.hgo import run_full_hgo
            results = run_full_hgo(patients)

            # Bulk upsert hgo_results in batches to update progress
            now = datetime.now(timezone.utc)
            total = len(results)
            batch_size = 500
            processed = 0

            for i in range(0, total, batch_size):
                batch = results[i:i + batch_size]
                upsert_data = [
                    {
                        "id": str(uuid.uuid4()),
                        "patient_id": r["patient_id"],
                        "output_score": r["output_score"],
                        "hgod_index": r["hgod_index"],
                        "rank": r["rank"],
                        "calculated_at": now,
                    }
                    for r in batch
                ]

                for row_data in upsert_data:
                    session.execute(
                        text(
                            """
                            INSERT INTO hgo_results (id, patient_id, output_score, hgod_index, rank, calculated_at)
                            VALUES (:id, :patient_id, :output_score, :hgod_index, :rank, :calculated_at)
                            ON CONFLICT (patient_id) DO UPDATE
                            SET output_score=EXCLUDED.output_score,
                                hgod_index=EXCLUDED.hgod_index,
                                rank=EXCLUDED.rank,
                                calculated_at=EXCLUDED.calculated_at
                            """
                        ),
                        row_data,
                    )
                
                processed += len(batch)
                session.execute(
                    text("UPDATE simulation_sessions SET processed_patients=:p WHERE id=:id"),
                    {"p": processed, "id": session_id},
                )
                session.commit()

            session.execute(
                text(
                    "UPDATE simulation_sessions SET status='completed', total_patients=:t, processed_patients=:t WHERE id=:id"
                ),
                {"t": total, "id": session_id},
            )
            session.commit()

        except Exception as exc:
            session.execute(
                text("UPDATE simulation_sessions SET status='failed' WHERE id=:id"),
                {"id": session_id},
            )
            session.commit()
            raise exc
