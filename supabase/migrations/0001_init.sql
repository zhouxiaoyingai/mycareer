-- CloudBase → Supabase Schema Migration
-- 7 表 + 触发器

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles (替代 cloudbase users 表)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  preferred_lang text not null default 'zh' check (preferred_lang in ('zh', 'en')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- resumes
-- ============================================================
create table public.resumes (
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

create index resumes_user_id_idx on public.resumes(user_id);
create index resumes_parent_id_idx on public.resumes(parent_id);
create index resumes_jd_id_idx on public.resumes(jd_id);

-- ============================================================
-- jds
-- ============================================================
create table public.jds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  structured jsonb not null default '{}'::jsonb,
  target_role text,
  status text not null default 'draft' check (status in ('draft', 'parsed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jds_user_id_idx on public.jds(user_id);

-- ============================================================
-- interviews
-- ============================================================
create table public.interviews (
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

create index interviews_user_id_idx on public.interviews(user_id);
create index interviews_resume_id_idx on public.interviews(resume_id);
create index interviews_jd_id_idx on public.interviews(jd_id);

-- ============================================================
-- interview_sessions
-- ============================================================
create table public.interview_sessions (
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

create index interview_sessions_user_id_idx on public.interview_sessions(user_id);
create index interview_sessions_interview_id_idx on public.interview_sessions(interview_id);

-- ============================================================
-- strength_reports
-- ============================================================
create table public.strength_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  report jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index strength_reports_user_id_idx on public.strength_reports(user_id);

-- ============================================================
-- applications (预留，暂不实装)
-- ============================================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jd_id uuid references public.jds(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_id_idx on public.applications(user_id);

-- ============================================================
-- updated_at 自动更新触发器
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

create trigger jds_set_updated_at
  before update on public.jds
  for each row execute function public.set_updated_at();

create trigger interviews_set_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

create trigger interview_sessions_set_updated_at
  before update on public.interview_sessions
  for each row execute function public.set_updated_at();

create trigger strength_reports_set_updated_at
  before update on public.strength_reports
  for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();
