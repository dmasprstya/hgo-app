import ssl
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "SPK HGO Discovery"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "mysql+aiomysql://root:@127.0.0.1/spk_hgo"

    # Redis / Celery
    REDIS_URL: str = "redis://127.0.0.1:6379"

    # JWT
    SECRET_KEY: str = "change-me-to-a-32-char-secret-key!!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Celery
    CELERY_ALWAYS_EAGER: bool = True  # Default to True for easier local development

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    # File upload
    MAX_UPLOAD_SIZE_MB: int = 10

    # Celery broker SSL (needed for Upstash rediss://)
    @property
    def is_redis_ssl(self) -> bool:
        return self.REDIS_URL.startswith("rediss://")

    @property
    def celery_broker_url(self) -> str:
        return self.REDIS_URL

    @property
    def celery_broker_use_ssl(self):
        if self.is_redis_ssl:
            return {"ssl_cert_reqs": ssl.CERT_NONE}
        return None


settings = Settings()
