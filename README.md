# Sistem Peminjaman Ruangan Kampus IDB Bali

Portal peminjaman ruangan untuk sivitas **Institut Desain dan Bisnis Bali** — menggantikan alur WhatsApp/surat fisik dengan katalog real-time, pengajuan tervalidasi, persetujuan Sarpras, dan tiket QR untuk check-in di gedung.

Dibangun dengan **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS**, dengan **Supabase/PostgreSQL** sebagai jalur produksi dan **driver demo lokal** agar aplikasi langsung bisa dijalankan tanpa kredensial.

---

## 1. Fitur yang tersedia

| ID PRD | Fitur | Status |
| --- | --- | --- |
| — | Login SSO kampus (mock) + 4 peran: Mahasiswa/UKM, Dosen, Admin Sarpras, Petugas Gedung | ✅ |
| RM-01 | Katalog ruangan dengan filter jenis, kapasitas, fasilitas, dan pencarian | ✅ |
| AV-01 | Grid ketersediaan per tanggal & jam (hijau kosong, kuning diproses, merah terisi) | ✅ |
| AV-03 | Saran ruangan alternatif saat slot yang dipilih bentrok | ✅ |
| BK-01 | Formulir pengajuan lengkap + validasi ketat (Zod + validasi server) | ✅ |
| BK-02 | Anti-double-booking atomik (advisory lock + exclusion constraint) | ✅ |
| BK-03 | Pembatalan mandiri sebelum jam mulai | ✅ |
| AP-01 | Dashboard admin: antrean, setujui, tolak dengan alasan | ✅ |
| AP-02 | Notifikasi email (mock outbox / Resend) + tiket QR otomatis saat disetujui | ✅ |
| US-01 | Modul check-in kode/QR untuk petugas gedung (input manual + pemindaian kamera) | ✅ |
| US-03 | Pelepasan slot otomatis jika tidak check-in 30 menit setelah jam mulai | ✅ |
| RP-02 | Riwayat pengajuan real-time + tiket QR yang dapat dicetak | ✅ |
| RM-02 | Kelola data ruangan (tambah, ubah, aktif/nonaktif) | ✅ |
| RP-01 | Laporan pemanfaatan bulanan + ekspor CSV | ✅ |
| RM-05 | Jam operasional 07.00–21.00 WITA & durasi maksimal per peran | ✅ |
| BK-05 | Mahasiswa/UKM: minimal H-2, maksimal H+7 | ✅ |
| BK-06 | Kuota maksimal 2 pengajuan aktif per UKM | ✅ |
| US-02 | Catatan no-show pada akun pemohon | ✅ (pencatatan; pembekuan otomatis dapat diaktifkan) |

Tambahan yang sudah disiapkan: audit log, health check, endpoint cron, mode demo deterministik, dan UI mobile-first dengan navigasi bawah.

---

## 2. Menjalankan cepat (mode demo lokal)

Prasyarat: **Node.js 20+** (diuji pada Node 24.22) dan npm.

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Buka **http://localhost:3000**.

Tanpa `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`, aplikasi otomatis memakai **driver demo lokal**:

- data disimpan di `.data/db.json` (dibuat otomatis + di-seed saat request pertama);
- katalog awal berisi 29 ruangan kampus: Gedung A/B/C, aula, studio foto, rooftop, inbis, halaman, gedung serba guna, dan Gear Inc;
- penulisan diserialisasi lewat queue sehingga uji anti-bentrok tetap valid;
- banner “Mode demo lokal” tampil di header.

Hapus folder `.data/` untuk mengembalikan data demo ke kondisi awal.

### Akun demo

| Peran | Email | Organisasi |
| --- | --- | --- |
| Mahasiswa/UKM | `putu@idb.ac.id` | UKM Fotografi |
| Mahasiswa/UKM | `ayu@idb.ac.id` | UKM Musik |
| Dosen | `wayan@idb.ac.id` | Prodi Desain Interior |
| Admin Sarpras | `ketut@idb.ac.id` | Sarana Prasarana |
| Petugas Gedung | `made@idb.ac.id` | Keamanan & Gedung |

