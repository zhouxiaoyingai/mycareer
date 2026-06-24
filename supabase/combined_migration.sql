-- =============================================================
-- SmartCareer - 一次性合并迁移
-- 在 Supabase SQL Editor 直接粘贴运行即可
-- 包含:schema + RLS + 必要 trigger + 可选 seed
-- =============================================================

create extension if not exists "pgcrypto";

-- =============================================================
-- 1. profiles
-- =============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  preferred_lang text not null default 'zh' check (preferred_lang in ('zh', 'en')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================
-- 2. resumes
-- =============================================================
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('standard', 'tailored')),
  source_type text not null check (source_type in ('upload', 'paste')),
  source_file_id text,
  raw_content text not null,
  structured jsonb not null default '{}'::jsonb,
  target_role text,
  parent_id uuid references public.resumes(id) on delete set null,
  provenance jsonb not null default '[]'::jsonb,
  ai_flavor_score numeric(3,2) default 0,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'archived')),
  greeting jsonb,
  jd_id uuid,
  match_analysis jsonb,
  confirmable_items jsonb,
  confirm_completed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resumes_user_id_idx on public.resumes(user_id);
create index if not exists resumes_parent_id_idx on public.resumes(parent_id);
create index if not exists resumes_jd_id_idx on public.resumes(jd_id);

-- =============================================================
-- 3. jds
-- =============================================================
create table if not exists public.jds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  structured jsonb not null default '{}'::jsonb,
  target_role text,
  status text not null default 'draft' check (status in ('draft', 'parsed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jds_user_id_idx on public.jds(user_id);

-- =============================================================
-- 4. interviews
-- =============================================================
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  jd_id uuid not null references public.jds(id) on delete cascade,
  resume_snapshot jsonb not null,
  jd_snapshot jsonb not null,
  question_types text[] not null default '{}',
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'generated' check (status in ('generated', 'in_progress', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists interviews_user_id_idx on public.interviews(user_id);
create index if not exists interviews_resume_id_idx on public.interviews(resume_id);
create index if not exists interviews_jd_id_idx on public.interviews(jd_id);

-- =============================================================
-- 5. interview_sessions
-- =============================================================
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  overall_score numeric(3,2),
  overall_feedback text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists interview_sessions_user_id_idx on public.interview_sessions(user_id);
create index if not exists interview_sessions_interview_id_idx on public.interview_sessions(interview_id);

-- =============================================================
-- 6. strength_reports
-- =============================================================
create table if not exists public.strength_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  report jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists strength_reports_user_id_idx on public.strength_reports(user_id);

-- =============================================================
-- 7. applications (预留)
-- =============================================================
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jd_id uuid references public.jds(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_user_id_idx on public.applications(user_id);

-- =============================================================
-- updated_at 自动更新触发器
-- =============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['profiles','resumes','jds','interviews','interview_sessions','strength_reports','applications']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end$$;

-- =============================================================
-- RLS 启用
-- =============================================================
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.jds enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.strength_reports enable row level security;
alter table public.applications enable row level security;

-- profiles
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- resumes
drop policy if exists "Users read own resumes" on public.resumes;
create policy "Users read own resumes" on public.resumes for select using (auth.uid() = user_id);
drop policy if exists "Users insert own resumes" on public.resumes;
create policy "Users insert own resumes" on public.resumes for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own resumes" on public.resumes;
create policy "Users update own resumes" on public.resumes for update using (auth.uid() = user_id);
drop policy if exists "Users delete own resumes" on public.resumes;
create policy "Users delete own resumes" on public.resumes for delete using (auth.uid() = user_id);

-- jds
drop policy if exists "Users read own jds" on public.jds;
create policy "Users read own jds" on public.jds for select using (auth.uid() = user_id);
drop policy if exists "Users insert own jds" on public.jds;
create policy "Users insert own jds" on public.jds for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own jds" on public.jds;
create policy "Users update own jds" on public.jds for update using (auth.uid() = user_id);
drop policy if exists "Users delete own jds" on public.jds;
create policy "Users delete own jds" on public.jds for delete using (auth.uid() = user_id);

-- interviews
drop policy if exists "Users read own interviews" on public.interviews;
create policy "Users read own interviews" on public.interviews for select using (auth.uid() = user_id);
drop policy if exists "Users insert own interviews" on public.interviews;
create policy "Users insert own interviews" on public.interviews for insert with check (auth.uid() = user_id);
drop policy if exists "Users delete own interviews" on public.interviews;
create policy "Users delete own interviews" on public.interviews for delete using (auth.uid() = user_id);

-- interview_sessions
drop policy if exists "Users read own sessions" on public.interview_sessions;
create policy "Users read own sessions" on public.interview_sessions for select using (auth.uid() = user_id);
drop policy if exists "Users insert own sessions" on public.interview_sessions;
create policy "Users insert own sessions" on public.interview_sessions for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own sessions" on public.interview_sessions;
create policy "Users update own sessions" on public.interview_sessions for update using (auth.uid() = user_id);

-- strength_reports
drop policy if exists "Users read own strength_reports" on public.strength_reports;
create policy "Users read own strength_reports" on public.strength_reports for select using (auth.uid() = user_id);
drop policy if exists "Users insert own strength_reports" on public.strength_reports;
create policy "Users insert own strength_reports" on public.strength_reports for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own strength_reports" on public.strength_reports;
create policy "Users update own strength_reports" on public.strength_reports for update using (auth.uid() = user_id);

-- applications
drop policy if exists "Users read own applications" on public.applications;
create policy "Users read own applications" on public.applications for select using (auth.uid() = user_id);
drop policy if exists "Users insert own applications" on public.applications;
create policy "Users insert own applications" on public.applications for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own applications" on public.applications;
create policy "Users update own applications" on public.applications for update using (auth.uid() = user_id);

-- =============================================================
-- 验证 (可选,运行后能看到 7 个表 + RLS 启用状态)
-- =============================================================
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
