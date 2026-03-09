import uuid
import json
import os
from datetime import datetime, timezone
from celery import Task

from app.core.celery_app import celery_app
from app.core.config import settings


def _get_redis():
    import redis
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def _update_progress(r, job_id: str, **kwargs):
    key = f"import_progress:{job_id}"
    r.set(key, json.dumps(kwargs), ex=3600)


@celery_app.task(bind=True, name="app.tasks.import_task.process_import")
def process_import(self: Task, job_id: str, file_path: str):
    """Process Excel/CSV import in 500-row chunks."""
    import pandas as pd
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import Session

    # Sync engine for Celery worker (not async)
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url)

    try:
        r = _get_redis()
    except Exception:
        r = None

    COLUMN_MAP = {
        "insurance": "Cr1",
        "surgery": "Cr2",
        "room_class": "Cr3",
        "admission_type": "Cr4",
        "severity_score": "Cr5",
        "test_result": "Cr6",
    }

    REQUIRED_COLS = [
        "patient_code", "name", "age", "gender",
        "insurance", "surgery", "room_class",
        "admission_type", "severity_score", "test_result",
    ]

    def update_db_job(session, proc, failed, status="processing", error_log=None):
        session.execute(
            text(
                "UPDATE import_jobs SET processed_rows=:p, failed_rows=:f, status=:s"
                + (", error_log=:e" if error_log else "")
                + " WHERE id=:id"
            ),
            {"p": proc, "f": failed, "s": status, "e": error_log, "id": job_id}
            if error_log
            else {"p": proc, "f": failed, "s": status, "id": job_id},
        )
        session.commit()

    try:
        ext = file_path.rsplit(".", 1)[-1].lower()
        if ext in ("xlsx", "xls"):
            # read_excel doesn't support chunksize; read all then chunk manually
            full_df = pd.read_excel(file_path)
            df_iter = (full_df.iloc[i:i + 500] for i in range(0, len(full_df), 500))
        else:
            df_iter = pd.read_csv(file_path, chunksize=500)

        with Session(engine) as session:
            # Load criteria
            criteria_rows = session.execute(text("SELECT id, code FROM criteria")).fetchall()
            criteria_map = {row.code: row.id for row in criteria_rows}

            processed = 0
            failed = 0
            errors = []

            for chunk in df_iter:
                chunk.columns = [c.strip().lower().replace(" ", "_") for c in chunk.columns]

                # Validate required columns
                missing = [c for c in REQUIRED_COLS if c not in chunk.columns]
                if missing:
                    raise ValueError(f"Missing columns: {missing}")

                patient_inserts = []
                pcv_inserts = []

                for _, row in chunk.iterrows():
                    try:
                        code = str(row.get("patient_code", "")).strip()
                        # Skip duplicates
                        existing = session.execute(
                            text("SELECT id FROM patients WHERE patient_code=:c"),
                            {"c": code},
                        ).fetchone()
                        if existing:
                            errors.append(f"Skipped duplicate: {code}")
                            failed += 1
                            continue

                        pid = str(uuid.uuid4())
                        patient_inserts.append({
                            "id": pid,
                            "patient_code": code,
                            "name": str(row.get("name", "")).strip(),
                            "age": int(row.get("age", 0)),
                            "gender": str(row.get("gender", "")).strip(),
                            "created_at": datetime.now(timezone.utc),
                        })

                        from app.utils.hgo import convert_to_crisp
                        for field, cr_code in COLUMN_MAP.items():
                            raw = str(row.get(field, "")).strip()
                            crisp = convert_to_crisp(cr_code, raw)
                            cr_id = criteria_map.get(cr_code)
                            if cr_id:
                                pcv_inserts.append({
                                    "id": str(uuid.uuid4()),
                                    "patient_id": pid,
                                    "criteria_id": cr_id,
                                    "raw_value": raw,
                                    "crisp_value": crisp,
                                })
                        processed += 1
                    except Exception as e:
                        errors.append(str(e))
                        failed += 1

                if patient_inserts:
                    session.execute(
                        text(
                            "INSERT INTO patients (id, patient_code, name, age, gender, created_at) "
                            "VALUES (:id, :patient_code, :name, :age, :gender, :created_at) "
                            "ON CONFLICT (patient_code) DO NOTHING"
                        ),
                        patient_inserts,
                    )
                if pcv_inserts:
                    session.execute(
                        text(
                            "INSERT INTO patient_criteria_values "
                            "(id, patient_id, criteria_id, raw_value, crisp_value) "
                            "VALUES (:id, :patient_id, :criteria_id, :raw_value, :crisp_value)"
                        ),
                        pcv_inserts,
                    )
                session.commit()

                total = processed + failed
                pct = (processed / total * 100) if total > 0 else 0
                if r:
                    _update_progress(
                        r, job_id,
                        status="processing",
                        total_rows=total,
                        processed_rows=processed,
                        failed_rows=failed,
                        progress_pct=pct,
                    )
                update_db_job(session, processed, failed)

            error_log_str = "\n".join(errors[:50]) if errors else None
            update_db_job(session, processed, failed, "completed", error_log_str)
            if r:
                _update_progress(
                    r, job_id,
                    status="completed",
                    total_rows=processed + failed,
                    processed_rows=processed,
                    failed_rows=failed,
                    progress_pct=100.0,
                    error_log=error_log_str,
                )

    except Exception as exc:
        with Session(engine) as session:
            session.execute(
                text("UPDATE import_jobs SET status='failed', error_log=:e WHERE id=:id"),
                {"e": str(exc), "id": job_id},
            )
            session.commit()
        if r:
            _update_progress(r, job_id, status="failed", total_rows=0, processed_rows=0, failed_rows=0, progress_pct=0)
        raise exc
    finally:
        try:
            os.unlink(file_path)
        except Exception:
            pass
