import ssl
from celery import Celery
from app.core.config import settings

celery_app = Celery("spk_hgo")

broker_url = settings.celery_broker_url
backend_url = settings.REDIS_URL

celery_config = {
    "broker_url": broker_url,
    "result_backend": backend_url,
    "task_serializer": "json",
    "result_serializer": "json",
    "accept_content": ["json"],
    "timezone": "Asia/Jakarta",
    "enable_utc": True,
    "task_track_started": True,
    "task_acks_late": True,
    "task_always_eager": settings.CELERY_ALWAYS_EAGER,
    "worker_prefetch_multiplier": 1,
    "result_expires": 3600,
    "include": ["app.tasks.import_task", "app.tasks.simulation_task"],
}

if settings.is_redis_ssl:
    celery_config["broker_use_ssl"] = {"ssl_cert_reqs": ssl.CERT_NONE}
    celery_config["redis_backend_use_ssl"] = {"ssl_cert_reqs": ssl.CERT_NONE}

celery_app.config_from_object(celery_config)
