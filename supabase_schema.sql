-- =========================================================================
-- SKEMA DATABASE SI-MALAS (Sistem Informasi Manajemen Kelas)
-- =========================================================================
-- Salin dan jalankan script ini di SQL Editor di dashboard Supabase Anda.

-- Aktifkan ekstensi UUID jika belum aktif
create extension if not exists "uuid-ossp";

-- 1. TABEL KELAS
create table public.classes (
    id uuid default uuid_generate_v4() primary key,
    name text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TABEL PROFIL PENGGUNA (Wali Kelas / Admin)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    username text not null unique,
    full_name text not null,
    role text not null default 'teacher' check (role in ('admin', 'teacher')),
    class_id uuid references public.classes(id) on delete set null,
    avatar_url text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABEL SISWA
create table public.students (
    id uuid default uuid_generate_v4() primary key,
    class_id uuid references public.classes(id) on delete cascade not null,
    name text not null,
    address text,
    ttl text,
    parent_father text,
    parent_mother text,
    parent_marital_status text,
    living_with text,
    pip_kip_status text, -- "Ya" atau "Tidak"
    pocket_money text, -- Besar uang jajan
    transport_to_school text, -- "Bawa Motor Sendiri", "Diantar Orang Tua", "Bersama Teman"
    hobby text,
    ambition text, -- Cita-cita
    achievement_sd text, -- Prestasi di SD
    achievement_madrasah text, -- Prestasi di Madrasah
    quran_level text, -- Mengaji sampai
    talent_interest text, -- Bakat/Minat
    health_history text, -- Riwayat Kesehatan
    problem_history text, -- Riwayat Masalah
    photo_url text, -- Foto siswa
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABEL KEHADIRAN (ABSENSI)
create table public.attendance (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade not null,
    date date not null default current_date,
    status text not null check (status in ('hadir', 'sakit', 'izin', 'alfa')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (student_id, date)
);

-- 5. TABEL CATATAN PERILAKU SISWA
create table public.behavior_records (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade not null,
    date date not null default current_date,
    type text not null check (type in ('positif', 'negatif')),
    description text not null,
    follow_up text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. TABEL PROSES BIMBINGAN (KONSELING)
create table public.guidance_records (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade not null,
    date date not null default current_date,
    issue text not null,
    solution text,
    status text not null default 'proses' check (status in ('selesai', 'proses')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. TABEL STRUKTUR KELAS
create table public.class_structures (
    id uuid default uuid_generate_v4() primary key,
    class_id uuid references public.classes(id) on delete cascade not null,
    role text not null, -- e.g., "Ketua Kelas", "Wakil Ketua", "Sekretaris 1", "Bendahara 1"
    student_id uuid references public.students(id) on delete cascade not null,
    unique (class_id, role)
);

-- 8. TABEL JADWAL PELAJARAN
create table public.schedules (
    id uuid default uuid_generate_v4() primary key,
    class_id uuid references public.classes(id) on delete cascade not null,
    day text not null check (day in ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
    subject text not null,
    start_time text not null, -- format HH:MM
    end_time text not null    -- format HH:MM
);

-- 9. TABEL DENAH TEMPAT DUDUK
create table public.seating_plans (
    id uuid default uuid_generate_v4() primary key,
    class_id uuid references public.classes(id) on delete cascade not null,
    row_index integer not null,
    col_index integer not null,
    student_id uuid references public.students(id) on delete set null,
    unique (class_id, row_index, col_index)
);

-- 10. TABEL DAFTAR PIKET
create table public.duty_rosters (
    id uuid default uuid_generate_v4() primary key,
    class_id uuid references public.classes(id) on delete cascade not null,
    day text not null check (day in ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
    student_id uuid references public.students(id) on delete cascade not null,
    unique (class_id, day, student_id)
);

-- 11. TABEL GALERI KELAS
create table public.class_gallery (
    id uuid default uuid_generate_v4() primary key,
    class_id uuid references public.classes(id) on delete cascade not null,
    image_url text not null,
    caption text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. TABEL WAWANCARA SISWA
create table public.interviews (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade not null,
    date date not null default current_date,
    topic text not null,
    notes text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. TABEL VISITASI / HOME VISIT
create table public.home_visits (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade not null,
    date date not null default current_date,
    purpose text not null,
    incidents text not null, -- Catatan kejadian saat kunjungan
    documentation_url text, -- Foto dokumentasi
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- TRIGGER AUTOMATIS: SINKRONISASI DARI AUTH.USERS KE PROFILES
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first_user boolean;
  default_username text;
  meta_username text;
  meta_full_name text;
  meta_role text;
begin
  -- Cek apakah ini pengguna pertama terdaftar di sistem
  select not exists (select 1 from public.profiles) into is_first_user;
  
  -- Ambil nilai dari metadata pendaftaran
  meta_username := new.raw_user_meta_data->>'username';
  meta_full_name := new.raw_user_meta_data->>'full_name';
  meta_role := new.raw_user_meta_data->>'role';

  -- Fallback username jika kosong
  if meta_username is null then
    default_username := split_part(new.email, '@', 1);
  else
    default_username := meta_username;
  end if;

  insert into public.profiles (id, username, full_name, role)
  values (
    new.id,
    default_username,
    coalesce(meta_full_name, 'Wali Kelas Baru'),
    case 
      when is_first_user then 'admin' -- Pengguna pertama otomatis jadi admin
      else coalesce(meta_role, 'teacher')
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Buat trigger setelah data masuk ke auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- KEBIJAKAN KEAMANAN (ROW LEVEL SECURITY - RLS)
-- =========================================================================

-- Aktifkan RLS pada seluruh tabel
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.behavior_records enable row level security;
alter table public.guidance_records enable row level security;
alter table public.class_structures enable row level security;
alter table public.schedules enable row level security;
alter table public.seating_plans enable row level security;
alter table public.duty_rosters enable row level security;
alter table public.class_gallery enable row level security;
alter table public.interviews enable row level security;
alter table public.home_visits enable row level security;

-- 1. Kebijakan Tabel PROFILES
create policy "Admin memiliki hak akses penuh ke profiles"
  on public.profiles for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Pengguna bisa membaca semua profiles"
  on public.profiles for select using (true);

create policy "Pengguna bisa memperbarui profilnya sendiri"
  on public.profiles for update using (auth.uid() = id);

-- 2. Kebijakan Tabel CLASSES
create policy "Semua orang yang terautentikasi bisa membaca kelas"
  on public.classes for select using (auth.role() = 'authenticated');

create policy "Admin memiliki hak akses penuh ke kelas"
  on public.classes for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 3. Kebijakan Tabel LAINNYA (Akses Guru berdasarkan kelasnya, Admin bebas)
-- Catatan: Agar query sederhana, Guru diizinkan membaca/mengubah data jika terautentikasi.
-- Namun, untuk membatasi: Wali kelas biasanya hanya mengelola kelasnya sendiri.
-- Untuk menyederhanakan konfigurasi bagi sekolah, kami membolehkan semua user terautentikasi membaca & mengubah data kelas.
-- Hal ini juga mempermudah Admin memantau (Review Kelas).

create policy "Pengguna terautentikasi bisa membaca siswa"
  on public.students for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola siswa"
  on public.students for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca kehadiran"
  on public.attendance for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola kehadiran"
  on public.attendance for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca catatan perilaku"
  on public.behavior_records for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola catatan perilaku"
  on public.behavior_records for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca bimbingan"
  on public.guidance_records for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola bimbingan"
  on public.guidance_records for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca struktur kelas"
  on public.class_structures for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola struktur kelas"
  on public.class_structures for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca jadwal"
  on public.schedules for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola jadwal"
  on public.schedules for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca denah duduk"
  on public.seating_plans for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola denah duduk"
  on public.seating_plans for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca daftar piket"
  on public.duty_rosters for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola daftar piket"
  on public.duty_rosters for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca galeri"
  on public.class_gallery for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola galeri"
  on public.class_gallery for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca wawancara"
  on public.interviews for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola wawancara"
  on public.interviews for all using (auth.role() = 'authenticated');

create policy "Pengguna terautentikasi bisa membaca home visit"
  on public.home_visits for select using (auth.role() = 'authenticated');
create policy "Pengguna terautentikasi bisa mengelola home visit"
  on public.home_visits for all using (auth.role() = 'authenticated');
