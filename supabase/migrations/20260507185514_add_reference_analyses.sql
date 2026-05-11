delete from supabase_migrations.schema_migrations
where version = '20260507185514';

create table if not exists public.reference_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_urls text[] not null default '{}',
  status text not null default 'skipped',
  analysis_json jsonb not null default '{}'::jsonb,
  summary text not null default '',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists reference_analyses_project_id_idx
  on public.reference_analyses(project_id);

alter table public.reference_analyses enable row level security;

drop policy if exists "clients can read own reference analyses" on public.reference_analyses;
create policy "clients can read own reference analyses"
on public.reference_analyses for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.projects
    where projects.id = reference_analyses.project_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
);
