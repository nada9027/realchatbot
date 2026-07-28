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
to anon
with check (true);

-- SELECT, UPDATE, DELETE 정책은 만들지 않습니다.
-- 학생 브라우저는 기록을 추가만 할 수 있고, 연구자는 Supabase Dashboard에서 조회합니다.
