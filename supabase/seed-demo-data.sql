-- =============================================================================
-- Sistem Peminjaman Ruangan Kampus IDB Bali
-- Skema lengkap + seed data demo untuk Supabase production
-- -----------------------------------------------------------------------------
-- Jalankan seluruh berkas ini di Supabase SQL Editor (Project → SQL Editor).
-- Semua perintah menggunakan IF NOT EXISTS / ON CONFLICT, aman diulang berkali-kali.
-- Urutan: extensi → tipe enumerasi → tabel → indeks → fungsi helper → RPC
--         → RLS → seed data demo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ekstensi
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- -----------------------------------------------------------------------------
-- Tipe enumerasi
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('MAHASISWA', 'DOSEN', 'ADMIN', 'SATPAM');
  end if;

  if not exists (select 1 from pg_type where typname = 'room_category') then
    create type public.room_category as enum ('STUDIO_DESAIN', 'LAB_KOMPUTER', 'RUANG_KELAS', 'AULA', 'GALERI');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum ('pending', 'approved', 'rejected', 'checked_in', 'completed', 'cancelled', 'no_show');
  end if;

  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type public.ticket_status as enum ('issued', 'used', 'revoked', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_status') then
    create type public.notification_status as enum ('queued', 'sent', 'failed');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Tabel: pengguna (disinkronkan dari SSO kampus)
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  sso_id text not null unique,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'MAHASISWA',
  organization text,
  is_active boolean not null default true,
  no_show_strikes integer not null default 0 check (no_show_strikes >= 0),
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  constraint users_email_lowercase check (email = lower(email))
);

create index if not exists users_email_idx on public.users (lower(email));
create index if not exists users_role_idx on public.users (role);

-- -----------------------------------------------------------------------------
-- Tabel: ruangan
-- -----------------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category public.room_category not null,
  building text not null,
  floor integer not null check (floor between 1 and 20),
  capacity integer not null check (capacity between 1 and 500),
  facilities text[] not null default '{}',
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint rooms_code_format check (code ~ '^[A-Z0-9-]{3,12}$')
);

-- -----------------------------------------------------------------------------
-- Tabel: pengajuan peminjaman
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  room_id uuid not null references public.rooms (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  organization text,
  event_name text not null check (char_length(event_name) between 5 and 120),
  purpose text not null check (char_length(purpose) between 10 and 1000),
  attendees integer not null check (attendees between 1 and 500),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.booking_status not null default 'pending',
  rejection_reason text,
  decided_by uuid references public.users (id),
  decided_at timestamptz,
  checked_in_at timestamptz,
  checked_in_by uuid references public.users (id),
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_valid check (end_at > start_at),
  constraint bookings_max_duration check (end_at - start_at <= interval '8 hours'),
  constraint bookings_rejection_reason check (
    status <> 'rejected' or (rejection_reason is not null and char_length(rejection_reason) >= 10)
  )
);

alter table public.bookings
  drop constraint if exists bookings_no_overlap;

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status in ('pending', 'approved', 'checked_in'));

create index if not exists bookings_room_start_idx on public.bookings (room_id, start_at);
create index if not exists bookings_user_idx on public.bookings (user_id, start_at desc);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_org_active_idx on public.bookings (organization)
  where status in ('pending', 'approved', 'checked_in');

-- -----------------------------------------------------------------------------
-- Tabel: tiket QR (satu tiket per pengajuan yang disetujui)
-- -----------------------------------------------------------------------------
create table if not exists public.qr_tickets (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  code text not null unique,
  token text not null unique,
  status public.ticket_status not null default 'issued',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.users (id)
);

create index if not exists qr_tickets_code_idx on public.qr_tickets (upper(code));

-- -----------------------------------------------------------------------------
-- Tabel: outbox notifikasi email
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  recipient text not null,
  subject text not null,
  body text not null,
  status public.notification_status not null default 'queued',
  driver text not null default 'mock',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notifications_created_idx on public.notifications (created_at desc);

-- -----------------------------------------------------------------------------
-- Tabel: audit log
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- -----------------------------------------------------------------------------
-- Trigger: updated_at otomatis pada bookings
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at
  before update on public.bookings
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Fungsi helper: kode tiket & penomoran pengajuan
-- -----------------------------------------------------------------------------
create or replace function public.gen_ticket_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, (floor(random() * 32)::integer % 32) + 1, 1);
  end loop;
  return 'IDB-' || substr(result, 1, 4) || '-' || substr(result, 5, 4);
end;
$$;

create or replace function public.gen_booking_code()
returns text
language plpgsql
volatile
as $$
declare
  prefix text := 'BK-' || to_char(now() at time zone 'Asia/Makassar', 'YYMMDD') || '-';
  seq integer;
