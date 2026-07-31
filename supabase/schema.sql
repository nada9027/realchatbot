create table if not exists public.learning_logs (
  id uuid primary key default gen_random_uuid(),
  research_code text not null,
  class_number text,
  student_number text,
  condition text not null default 'demo',
  session_id text not null,
  event_type text not null check (event_type in ('chat', 'reflection')),
  student_message text,
  ai_message text,
  reflection text,
  prompt_version text,
  created_at timestamptz not null default now()
);

alter table public.learning_logs enable row level security;

drop policy if exists "students can insert logs" on public.learning_logs;
create policy "students can insert logs"
on public.learning_logs
for insert
to anon, authenticated
with check (true);

-- 교사 계정 목록. Supabase Authentication에서 만든 교사의 user id를 등록합니다.
create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'teacher' check (role = 'teacher'),
  created_at timestamptz not null default now()
);

alter table public.teacher_profiles enable row level security;

drop policy if exists "teachers can view own profile" on public.teacher_profiles;
create policy "teachers can view own profile"
on public.teacher_profiles
for select
to authenticated
using (user_id = auth.uid() and role = 'teacher');

drop policy if exists "teachers can view logs" on public.learning_logs;
create policy "teachers can view logs"
on public.learning_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.user_id = auth.uid()
      and teacher_profiles.role = 'teacher'
  )
);

-- 학생용 SELECT, UPDATE, DELETE 정책은 만들지 않습니다.
-- 학생은 기록을 추가만 할 수 있고, 교사는 로그인 후 기록을 조회합니다.