Kata sandi boleh diisi apa saja — autentikasi SSO disimulasikan. Pilih kartu akun demo di halaman login untuk mengisi email otomatis.

### Alur uji yang disarankan

1. Masuk sebagai **Putu** → `/kalender` → klik sel hijau → formulir terisi otomatis → kirim.
2. Ulangi pengajuan pada ruangan & jam yang sama → sistem menolak dan menampilkan ruangan alternatif.
3. Masuk sebagai **Ketut** → `/admin` → setujui pengajuan → tiket QR terbit.
4. Masuk sebagai **Made** → `/checkin` → ketuk tiket yang diharapkan → Verifikasi → status berubah menjadi check-in. Sebagai alternatif, tekan **Aktifkan kamera** lalu arahkan kamera perangkat ke QR tiket: kodenya terisi otomatis dan verifikasi langsung berjalan.
5. Sebagai **Putu**, buka `/riwayat` → tiket QR dapat dicetak/ditautkan; coba pembatalan pada pengajuan lain.
6. Jalankan `POST /api/cron/release-no-show` (lihat bagian 7) atau tombol **Jalankan pelepasan no-show** di dashboard admin untuk melepas slot kedaluwarsa.

---

## 3. Konfigurasi environment

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `SESSION_SECRET` | Produksi | Kunci HMAC cookie sesi (min. 32 karakter). |
| `CRON_SECRET` | Produksi | Token endpoint cron. |
| `NEXT_PUBLIC_SUPABASE_URL` | Produksi | URL project Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Produksi | Service role key (server-only, jangan diekspos ke klien). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Opsional | Disiapkan untuk integrasi Supabase Auth/klien lain. |
| `EMAIL_DRIVER` | Opsional | `mock` (default) atau `resend`. |
| `RESEND_API_KEY` | Opsional | Diperlukan bila `EMAIL_DRIVER=resend`. |
| `EMAIL_FROM` | Opsional | Alamat pengirim, mis. `noreply@idb.ac.id`. |
| `NEXT_PUBLIC_APP_URL` | Opsional | Base URL untuk tautan verifikasi tiket. |
| `DATA_DIR` | Opsional | Lokasi penyimpanan mode demo (default `./.data`). |

> **Penting:** jangan pernah memakai `SUPABASE_SERVICE_ROLE_KEY` di komponen klien. Kode hanya membacanya di server (`src/lib/db/supabase.ts`).

---

## 4. Struktur proyek

```
src/
├─ app/
│  ├─ (app)/                 # area terautentikasi (shell + navigasi)
│  │  ├─ dashboard/          # beranda adaptif per peran
│  │  ├─ ruangan/            # katalog + detail & jadwal
│  │  ├─ kalender/           # grid ketersediaan seluruh ruangan
│  │  ├─ ajukan/             # formulir pengajuan
│  │  ├─ riwayat/            # riwayat + detail tiket QR
│  │  ├─ admin/              # antrean, ruangan, laporan, notifikasi
│  │  └─ checkin/            # modul petugas gedung
│  ├─ actions/               # server actions (auth, booking, admin, rooms)
│  ├─ api/                   # health, cron, ekspor CSV
│  ├─ login/                 # halaman SSO mock
│  ├─ globals.css            # design token & utilitas
│  └─ layout.tsx
├─ components/
│  ├─ ui/                    # primitif (button, field, modal, badge, …)
│  ├─ booking/               # grid, form, tiket, status
│  ├─ admin/                 # aksi persetujuan & form ruangan
│  ├─ room/                  # kartu ruangan
│  └─ layout/                # app shell + navigasi
├─ lib/
│  ├─ auth/session.ts        # cookie HMAC httpOnly, 8 jam
│  ├─ db/                    # repository + driver local & supabase + seed
│  ├─ services/              # aturan bisnis & query baca
│  ├─ rules.ts               # ambang batas bisnis terpusat
│  ├─ validation.ts          # skema Zod
│  ├─ time.ts                # utilitas WITA (UTC+8)
│  ├─ notifications.ts       # template email + driver
│  ├─ crypto.ts              # token/kode & HMAC (server-only)
│  └─ ticket.ts              # helper tiket aman untuk browser
├─ types/index.ts            # tipe domain & label
└─ middleware.ts             # gerbang sesi
supabase/
├─ migrations/0001_init.sql  # skema + RPC + RLS
└─ seed.sql                  # data awal pengguna & ruangan
```

