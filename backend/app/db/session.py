import ssl as ssl_module
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.config import settings

# SSL context for Supabase/Production
def get_engine_args():
    args = {
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10,
        "echo": settings.DEBUG,
    }
    
    # SSL context handling (optional for some MySQL setups)
    if "ssl" in settings.DATABASE_URL.lower():
        _ssl_ctx = ssl_module.create_default_context()
        _ssl_ctx.check_hostname = False
        _ssl_ctx.verify_mode = ssl_module.CERT_NONE
        args["connect_args"] = {"ssl": _ssl_ctx}
    
    return args

engine = create_async_engine(
    settings.DATABASE_URL,
    **get_engine_args()
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
