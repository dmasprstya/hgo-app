import uuid
import json
import io
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.session import get_db
from app.models.result import ImportJob, ImportJobStatus
from app.models.user import User
from app.schemas.import_ import ImportJobOut, ImportStatusOut
from app.api.auth import get_current_user
from app.core.config import settings

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/csv",
}

EXCEL_TEMPLATE_COLUMNS = [
    "patient_code", "name", "age", "gender",
    "insurance", "surgery", "room_class",
    "admission_type", "severity_score", "test_result",
]


def _determine_mime(content: bytes, filename: str) -> str:
    """MIME detection by magic bytes without python-magic on Windows fallback."""
    try:
        import magic
        return magic.from_buffer(content, mime=True)
    except Exception:
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ("xlsx",):
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if ext in ("xls",):
            return "application/vnd.ms-excel"
        if ext in ("csv",):
            return "text/csv"
        return "application/octet-stream"


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()

    # Size check
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(413, f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    # MIME check
    mime = _determine_mime(content, file.filename or "")
    if mime not in ALLOWED_MIME_TYPES and not (file.filename or "").endswith(".csv"):
        raise HTTPException(415, f"Unsupported file type: {mime}")

    # Detect file extension
    filename = file.filename or "upload.xlsx"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "xlsx"

    # Row count estimate
    import pandas as pd
    buf = io.BytesIO(content)
    if ext in ("xlsx", "xls"):
        df = pd.read_excel(buf)
    else:
        df = pd.read_csv(buf)
    total_rows = len(df)

    # Create job record
    job = ImportJob(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        filename=filename,
        total_rows=total_rows,
        status=ImportJobStatus.pending,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Store file bytes in Redis so Celery worker can access them
    import redis as _redis
    r = _redis.from_url(settings.REDIS_URL)
    redis_key = f"import_file:{job.id}"
    r.set(redis_key, content, ex=3600)  # 1 hour TTL

    # Dispatch Celery task
    from app.tasks.import_task import process_import
    process_import.delay(job.id, ext)

    return {
        "status": "success",
        "data": {
            "job_id": job.id,
            "status": job.status,
            "total_rows": total_rows,
            "filename": job.filename,
        },
    }


@router.get("/status/{job_id}", response_model=ImportStatusOut)
async def import_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check Redis first for live progress
    try:
        from app.core.celery_app import celery_app
        import redis
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        key = f"import_progress:{job_id}"
        progress_json = r.get(key)
        if progress_json:
            data = json.loads(progress_json)
            return ImportStatusOut(
                job_id=job_id,
                status=data.get("status", "processing"),
                total_rows=data.get("total_rows", 0),
                processed_rows=data.get("processed_rows", 0),
                failed_rows=data.get("failed_rows", 0),
                progress_pct=data.get("progress_pct", 0.0),
                error_log=data.get("error_log"),
            )
    except Exception:
        pass

    result = await db.execute(select(ImportJob).where(ImportJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    progress_pct = (
        (job.processed_rows / job.total_rows * 100) if job.total_rows > 0 else 0
    )
    return ImportStatusOut(
        job_id=job.id,
        status=job.status,
        total_rows=job.total_rows,
        processed_rows=job.processed_rows,
        failed_rows=job.failed_rows,
        progress_pct=progress_pct,
        error_log=job.error_log,
    )


@router.get("/template")
async def download_template(current_user: User = Depends(get_current_user)):
    import pandas as pd
    df = pd.DataFrame(columns=EXCEL_TEMPLATE_COLUMNS)
    # Add sample rows
    df.loc[0] = ["P000001", "John Doe", 45, "male", "BPJS", "no", "class2", "emergency", "critical", "abnormal"]
    df.loc[1] = ["P000002", "Jane Doe", 30, "female", "mandiri", "yes", "VIP", "urgent", "moderate", "normal"]

    buf = io.BytesIO()
    df.to_excel(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_import_pasien.xlsx"},
    )


@router.get("/history")
async def import_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(ImportJob)
        .where(ImportJob.user_id == current_user.id)
        .order_by(desc(ImportJob.created_at))
        .offset(offset)
        .limit(limit)
    )
    jobs = result.scalars().all()
    return {"status": "success", "data": [j.__dict__ for j in jobs]}