### Dua driver database

`src/lib/db/index.ts` memilih driver berdasarkan environment:

- **`supabase`** — dipakai jika URL + service role tersedia. Mutasi memakai RPC PL/pgSQL (`create_booking`, `approve_booking`, dst.).
- **`local`** — JSON store untuk pengembangan/UAT. Pemeriksaan bentrok dilakukan di dalam queue tulis sehingga dua request bersamaan tidak bisa lolos.

Antarmuka yang sama (`src/lib/db/repository.ts`) menjaga agar seluruh halaman dan service tidak bergantung pada driver.

---

## 5. Skema database & keamanan

Skema lengkap ada di `supabase/migrations/0001_init.sql`:

- **Tabel:** `users`, `rooms`, `bookings`, `qr_tickets`, `notifications`, `audit_logs`.
- **Anti-bentrok berlapis:**
  - `EXCLUDE USING gist (room_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&) WHERE status IN ('pending','approved','checked_in')` — jaminan terakhir di level database;
  - `pg_advisory_xact_lock` per `room + tanggal` di RPC `create_booking` agar dua request bersamaan antre, bukan saling menimpa;
  - validasi server (Zod, jam operasional, kapasitas, kuota) sebelum RPC dipanggil.
- **Transisi status hanya lewat RPC:** `approve_booking` (sekaligus menerbitkan tiket), `reject_booking`, `cancel_booking`, `check_in_ticket`, `release_no_shows`, `complete_finished`.
- **RLS aktif** untuk semua tabel. Aplikasi mengakses database lewat service role di server; policy `select` disediakan untuk pemilik data/admin bila project dibuka ke Supabase Auth.
- **Audit log** mencatat pembuatan, persetujuan, penolakan, pembatalan, check-in, dan sweep no-show.

### Menyiapkan Supabase

