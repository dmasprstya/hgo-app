"""
Standalone seeder — 3310 patients untuk MySQL/Supabase.
Tidak butuh install full backend deps.

Run dari folder backend/:
  1. python -m venv .venv
  2. .venv\Scripts\activate
  3. pip install aiomysql "sqlalchemy[asyncio]" 
  4. python seed_standalone.py

Estimasi waktu: 5-15 menit.
"""
import uuid
import random
import asyncio
import ssl
import traceback
import os
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

# ────────────────────────────────────────────────────────────────
# DATABASE URL (Default to local MySQL)
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+aiomysql://root:@localhost:3306/spk_hgo")
# ────────────────────────────────────────────────────────────────

random.seed(42)

CRITERIA_ORDER = ["Cr1", "Cr2", "Cr3", "Cr4", "Cr5", "Cr6"]

CRITERIA_VALUES = {
    "Cr1": ["governance insurance", "independent"],
    "Cr2": ["no", "yes"],
    "Cr3": ["class3", "class2", "class1", "vip", "vvip"],
    "Cr4": ["urgent", "emergency"],
    "Cr5": ["mild", "moderate", "severe", "critical"],
    "Cr6": ["normal", "abnormal"],
}

# Mapping crisp values (sama seperti di app/utils/hgo.py)
CRISP_MAP = {
    "Cr1": {"governance insurance": 2, "independent": 1},
    "Cr2": {"no": 2, "yes": 1},
    "Cr3": {"class3": 1, "class2": 2, "class1": 3, "vip": 4, "vvip": 5},
    "Cr4": {"urgent": 1, "emergency": 2},
    "Cr5": {"mild": 1, "moderate": 2, "severe": 3, "critical": 4},
    "Cr6": {"normal": 1, "abnormal": 2},
}

