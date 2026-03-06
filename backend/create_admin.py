"""
Create admin user directly in Supabase.
Run once from LOCAL machine:

  cd backend
  pip install passlib[bcrypt]==1.7.4 bcrypt==3.2.2 asyncpg sqlalchemy[asyncio] python-dotenv
  python create_admin.py
"""
import asyncio
import ssl
import uuid
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

# ──────────────────────────────────────────────
# EDIT INI jika perlu ganti email/password admin
ADMIN_EMAIL    = "admin@spk-hgo.local"
ADMIN_PASSWORD = "Admin@123"
ADMIN_NAME     = "Administrator"
# ──────────────────────────────────────────────

# Gunakan DATABASE_URL yang sama dengan Railway (Session Pooler — port 5432)
DATABASE_URL = (
    "postgresql+asyncpg://"
    "postgres.cmtftlzkzomnzyslbsie:hgospksaw123"
    "@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def main():
    print("=== Create Admin User ===")
    print(f"Email    : {ADMIN_EMAIL}")
    print(f"Password : {ADMIN_PASSWORD}")

    hashed = pwd_context.hash(ADMIN_PASSWORD)
    print(f"Hash     : {hashed}")

    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE

    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"ssl": _ssl_ctx},
    )

    async with engine.begin() as conn:
        # Cek apakah user sudah ada
        existing = await conn.execute(
            text("SELECT id, email FROM users WHERE email = :email"),
            {"email": ADMIN_EMAIL},
        )
        row = existing.fetchone()

        if row:
            # Update password saja
            await conn.execute(
                text(
                    "UPDATE users SET hashed_password = :hp, is_active = TRUE "
                    "WHERE email = :email"
                ),
                {"hp": hashed, "email": ADMIN_EMAIL},
            )
            print(f"\n✅ User '{ADMIN_EMAIL}' sudah ada — password di-UPDATE.")
        else:
            # Insert baru
            await conn.execute(
                text(
                    "INSERT INTO users (id, name, email, hashed_password, role, is_active) "
                    "VALUES (:id, :name, :email, :hp, 'admin', TRUE)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "name": ADMIN_NAME,
                    "email": ADMIN_EMAIL,
                    "hp": hashed,
                },
            )
            print(f"\n✅ Admin user '{ADMIN_EMAIL}' berhasil dibuat!")

    await engine.dispose()
    print("\n=== Done. Login dengan credentials di atas. ===")


if __name__ == "__main__":
    asyncio.run(main())
