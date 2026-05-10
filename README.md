# SPK HGO Discovery 🏥

Sistem Pendukung Keputusan (SPK) untuk prioritas pasien menggunakan algoritma **Honey Badger Optimization (HGO)**. Dibangun dengan FastAPI + React, di-deploy di Railway (backend) dan Vercel (frontend).

[![Backend](https://img.shields.io/badge/Backend-Railway-blueviolet)](https://hgo-discovery-production.up.railway.app)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black)](https://hgo-discovery.vercel.app)

---

## 📐 Arsitektur

```
frontend (React + Vite)          backend (FastAPI + Python)
     │  Vercel                         │  Railway
     │                                 │
     │◄─── HTTPS / REST API ──────────►│
                                       │
                              ┌────────┴────────┐
                              │                 │
                         Supabase         Upstash Redis
                        (PostgreSQL)      (Celery broker)
```

**Tech Stack:**

| Layer     | Teknologi                                         |
|-----------|---------------------------------------------------|
| Frontend  | React 18, Vite, Zustand, Axios, Recharts          |
| Backend   | FastAPI, SQLAlchemy 2 (async), Alembic, Celery    |
| Database  | PostgreSQL via Supabase (Session Pooler port 5432)|
| Cache/MQ  | Redis via Upstash (rediss://)                     |
| Auth      | JWT (access token 15 min + httpOnly refresh cookie 7 hari) |
| Algorithm | HGO — Honey Badger Optimization                   |

---

## 🚀 Memulai (Development Lokal)

### Prasyarat

- Python 3.12+
- Node.js 18+
- PostgreSQL lokal **atau** koneksi ke Supabase

### 1. Clone & setup backend

```bash
git clone https://github.com/dmasprstya/hgo-discovery.git
cd hgo-discovery/backend

# Buat virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Salin dan isi environment variables
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost/spk_hgo
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-min-32-chars
CORS_ORIGINS=http://localhost:5173
ENVIRONMENT=development
```

### 2. Migrasi database

```bash
cd backend
alembic upgrade head
```

> Migrasi akan membuat semua tabel dan insert admin user default serta data kriteria.

### 3. Seed data pasien (opsional, ~5-10 menit)

```bash
python seed_standalone.py
```

### 4. Jalankan backend

```bash
uvicorn app.main:app --reload --port 8000
```

API tersedia di `http://localhost:8000`  
Docs (Swagger): `http://localhost:8000/docs`

### 5. Setup & jalankan frontend

```bash
cd ../frontend
npm install

# Salin env
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Frontend tersedia di `http://localhost:5173`

---

## 🔑 Credentials Default

| Field    | Value                 |
|----------|-----------------------|
| Email    | `admin@spk-hgo.local` |
| Password | `Admin@123`           |
| Role     | `admin`               |

> **Penting:** Ganti password setelah login pertama di production.

---

## 📁 Struktur Project

```
hgo-discovery/
├── backend/
│   ├── app/
│   │   ├── api/             # Route handlers (auth, patients, dashboard, ...)
│   │   ├── core/            # Config, security, logging, Celery
│   │   ├── db/              # SQLAlchemy engine & session
│   │   ├── models/          # ORM models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── tasks/           # Celery background tasks
│   │   ├── utils/           # HGO algorithm, helpers
│   │   └── main.py          # FastAPI app entry point
│   ├── alembic/             # Database migrations
│   ├── seed.py              # Patient seeder (requires full env)
│   ├── seed_standalone.py   # Patient seeder (standalone, minimal deps)
│   ├── create_admin.py      # Script buat/reset admin user
│   ├── requirements.txt
│   ├── railway.toml         # Railway deployment config
│   └── nixpacks.toml
├── agents.md                # Documentation for system & algorithm agents
└── frontend/
    ├── src/
    │   ├── components/      # UI components
    │   ├── pages/           # Halaman (Login, Dashboard, Patients, ...)
    │   ├── services/        # Axios API calls
    │   ├── store/           # Zustand auth store
    │   └── hooks/           # Custom React hooks
    └── vite.config.js
```

---

## 🌐 API Endpoints

| Method | Endpoint                  | Deskripsi                    | Auth |
|--------|---------------------------|------------------------------|------|
| GET    | `/health`                 | Health check (db + redis)    | ❌   |
| POST   | `/api/auth/login`         | Login → set refresh cookie   | ❌   |
| POST   | `/api/auth/refresh`       | Refresh access token         | 🍪   |
| POST   | `/api/auth/logout`        | Hapus refresh cookie         | ✅   |
| GET    | `/api/patients`           | List pasien + HGO ranking    | ✅   |
| POST   | `/api/import`             | Upload file Excel pasien     | ✅   |
| GET    | `/api/import/{id}/status` | Status import job            | ✅   |
| POST   | `/api/simulation`         | Jalankan simulasi HGO        | ✅   |
| GET    | `/api/dashboard/stats`    | KPI & ringkasan dashboard    | ✅   |

---

## ☁️ Deployment

### Backend → Railway

**Environment Variables (Railway):**

```env
DATABASE_URL=postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-X.pooler.supabase.com:5432/postgres
REDIS_URL=rediss://default:TOKEN@HOST:6379
SECRET_KEY=your-production-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=https://your-frontend.vercel.app
ENVIRONMENT=production
```

> ⚠️ Gunakan **Session Pooler (port 5432)**, bukan Transaction Pooler (port 6543). asyncpg + SQLAlchemy membutuhkan prepared statements yang tidak didukung Transaction Pooler.

**Start Command di Railway:**

```
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend → Vercel

**Environment Variables (Vercel):**

```env
VITE_API_URL=https://your-backend.up.railway.app
```

---

## 🔧 Troubleshooting

### `DuplicatePreparedStatementError`
Kamu menggunakan Transaction Pooler (port 6543). Ganti ke **Session Pooler (port 5432)** pada `DATABASE_URL`.

### `passlib bcrypt error` / `module 'bcrypt' has no attribute '__about__'`
Pin bcrypt ke versi lama di `requirements.txt`:
```
bcrypt==3.2.2
```

### Admin user tidak bisa login
Jalankan script reset password:
```bash
cd backend
python create_admin.py
```

### Seed data kosong
Jalankan seeder standalone dari lokal:
```bash
cd backend
python seed_standalone.py
```

---

## 🧠 Algoritma HGO

Kriteria yang digunakan:

| Kode | Nama            | Tipe     | Bobot |
|------|-----------------|----------|-------|
| Cr1  | Insurance       | Positif  | 0.10  |
| Cr2  | Surgery         | Negatif  | 0.20  |
| Cr3  | Room Class      | Positif  | 0.075 |
| Cr4  | Admission Type  | Positif  | 0.125 |
| Cr5  | Severity Score  | Positif  | 0.20  |
| Cr6  | Test Result     | Positif  | 0.15  |

Output: **HGOd Index** (0–1) dan **Ranking** prioritas pasien.

---

## 📄 Lisensi

MIT License — bebas digunakan untuk keperluan akademik dan penelitian.
