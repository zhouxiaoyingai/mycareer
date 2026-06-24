-- Row Level Security Policies

-- 启用 RLS
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.jds enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.strength_reports enable row level security;
alter table public.applications enable row level security;

-- ============================================================
-- profiles 策略
-- ============================================================
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- ============================================================
-- resumes 策略
-- ============================================================
create policy "Users read own resumes" on public.resumes
  for select using (auth.uid() = user_id);

create policy "Users insert own resumes" on public.resumes
  for insert with check (auth.uid() = user_id);

create policy "Users update own resumes" on public.resumes
  for update using (auth.uid() = user_id);

create policy "Users delete own resumes" on public.resumes
  for delete using (auth.uid() = user_id);

-- ============================================================
-- jds 策略
-- ============================================================
create policy "Users read own jds" on public.jds
  for select using (auth.uid() = user_id);

create policy "Users insert own jds" on public.jds
  for insert with check (auth.uid() = user_id);

create policy "Users update own jds" on public.jds
  for update using (auth.uid() = user_id);

create policy "Users delete own jds" on public.jds
  for delete using (auth.uid() = user_id);

-- ============================================================
-- interviews 策略
-- ============================================================
create policy "Users read own interviews" on public.interviews
  for select using (auth.uid() = user_id);

create policy "Users insert own interviews" on public.interviews
  for insert with check (auth.uid() = user_id);

create policy "Users delete own interviews" on public.interviews
  for delete using (auth.uid() = user_id);

-- ============================================================
-- interview_sessions 策略
-- ============================================================
create policy "Users read own sessions" on public.interview_sessions
  for select using (auth.uid() = user_id);

create policy "Users insert own sessions" on public.interview_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users update own sessions" on public.interview_sessions
  for update using (auth.uid() = user_id);

-- ============================================================
-- strength_reports 策略
-- ============================================================
create policy "Users read own reports" on public.strength_reports
  for select using (auth.uid() = user_id);

create policy "Users insert own reports" on public.strength_reports
  for insert with check (auth.uid() = user_id);

create policy "Users update own reports" on public.strength_reports
  for update using (auth.uid() = user_id);

create policy "Users delete own reports" on public.strength_reports
  for delete using (auth.uid() = user_id);

-- ============================================================
-- applications 策略（仅读）
-- ============================================================
create policy "Users read own applications" on public.applications
  for select using (auth.uid() = user_id);