1. Buat project di [supabase.com](https://supabase.com).
2. Jalankan migrasi:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
   atau tempel `supabase/migrations/0001_init.sql` lalu `supabase/seed.sql` di SQL Editor.
3. Isi `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   SESSION_SECRET=<32+ karakter acak>
   CRON_SECRET=<token acak>
   ```
4. Restart `npm run dev`. Banner mode demo akan hilang dan seluruh data tersimpan di PostgreSQL.

---

## 6. Aturan bisnis

Terpusat di `src/lib/rules.ts`:

| Aturan | Nilai |
| --- | --- |
| Jam operasional | 07.00–21.00 WITA |
| Advance mahasiswa/UKM | minimal H-2, maksimal H+7 |
| Horizon dosen | hari ini s.d. H+30 |
| Durasi maksimal | 4 jam (mahasiswa), 6 jam (dosen), 8 jam (admin) |
| Kuota UKM | 2 pengajuan aktif per organisasi |
| Jendela check-in | dibuka 45 menit sebelum mulai |
| No-show | slot dilepas 30 menit setelah jam mulai |
| Target tanggapan admin | ≤ 4 jam kerja |

Status pengajuan:

```
pending ──approve──> approved ──check-in──> checked_in ──end──> completed
   │                    │
   ├──reject──> rejected│
   └──cancel──> cancelled (sebelum jam mulai)

approved ──tidak check-in > 30 menit──> no_show
```

Seluruh perhitungan tanggal/jam memakai **WITA (Asia/Makassar, UTC+8)**; database menyimpan `timestamptz` (UTC) dan UI memformat ulang ke WITA.

---

## 7. API operasional

### Health check

```http
GET /api/health
```

Mengembalikan driver aktif, mode demo, jumlah ruangan, dan waktu server.

### Pelepasan no-show (cron)

```http
GET|POST /api/cron/release-no-show
Authorization: Bearer <CRON_SECRET>
```

atau untuk pengujian lokal:

```bash
curl -X POST "http://localhost:3000/api/cron/release-no-show?secret=dev-cron-token"
```

Respons: jumlah slot yang dilepas dan sesi yang ditutup.

Penjadwalan produksi (pilih salah satu):

- **Vercel Cron** — `vercel.json` sudah menyertakan jadwal tiap hari pukul 00:00 UTC (`0 0 * * *`). Vercel mengirim header `Authorization: Bearer $CRON_SECRET` bila variabel tersebut diatur.
- **cron-job.org / GitHub Actions** — panggil URL di atas tiap hari pukul 00:00 UTC.
- **pg_cron** — buat job SQL yang memanggil `select public.release_no_shows(); select public.complete_finished();`. Catatan: email no-show hanya terkirim bila sweep dipanggil lewat endpoint aplikasi.

### Ekspor laporan

```http
GET /api/reports/export?bulan=2026-10
```

Hanya untuk admin. Menghasilkan CSV (UTF-8 BOM, delimiter koma) berisi seluruh pengajuan pada bulan tersebut.

---

## 8. Detail implementasi penting

- **Sesi:** cookie `idb_session` berisi payload ter-HMAC SHA-256, `httpOnly`, `SameSite=Lax`, `Secure` di produksi, berlaku 8 jam. Middleware hanya memeriksa keberadaan cookie; verifikasi tanda tangan + status user dilakukan di server (`requireUser`).
- **Formulir:** semua form memakai Server Actions + `useActionState`, dengan error per-field, status pending, dan pengisian ulang nilai. Validasi Zod dijalankan di server, ditambah validasi HTML (`required`, `minLength`, `min`, `max`).
- **Modal & dialog:** fokus dikunci, `Escape` menutup, dan fokus dikembalikan ke pemicu.
- **Aksesibilitas:** skip-link, label eksplisit, `aria-current`, status alert, target sentuh ≥ 44 px, kontras teks mengikuti token warna.
- **Responsif:** sidebar pada desktop, bottom navigation pada mobile; grid ketersediaan dapat digeser horizontal dengan kolom ruangan sticky.
- **Tiket QR:** berisi `IDB-TKT:<kode>` dan dapat diverifikasi lewat `/checkin?code=<kode>`. Tiket dapat dicetak (CSS `@media print`).
- **Pemindaian kamera:** pada `/checkin`, tombol **Aktifkan kamera** menyalakan webcam/kamera HP (`getUserMedia`) lalu memindai QR lewat **jsQR** (`src/components/booking/qr-camera-scanner.tsx`). Pustaka dimuat dinamis hanya saat kamera dinyalakan sehingga bundel halaman tetap ringan; frame didekode tiap 120 ms pada lebar maksimum 640 px agar hemat CPU. Hasil pindai dinormalisasi oleh `extractTicketCode()` (`src/lib/ticket.ts`) yang memahami payload `IDB-TKT:<kode>`, tautan `/checkin?code=<kode>`, kode mentah, maupun token — lalu kolom kode tiket terisi dan verifikasi otomatis berjalan (dapat dimatikan lewat sakelar). Kode yang sama diabaikan 4 detik agar tidak memicu verifikasi berulang, dan lampu kamera selalu dimatikan saat kamera dinonaktifkan/ditinggalkan.
- **Email:** template teks lengkap untuk pengajuan, persetujuan (berisi kode tiket), penolakan (alasan), pembatalan, dan no-show. Driver `mock` merekam ke outbox `/admin/notifikasi`.
- **Identitas visual:** logo resmi IDB Bali (fullcolor, marka puzzle teal–oranye + wordmark "IDB BALI") tersimpan di `public/brand/` — `idb-bali-lockup.png` untuk permukaan terang, `idb-bali-lockup-white.png` untuk bidang navy (teks diubah putih, marka tetap berwarna agar kontras), `idb-bali-emblem.png` (marka) untuk favicon, dan `idb-bali-mark.png` untuk ikon Apple/iPad. Semua varian diturunkan dari satu berkas sumber yang sama sehingga identitasnya konsisten. Halaman masuk disusun **vertikal (stacked)**: (1) bar identitas berisi logo IDB Bali + tautan bantuan, (2) section hero dengan foto kampus resmi `public/brand/idb-bali-campus.jpg` sebagai latar utama (`background-size: cover`, `background-position: center`) + gradasi navy gelap, aksen geometris beranimasi halus, headline "Satu Tempat untuk Seluruh Ruang Kampus.", serta tiga kartu fitur, (3) bidang transisi gelombang bercorak Electric Blue menuju (4) section login berlatar warm ivory `#F8F7F2` dengan kartu putih selebar maksimal 440 px (border tipis + shadow lembut, tanpa posisi absolute sehingga halaman dapat di-scroll natural), dan (5) footer informasi bantuan. Seluruh tinggi hero dibuat mengikuti konten (bukan tinggi tetap) sehingga form login selalu terlihat/tergulir dengan normal di ponsel, tablet, maupun desktop. Sumber aset: situs resmi [idbbali.ac.id](https://www.idbbali.ac.id/), logo yang sama dengan [artikel Wikipedia IDB Bali](https://id.wikipedia.org/wiki/Institut_Desain_dan_Bisnis_Bali). Konsep **Midnight Navy × Electric Blue × Warm Ivory**: sidebar/header/hero memakai Midnight Navy `#111827`, interaksi (tombol, tautan, indikator aktif) memakai Electric Blue `#3B82F6`/`#2563EB`, latar utama Warm Ivory `#F8F7F2` dengan kartu putih; status konsisten memakai Emerald `#10B981`, Amber `#F59E0B`, dan Rose `#F43F5E` (varian gelap untuk teks agar kontras teks tetap ≥ 4.5:1).

---

## 9. Perintah

```bash
npm run dev        # server pengembangan
npm run build      # build produksi
npm start          # jalankan hasil build
npm run typecheck  # TypeScript tanpa emit
npm run lint       # ESLint Next.js
```

---

## 10. Batasan & pengembangan lanjutan

- **SSO mock:** autentikasi belum terhubung ke IdP kampus. Untuk produksi, ganti `loginAction` dengan OAuth/OIDC kampus lalu sinkronkan profil ke tabel `users`.
- **Pemindaian kamera:** sudah memakai `jsQR` murni JavaScript (tanpa dependensi native). Catatan produksi: `getUserMedia` hanya jalan di konteks aman (HTTPS) — lewat IP LAN/HTTP, halaman otomatis menampilkan pesan agar petugas mengetik kode manual. Bila ingin deteksi native tanpa JS, `BarcodeDetector` dapat ditambahkan sebagai jalur cepat tanpa mengubah RPC verifikasi.
- **Pembekuan akun karena no-show:** `users.no_show_strikes` sudah dihitung dan ditampilkan, tetapi pembekuan otomatis (`suspended_until`) masih manual melalui admin/SQL.
- **Blokir jadwal (RM-04):** belum ada UI; dapat ditambahkan sebagai tabel `room_blocks` dengan exclusion constraint serupa.
- **Driver demo lokal** tidak ditujukan untuk multi-instance produksi — gunakan Supabase untuk deployment nyata.
