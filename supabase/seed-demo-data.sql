-- =============================================================================
-- Seed data demo (akun login + katalog ruangan) untuk Supabase production
-- Sistem Peminjaman Ruangan Kampus IDB Bali
-- -----------------------------------------------------------------------------
-- Jalankan berkas ini di Supabase SQL Editor (Project → SQL Editor).
-- Idempotent: aman dijalankan berulang kali (ON CONFLICT).
-- pgcrypto (gen_random_uuid) sudah diaktifkan oleh migrasi 0001_init.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pengguna demo (sinkron dengan akun di src/lib/db/seed.ts)
-- -----------------------------------------------------------------------------
insert into public.users (
  id, sso_id, email, full_name, role, organization, is_active,
  no_show_strikes, suspended_until, created_at
) values
  (gen_random_uuid(), '246120940004', 'putu@idb.ac.id',  'Putu Anindya',                    'MAHASISWA', 'UKM Fotografi',                    true, 0, null, now()),
  (gen_random_uuid(), '246120940021', 'ayu@idb.ac.id',   'Ayu Lestari',                          'MAHASISWA', 'UKM Musik',                          true, 0, null, now()),
  (gen_random_uuid(), '198804122010', 'wayan@idb.ac.id', 'Wayan Sudarma, S.Ds., M.Ds.',          'DOSEN',   'Program Studi Desain Interior',    true, 0, null, now()),
  (gen_random_uuid(), '198203102008', 'ketut@idb.ac.id', 'Ketut Ariani',                         'ADMIN',   'Sarana Prasarana',                   true, 0, null, now()),
  (gen_random_uuid(), '199001012015', 'made@idb.ac.id',  'Made Sujana',                          'SATPAM',  'Keamanan & Gedung',                  true, 0, null, now())
on conflict (email) do update set
  sso_id = excluded.sso_id,
  full_name = excluded.full_name,
  role = excluded.role,
  organization = excluded.organization,
  is_active = excluded.is_active;