begin
  select count(*) + 1 into seq
  from public.bookings
  where code like prefix || '%';
  return prefix || lpad(seq::text, 3, '0');
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: buat pengajuan (validasi bentrok atomik)
-- -----------------------------------------------------------------------------
create or replace function public.create_booking(p_booking jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_user public.users;
  v_start timestamptz := (p_booking ->> 'start_at')::timestamptz;
  v_end timestamptz := (p_booking ->> 'end_at')::timestamptz;
  v_slot_date date := ((p_booking ->> 'start_at')::timestamptz at time zone 'Asia/Makassar')::date;
  v_booking public.bookings;
begin
  if v_start is null or v_end is null or v_end <= v_start then
    return jsonb_build_object('ok', false, 'error', 'Rentang waktu peminjaman tidak valid.');
  end if;

  select * into v_user from public.users where id = (p_booking ->> 'user_id')::uuid and is_active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Akun pemohon tidak aktif atau tidak ditemukan.');
  end if;

  select * into v_room from public.rooms where id = (p_booking ->> 'room_id')::uuid and is_active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Ruangan tidak tersedia.');
  end if;

  if (p_booking ->> 'attendees')::integer > v_room.capacity then
    return jsonb_build_object('ok', false, 'error', format('Kapasitas %s hanya %s orang.', v_room.name, v_room.capacity));
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_room.id::text || ':' || v_slot_date::text, 0));

  if exists (
    select 1 from public.bookings b
    where b.room_id = v_room.id
      and b.status in ('pending', 'approved', 'checked_in')
      and b.start_at < v_end
      and v_start < b.end_at
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', format('Slot %s pada jam tersebut sudah dipakai pengajuan lain.', v_room.name)
    );
  end if;

  insert into public.bookings (
    code, room_id, user_id, organization, event_name, purpose, attendees, start_at, end_at, status
  ) values (
    coalesce(nullif(p_booking ->> 'code', ''), public.gen_booking_code()),
    v_room.id,
    v_user.id,
    nullif(p_booking ->> 'organization', ''),
    p_booking ->> 'event_name',
    p_booking ->> 'purpose',
    (p_booking ->> 'attendees')::integer,
    v_start,
    v_end,
    'pending'
  )
  returning * into v_booking;

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
exception
  when exclusion_violation then
    return jsonb_build_object('ok', false, 'error', 'Slot baru saja diambil pengguna lain. Silakan pilih jam atau ruangan lain.');
  when check_violation then
    return jsonb_build_object('ok', false, 'error', 'Data pengajuan tidak lolos validasi. Periksa nama kegiatan, keperluan, dan rentang waktu.');
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: setujui pengajuan + terbitkan tiket QR
-- -----------------------------------------------------------------------------
create or replace function public.approve_booking(p_booking_id uuid, p_admin_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_ticket public.qr_tickets;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pengajuan tidak ditemukan.');
  end if;
  if v_booking.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Hanya pengajuan berstatus menunggu yang dapat disetujui.');
  end if;

  update public.bookings
     set status = 'approved',
         decided_by = p_admin_id,
         decided_at = now()
   where id = v_booking.id
   returning * into v_booking;

  insert into public.qr_tickets (booking_id, code, token, expires_at)
  values (v_booking.id, public.gen_ticket_code(), encode(gen_random_bytes(24), 'hex'), v_booking.end_at)
  returning * into v_ticket;

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking), 'ticket', to_jsonb(v_ticket));
exception
  when exclusion_violation then
    return jsonb_build_object('ok', false, 'error', 'Tidak dapat disetujui: bentrok dengan jadwal yang sudah disetujui.');
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Tiket untuk pengajuan ini sudah pernah diterbitkan.');
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: tolak pengajuan
-- -----------------------------------------------------------------------------
create or replace function public.reject_booking(p_booking_id uuid, p_admin_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  if char_length(coalesce(trim(p_reason), '')) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Alasan penolakan minimal 10 karakter.');
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pengajuan tidak ditemukan.');
  end if;
  if v_booking.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Hanya pengajuan berstatus menunggu yang dapat ditolak.');
  end if;

  update public.bookings
     set status = 'rejected',
         rejection_reason = trim(p_reason),
         decided_by = p_admin_id,
         decided_at = now()
   where id = p_booking_id
   returning * into v_booking;

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: batalkan pengajuan (oleh pemohon)
-- -----------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid, p_user_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pengajuan tidak ditemukan.');
  end if;
  if v_booking.user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Anda tidak berhak membatalkan pengajuan ini.');
  end if;
  if v_booking.status not in ('pending', 'approved') then
    return jsonb_build_object('ok', false, 'error', 'Pengajuan ini tidak dapat dibatalkan lagi.');
  end if;
  if v_booking.start_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'Pembatalan hanya dapat dilakukan sebelum jam mulai.');
  end if;

  update public.bookings
     set status = 'cancelled',
         cancelled_at = now(),
         cancel_reason = trim(p_reason)
   where id = p_booking_id
   returning * into v_booking;

  update public.qr_tickets
     set status = 'revoked'
   where booking_id = p_booking_id and status = 'issued';

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: check-in tiket oleh petugas gedung
-- -----------------------------------------------------------------------------
create or replace function public.check_in_ticket(p_code text, p_officer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_ticket public.qr_tickets;
  v_booking public.bookings;
begin
  select * into v_ticket
  from public.qr_tickets
  where upper(code) = v_code or token = trim(p_code)
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Tiket tidak ditemukan. Periksa kembali kode pada QR.');
  end if;

  select * into v_booking from public.bookings where id = v_ticket.booking_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Tiket tidak terhubung dengan pengajuan mana pun.');
  end if;

  if v_ticket.status = 'revoked' then
    return jsonb_build_object('ok', false, 'error', 'Tiket sudah dicabut karena pengajuan dibatalkan.');
  end if;
  if v_ticket.status = 'used' then
    return jsonb_build_object('ok', false, 'error', 'Tiket sudah pernah digunakan.');
  end if;
  if v_booking.status in ('cancelled', 'no_show', 'completed', 'rejected') then
    return jsonb_build_object('ok', false, 'error', format('Pengajuan berstatus %s.', v_booking.status));
  end if;
  if v_booking.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Tiket belum aktif.');
  end if;

  if now() < v_booking.start_at - interval '45 minutes' then
    return jsonb_build_object('ok', false, 'error', 'Check-in dibuka 45 menit sebelum jam mulai.');
  end if;
  if now() > v_booking.end_at then
    return jsonb_build_object('ok', false, 'error', 'Waktu pemakaian sudah berakhir.');
  end if;

  update public.bookings
     set status = 'checked_in',
         checked_in_at = now(),
         checked_in_by = p_officer_id
   where id = v_booking.id
   returning * into v_booking;

  update public.qr_tickets
     set status = 'used', used_at = now(), used_by = p_officer_id
   where id = v_ticket.id
   returning * into v_ticket;

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking), 'ticket', to_jsonb(v_ticket));
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: lepas slot no-show (dipanggil cron tiap hari pukul 00:00 UTC)
-- -----------------------------------------------------------------------------
create or replace function public.release_no_shows()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  with released as (
    update public.bookings b
       set status = 'no_show'
     where b.status = 'approved'
       and now() > b.start_at + interval '30 minutes'
     returning b.*
  ),
  revoked as (
    update public.qr_tickets t
       set status = 'revoked'
     from released r
    where t.booking_id = r.id and t.status = 'issued'
    returning t.id
  ),
  strikes as (
    update public.users u
       set no_show_strikes = u.no_show_strikes + 1
     from released r
    where u.id = r.user_id
    returning u.id
  )
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows from released r;

  return v_rows;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: tutup sesi yang sudah berakhir
