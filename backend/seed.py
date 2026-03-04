"""
Seeder — 3310 patients, seed=42, idempotent.
Run: python seed.py
"""
import uuid
import random
import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.utils.hgo import run_full_hgo, CRITERIA_ORDER

random.seed(42)

CRITERIA_VALUES = {
    "Cr1": ["governance insurance", "independent"],
    "Cr2": ["no", "yes"],
    "Cr3": ["class3", "class2", "class1", "vip", "vvip"],
    "Cr4": ["urgent", "emergency"],
    "Cr5": ["mild", "moderate", "severe", "critical"],
    "Cr6": ["normal", "abnormal"],
}

FIRST_NAMES = [
    "Budi", "Siti", "Andi", "Dewi", "Rizki", "Rina", "Ahmad", "Sri",
    "Hendra", "Wulan", "Fajar", "Lestari", "Dian", "Eko", "Yudi",
    "Nur", "Reza", "Fitri", "Bagus", "Indah",
]
LAST_NAMES = [
    "Santoso", "Wijaya", "Kusuma", "Pratama", "Setiawan", "Rahayu",
    "Purnama", "Hidayat", "Susanto", "Lestari", "Nugroho", "Wahyudi",
    "Saputra", "Permata", "Kurniawan",
]

COLUMN_MAP = {
    "Cr1": "insurance",
    "Cr2": "surgery",
    "Cr3": "room_class",
    "Cr4": "admission_type",
    "Cr5": "severity_score",
    "Cr6": "test_result",
}


async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=5)
    AsyncSession_ = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSession_() as session:
        # Fetch criteria
        crit_rows = (await session.execute(text("SELECT id, code FROM criteria"))).fetchall()
        if not crit_rows:
            print("ERROR: No criteria found. Run 'alembic upgrade head' first.")
            return
        criteria_map = {row.code: row.id for row in crit_rows}

        inserted = skipped = 0
        patients_for_hgo = []

        print("Generating 3310 patients...")
        for i in range(1, 3311):
            code = f"P{str(i).zfill(6)}"
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            age = random.randint(18, 90)
            gender = random.choice(["male", "female"])
            pid = str(uuid.uuid4())

            # Try insert
            result = await session.execute(
                text(
                    "INSERT INTO patients (id, patient_code, name, age, gender, created_at) "
                    "VALUES (:id, :code, :name, :age, :gender, :now) "
                    "ON CONFLICT (patient_code) DO NOTHING RETURNING id"
                ),
                {"id": pid, "code": code, "name": name, "age": age,
                 "gender": gender, "now": datetime.now(timezone.utc)},
            )
            row = result.fetchone()
            if not row:
                skipped += 1
                continue

            actual_pid = row[0]
            cr_data = {}
            for cr_code in CRITERIA_ORDER:
                val = random.choice(CRITERIA_VALUES[cr_code])
                cr_data[cr_code] = val
                crit_id = criteria_map.get(cr_code)
                if crit_id:
                    from app.utils.hgo import convert_to_crisp
                    crisp = convert_to_crisp(cr_code, val)
                    await session.execute(
                        text(
                            "INSERT INTO patient_criteria_values "
                            "(id, patient_id, criteria_id, raw_value, crisp_value) "
                            "VALUES (:id, :pid, :cid, :raw, :crisp)"
                        ),
                        {"id": str(uuid.uuid4()), "pid": actual_pid,
                         "cid": crit_id, "raw": val, "crisp": crisp},
                    )

            patients_for_hgo.append({"id": actual_pid, "patient_code": code, "name": name, **cr_data})
            inserted += 1

            if i % 500 == 0:
                await session.commit()
                print(f"  Progress: {i}/3310")

        await session.commit()
        print(f"Inserted {inserted} new, skipped {skipped} existing.")

        if patients_for_hgo:
            print("Running HGO simulation on new patients...")
            results = run_full_hgo(patients_for_hgo)
            now = datetime.now(timezone.utc)
            for r in results:
                await session.execute(
                    text(
                        "INSERT INTO hgo_results (id, patient_id, output_score, hgod_index, rank, calculated_at) "
                        "VALUES (:id, :pid, :out, :hgo, :rank, :now) "
                        "ON CONFLICT (patient_id) DO UPDATE "
                        "SET output_score=EXCLUDED.output_score, hgod_index=EXCLUDED.hgod_index, "
                        "rank=EXCLUDED.rank, calculated_at=EXCLUDED.calculated_at"
                    ),
                    {"id": str(uuid.uuid4()), "pid": r["patient_id"],
                     "out": r["output_score"], "hgo": r["hgod_index"],
                     "rank": r["rank"], "now": now},
                )
            await session.commit()
            print(f"HGO results saved for {len(results)} patients.")

    print("Seeder complete.")


if __name__ == "__main__":
    asyncio.run(main())