-- -----------------------------------------------------------------------------
-- Katalog ruangan demo (29 ruangan, sinkron dengan src/lib/db/seed.ts)
-- -----------------------------------------------------------------------------
insert into public.rooms (
  id, code, name, category, building, floor, capacity,
  facilities, description, is_active, created_at
) values
  (gen_random_uuid(), 'A11',  'A.1.1 (STUDIO POLA)',                        'STUDIO_DESAIN', 'Gedung A', 1, 24, ARRAY['AC','Papan Tulis','Wi-Fi'], 'Studio pola untuk praktik pembuatan pola, pemotongan bahan, dan kerja tekstil.', true, now()),
  (gen_random_uuid(), 'A12',  'A.1.2 (LECT 1A)',                            'RUANG_KELAS',   'Gedung A', 1, 40, ARRAY['AC','Proyektor','Papan Tulis','Wi-Fi'], 'Ruang kuliah dengan proyektor dan papan tulis untuk kegiatan belajar mengajar.', true, now()),
  (gen_random_uuid(), 'A13',  'A.1.3 (LAB 1C)',                             'LAB_KOMPUTER',  'Gedung A', 1, 32, ARRAY['AC','Komputer','Wi-Fi'], 'Laboratorium komputer dengan workstation untuk praktik dan tugas mata kuliah.', true, now()),
  (gen_random_uuid(), 'A21',  'A.2.1 (LAB 2B)',                             'LAB_KOMPUTER',  'Gedung A', 2, 32, ARRAY['AC','Komputer','Wi-Fi'], 'Laboratorium komputer dengan workstation untuk praktik dan tugas mata kuliah.', true, now()),
  (gen_random_uuid(), 'A22',  'A.2.2 (LAB 2C)',                             'LAB_KOMPUTER',  'Gedung A', 2, 32, ARRAY['AC','Komputer','Wi-Fi'], 'Laboratorium komputer dengan workstation untuk praktik dan tugas mata kuliah.', true, now()),
  (gen_random_uuid(), 'A23',  'A.2.3 (LECT 2D)',                            'RUANG_KELAS',   'Gedung A', 2, 40, ARRAY['AC','Proyektor','Papan Tulis','Wi-Fi'], 'Ruang kuliah dengan proyektor dan papan tulis untuk kegiatan belajar mengajar.', true, now()),
  (gen_random_uuid(), 'B21',  'B.2.1 (INTERNATIONAL)',                      'RUANG_KELAS',   'Gedung B', 2, 36, ARRAY['AC','Proyektor','Papan Tulis','Wi-Fi'], 'Ruang kuliah dengan proyektor dan papan tulis untuk kegiatan belajar mengajar.', true, now()),
  (gen_random_uuid(), 'B13',  'B.1.3 (STUDIO 3)',                           'STUDIO_DESAIN', 'Gedung B', 1, 24, ARRAY['AC','Papan Tulis','Wi-Fi'], 'Studio kerja untuk praktik, diskusi, dan presentasi karya mahasiswa.', true, now()),
  (gen_random_uuid(), 'B14',  'B.1.4 (LAB FASHION)',                        'STUDIO_DESAIN', 'Gedung B', 1, 24, ARRAY['AC','Papan Tulis','Wi-Fi'], 'Laboratorium mode untuk praktik menjahit, fitting, dan produksi busana.', true, now()),
  (gen_random_uuid(), 'C11',  'C.1.1 (LAB 1A)',                             'LAB_KOMPUTER',  'Gedung C', 1, 32, ARRAY['AC','Komputer','Wi-Fi'], 'Laboratorium komputer dengan workstation untuk praktik dan tugas mata kuliah.', true, now()),
  (gen_random_uuid(), 'C12',  'C.1.2 (LAB STI)',                            'LAB_KOMPUTER',  'Gedung C', 1, 32, ARRAY['AC','Komputer','Wi-Fi'], 'Laboratorium komputer dengan workstation untuk praktik dan tugas mata kuliah.', true, now()),
  (gen_random_uuid(), 'C13',  'C.1.3 (LECT 1)',                             'RUANG_KELAS',   'Gedung C', 1, 40, ARRAY['AC','Proyektor','Papan Tulis','Wi-Fi'], 'Ruang kuliah dengan proyektor dan papan tulis untuk kegiatan belajar mengajar.', true, now()),
  (gen_random_uuid(), 'C21',  'C.2.1 (LECT 2A)',                            'RUANG_KELAS',   'Gedung C', 2, 40, ARRAY['AC','Proyektor','Papan Tulis','Wi-Fi'], 'Ruang kuliah dengan proyektor dan papan tulis untuk kegiatan belajar mengajar.', true, now()),
  (gen_random_uuid(), 'C22',  'C.2.2 (LECT 2B)',                            'RUANG_KELAS',   'Gedung C', 2, 40, ARRAY['AC','Proyektor','Papan Tulis','Wi-Fi'], 'Ruang kuliah dengan proyektor dan papan tulis untuk kegiatan belajar mengajar.', true, now()),
  (gen_random_uuid(), 'C23',  'C.2.3 (STUDIO 2C)',                          'STUDIO_DESAIN', 'Gedung C', 2, 24, ARRAY['AC','Papan Tulis','Wi-Fi'], 'Studio kerja untuk praktik, diskusi, dan presentasi karya mahasiswa.', true, now()),
  (gen_random_uuid(), 'C31',  'C.3.1 (STUDIO 3A)',                          'STUDIO_DESAIN', 'Gedung C', 3, 24, ARRAY['AC','Papan Tulis','Wi-Fi'], 'Studio kerja untuk praktik, diskusi, dan presentasi karya mahasiswa.', true, now()),
  (gen_random_uuid(), 'C32',  'C.3.2 (STUDIO 3B)',                          'STUDIO_DESAIN', 'Gedung C', 3, 24, ARRAY['AC','Papan Tulis','Wi-Fi'], 'Studio kerja untuk praktik, diskusi, dan presentasi karya mahasiswa.', true, now()),
  (gen_random_uuid(), 'C33',  'C.3.3 (STUDIO 3C)',                          'STUDIO_DESAIN', 'Gedung C', 3, 24, ARRAY['AC','Papan Tulis','Wi-Fi'], 'Studio kerja untuk praktik, diskusi, dan presentasi karya mahasiswa.', true, now()),
  (gen_random_uuid(), 'AULA-01', 'AULA IDB BALI',                          'AULA',          'Gedung C', 1, 250, ARRAY['AC','Proyektor','Sound System','Wi-Fi'], 'Aula utama untuk seminar, wisuda, pameran, dan kegiatan sivitas kampus.', true, now()),
  (gen_random_uuid(), 'FOTO-01', 'STUDIO FOTO IDB BALI',                   'STUDIO_DESAIN', 'Gedung B', 1, 20, ARRAY['AC','Wi-Fi'], 'Studio foto dengan ruang kontrol cahaya untuk pemotretan produk dan portofolio.', true, now()),
  (gen_random_uuid(), 'ROOF-01', 'ROOFTOP IDB BALI',                       'AULA',          'Gedung C', 3, 100, ARRAY['Sound System','Wi-Fi'], 'Area rooftop untuk gathering, screening, dan kegiatan komunitas kampus.', true, now()),
  (gen_random_uuid(), 'INBIS-01', 'INBIS IDB BALI',                        'RUANG_KELAS',   'Gedung B', 2, 40, ARRAY['AC','Proyektor','Papan Tulis','Wi-Fi'], 'Ruang inkubasi bisnis untuk mentoring, presentasi, dan kerja kolaboratif.', true, now()),
  (gen_random_uuid(), 'HAL-A',  'HALAMAN IDB BALI GEDUNG A',               'AULA',          'Gedung A', 1, 100, ARRAY['Sound System'], 'Area terbuka di Gedung A untuk kegiatan luar ruang, bazar, dan gathering.', true, now()),
  (gen_random_uuid(), 'HAL-B',  'HALAMAN IDB BALI GEDUNG B',               'AULA',          'Gedung B', 1, 100, ARRAY['Sound System'], 'Area terbuka di Gedung B untuk kegiatan luar ruang dan pameran.', true, now()),
  (gen_random_uuid(), 'HAL-C',  'HALAMAN IDB BALI GEDUNG C',               'AULA',          'Gedung C', 1, 100, ARRAY['Sound System'], 'Area terbuka di Gedung C untuk kegiatan luar ruang dan gathering.', true, now()),
  (gen_random_uuid(), 'GSG-1',  'GEDUNG SERBA GUNA IDB BALI - Lt.1',       'AULA',          'Gedung Serba Guna', 1, 150, ARRAY['Sound System','Wi-Fi'], 'Gedung serbaguna lantai 1 untuk kegiatan akademik dan kemahasiswaan.', true, now()),
  (gen_random_uuid(), 'GSG-2',  'GEDUNG SERBA GUNA IDB BALI - Lt.2',       'AULA',          'Gedung Serba Guna', 2, 150, ARRAY['Sound System','Wi-Fi'], 'Gedung serbaguna lantai 2 untuk kegiatan akademik dan kemahasiswaan.', true, now()),
  (gen_random_uuid(), 'GSG-3',  'GEDUNG SERBA GUNA IDB BALI - Lt.3',       'AULA',          'Gedung Serba Guna', 3, 150, ARRAY['Sound System','Wi-Fi'], 'Gedung serbaguna lantai 3 untuk kegiatan akademik dan kemahasiswaan.', true, now()),
  (gen_random_uuid(), 'GEAR-01','GEDUNG B (Gear inc)',                     'RUANG_KELAS',   'Gedung B', 1, 40, ARRAY['AC','Proyektor','Papan Tulis','Wi-Fi'], 'Ruang kolaborasi bersama Gear Inc untuk program kemitraan dan workshop.', true, now())
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  building = excluded.building,
  floor = excluded.floor,
  capacity = excluded.capacity,
  facilities = excluded.facilities,
  description = excluded.description,
  is_active = excluded.is_active;

-- -----------------------------------------------------------------------------
-- Selesai. Akun demo siap digunakan untuk login di produksi:
--   putu@idb.ac.id  (MAHASISWA)   ayu@idb.ac.id      (MAHASISWA)
--   wayan@idb.ac.id (DOSEN)       ketut@idb.ac.id    (ADMIN)
--   made@idb.ac.id  (SATPAM)
-- Kata sandi demo dapat diisi apa saja (mode demo / autentikasi kustom).
-- =============================================================================
