# Panduan Menjalankan HGO Discovery Secara Lokal 

Panduan ini menjelaskan cara menjalankan aplikasi SPK HGO Discovery di komputer lokal menggunakan **Docker** (rekomendasi) atau **Manual**.

---

## Opsi 1: Menggunakan Docker (Rekomendasi)
Ini adalah cara tercepat karena Anda tidak perlu menginstal MySQL, Redis, atau Python secara manual di Windows.

### Prasyarat
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) sudah terinstal dan berjalan.

### Langkah-langkah
1. **Salin file environment:**
   ```powershell
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Jalankan aplikasi:**
   ```powershell
   docker-compose up --build
   ```

3. **Akses aplikasi:**
   - **Frontend:** `http://localhost:5173`
   - **Backend API:** `http://localhost:8000`
   - **Swagger Docs:** `http://localhost:8000/docs`

4. **Seed data pasien (Opsional):**
   Jika ingin mengisi data simulasi awal:
   ```powershell
   docker exec -it hgo-backend python seed_standalone.py
   ```

---

## Opsi 2: Manual (Tanpa Docker)
Gunakan opsi ini jika Anda ingin melakukan pengembangan aktif tanpa container.

### Prasyarat
- Python 3.12+
- Node.js 20+
- MySQL (Lokal)
- Redis (Lokal)

### Langkah-langkah
1. **Database:**
   Buat database bernama `spk_hgo` di MySQL Anda (bisa lewat phpMyAdmin atau HeidiSQL).

2. **Backend:**
   ```powershell
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

3. **Frontend:**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

4. **Worker (Celery):**
   ```powershell
   cd backend
   celery -A app.core.celery_app worker --loglevel=info -P solo
   ```

---

## Tech Stack Advice
Aplikasi ini sudah menggunakan stack yang sangat modern dan profesional (**FastAPI + React + MySQL + Redis**). 

**Mengapa stack ini tetap dipertahankan?**
- **FastAPI**: Sangat cepat untuk memproses algoritma HGO yang kompleks secara asynchronous.
- **MySQL**: Sangat umum digunakan dan mudah diatur lewat Laragon/XAMPP.
- **Redis + Celery**: Memisahkan proses "berat" (seperti import Excel atau simulasi ribuan pasien) ke background agar UI tidak lag/hang.
- **Vite**: Build tool tercepat untuk React saat ini.

**Saran Refactoring:**
- Saya telah merefaktorisasi `backend/app/db/session.py` agar secara otomatis mendeteksi apakah koneksi membutuhkan SSL (untuk Supabase/Production) atau tidak (untuk Lokal), sehingga Anda tidak akan lagi terkena error SSL saat menjalankan database di laptop sendiri.
- Saya telah menambahkan `docker-compose.yml` sebagai "wrapper" agar semua layanan (DB, Redis, API, Worker, UI) bisa jalan serentak.
