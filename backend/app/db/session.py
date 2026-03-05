import ssl as ssl_module
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Supabase Transaction Pooler (port 6543) requires SSL
_ssl_ctx = ssl_module.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl_module.CERT_NONE

engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args={"ssl": _ssl_ctx},  # Required for Supabase
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