-- -----------------------------------------------------------------------------
create or replace function public.complete_finished()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  with finished as (
    update public.bookings b
       set status = 'completed'
     where b.status in ('approved', 'checked_in')
       and b.end_at <= now()
     returning b.*
  ),
  expired as (
    update public.qr_tickets t
       set status = 'expired'
     from finished f
    where t.booking_id = f.id and t.status = 'issued'
    returning t.id
  )
  select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) into v_rows from finished f;

  return v_rows;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security (lapisan pertahanan tambahan)
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.qr_tickets enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select id from public.users where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users
    where id = public.current_user_id() and role = 'ADMIN' and is_active
  );
$$;

drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users
  for select to authenticated
  using (id = public.current_user_id() or public.is_admin());

drop policy if exists rooms_read on public.rooms;
create policy rooms_read on public.rooms
  for select to authenticated
  using (true);

drop policy if exists bookings_owner_read on public.bookings;
create policy bookings_owner_read on public.bookings
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin() or exists (
    select 1 from public.users where id = public.current_user_id() and role = 'SATPAM'
  ));

drop policy if exists tickets_owner_read on public.qr_tickets;
create policy tickets_owner_read on public.qr_tickets
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = qr_tickets.booking_id
        and (b.user_id = public.current_user_id() or public.is_admin())
    )
  );

drop policy if exists notifications_admin_read on public.notifications;
create policy notifications_admin_read on public.notifications
  for select to authenticated
  using (public.is_admin());

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- Catatan: tidak ada policy INSERT/UPDATE/DELETE untuk klien. Semua mutasi
-- melewati RPC (security definer) atau service role di server Next.js.

-- -----------------------------------------------------------------------------
-- Seed data demo (akun login + katalog ruangan)
-- -----------------------------------------------------------------------------
-- Jalankan bagian ini setelah tabel di atas siap. Idempotent via ON CONFLICT.

-- Pengguna demo
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

-- Katalog ruangan (29 ruangan)
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