WEIGHTS = {
    "Cr1": 0.10, "Cr2": 0.20, "Cr3": 0.075,
    "Cr4": 0.125, "Cr5": 0.20, "Cr6": 0.15,
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


def run_hgo(patients):
    """Simple HGO calculation — returns list of {patient_id, output_score, hgod_index, rank}"""
    if not patients:
        return []

    criteria = CRITERIA_ORDER
    n = len(patients)

    # Build matrix
    matrix = []
    for p in patients:
        row = [CRISP_MAP[c].get(p.get(c, ""), 1) for c in criteria]
        matrix.append(row)

    # Normalize
    col_sums = [sum(row[j] for row in matrix) for j in range(len(criteria))]
    norm = []
    for row in matrix:
        norm.append([row[j] / col_sums[j] if col_sums[j] else 0 for j in range(len(criteria))])

    # Weighted
    weighted = []
    for row in norm:
        weighted.append([row[j] * WEIGHTS[criteria[j]] for j in range(len(criteria))])

    # Output scores
    scores = [sum(row) for row in weighted]
    max_score = max(scores) if scores else 1

    results = []
    for i, p in enumerate(patients):
        hgod = scores[i] / max_score if max_score else 0
        results.append({
            "patient_id": p["id"],
            "output_score": scores[i],
            "hgod_index": hgod,
        })

    # Rank by hgod_index descending
    results.sort(key=lambda x: x["hgod_index"], reverse=True)
    for rank, r in enumerate(results, 1):
        r["rank"] = rank

    return results


async def main():
    print("=== SPK HGO Standalone Seeder ===")

    engine_args = {
        "echo": False,
        "pool_size": 5,
    }
    
    if "postgresql" in DATABASE_URL:
        _ssl_ctx = ssl.create_default_context()
        _ssl_ctx.check_hostname = False
        _ssl_ctx.verify_mode = ssl.CERT_NONE
        engine_args["connect_args"] = {"ssl": _ssl_ctx}

    engine = create_async_engine(DATABASE_URL, **engine_args)
    AsyncSession_ = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("Connecting to database...")
    async with AsyncSession_() as session:
        # Check criteria table
        try:
            crit_rows = (await session.execute(text("SELECT id, code FROM criteria"))).fetchall()
        except Exception as e:
            print(f"ERROR: Cannot query criteria table: {e}")
            raise

        if not crit_rows:
            print("ERROR: No criteria found. Alembic migration belum run.")
            return

        criteria_map = {row.code: row.id for row in crit_rows}
        print(f"Found {len(crit_rows)} criteria: {list(criteria_map.keys())}")

        inserted = skipped = 0
        patients_for_hgo = []

        print("Generating 3310 patients...")
        for i in range(1, 3311):
            code = f"P{str(i).zfill(6)}"
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            age = random.randint(18, 90)
            gender = random.choice(["male", "female"])
            pid = str(uuid.uuid4())

            if "postgresql" in DATABASE_URL:
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
            else:
                # MySQL approach
                try:
                    result = await session.execute(
                        text(
                            "INSERT IGNORE INTO patients (id, patient_code, name, age, gender, created_at) "
                            "VALUES (:id, :code, :name, :age, :gender, :now)"
                        ),
                        {"id": pid, "code": code, "name": name, "age": age,
                         "gender": gender, "now": datetime.now(timezone.utc)},
                    )
                    if result.rowcount == 0:
                        # Row was ignored, fetch the existing ID
                        res = await session.execute(
                            text("SELECT id FROM patients WHERE patient_code = :code"),
                            {"code": code}
                        )
                        row = res.fetchone()
                        if row:
                            actual_pid = row[0]
                            skipped += 1
                        else:
                            skipped += 1
                            continue
                    else:
                        actual_pid = pid
                except Exception:
                    skipped += 1
                    continue
            cr_data = {}
            for cr_code in CRITERIA_ORDER:
                val = random.choice(CRITERIA_VALUES[cr_code])
                cr_data[cr_code] = val
                crit_id = criteria_map.get(cr_code)
                if crit_id:
                    crisp = CRISP_MAP[cr_code].get(val, 1)
                    sql = "INSERT INTO patient_criteria_values (id, patient_id, criteria_id, raw_value, crisp_value) VALUES (:id, :pid, :cid, :raw, :crisp)"
                    if "postgresql" in DATABASE_URL:
                        sql += " ON CONFLICT DO NOTHING"
                    else:
                        sql = sql.replace("INSERT INTO", "INSERT IGNORE INTO")
                        
                    await session.execute(
                        text(sql),
                        {"id": str(uuid.uuid4()), "pid": actual_pid,
                         "cid": crit_id, "raw": val, "crisp": crisp},
                    )

            patients_for_hgo.append({"id": actual_pid, "patient_code": code, "name": name, **cr_data})
            inserted += 1

            if i % 500 == 0:
                await session.commit()
                print(f"  Progress: {i}/3310 (inserted={inserted}, skipped={skipped})")

        await session.commit()
        print(f"Patients: inserted={inserted}, skipped={skipped}")

        if patients_for_hgo:
            print(f"Running HGO on {len(patients_for_hgo)} patients...")
            results = run_hgo(patients_for_hgo)
            now = datetime.now(timezone.utc)
            for r in results:
                if "postgresql" in DATABASE_URL:
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
                else:
                    # MySQL approach
                    await session.execute(
                        text(
                            "INSERT INTO hgo_results (id, patient_id, output_score, hgod_index, `rank`, calculated_at) "
                            "VALUES (:id, :pid, :out, :hgo, :rank, :now) "
                            "ON DUPLICATE KEY UPDATE "
                            "output_score=VALUES(output_score), hgod_index=VALUES(hgod_index), "
                            "`rank`=VALUES(`rank`), calculated_at=VALUES(calculated_at)"
                        ),
                        {"id": str(uuid.uuid4()), "pid": r["patient_id"],
                         "out": r["output_score"], "hgo": r["hgod_index"],
                         "rank": r["rank"], "now": now},
                    )
            await session.commit()
            print(f"HGO results saved for {len(results)} patients.")

    await engine.dispose()
    print("=== SEEDER COMPLETE ===")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        print("=== SEEDER FAILED ===")
        traceback.print_exc()
        raise
