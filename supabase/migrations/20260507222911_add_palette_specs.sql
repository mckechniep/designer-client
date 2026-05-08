create table if not exists public.palette_specs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.user_profiles(id),
  status text not null default 'draft',
  source_json jsonb not null default '{}'::jsonb,
  light_json jsonb not null,
  dark_json jsonb not null,
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint palette_specs_status_check check (status in ('draft', 'approved'))
);

create index if not exists palette_specs_project_id_created_at_idx
on public.palette_specs(project_id, created_at desc);

alter table public.palette_specs enable row level security;

drop policy if exists "clients can read own palette specs" on public.palette_specs;
create policy "clients can read own palette specs"
on public.palette_specs for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = palette_specs.project_id
      and (
        private.current_user_role() = 'admin'
        or projects.client_profile_id = private.current_client_profile_id()
      )
  )
);
