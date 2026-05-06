create extension if not exists pgcrypto;

create type public.user_role as enum ('client', 'admin');
create type public.generation_status as enum ('queued', 'running', 'succeeded', 'failed');
create type public.asset_kind as enum ('master_background', 'splash', 'button_preview', 'thumbnail', 'download_package');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'asset-generations',
  'asset-generations',
  false,
  52428800,
  array['image/png', 'image/webp', 'application/zip']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  client_profile_id uuid references public.client_profiles(id) on delete set null,
  role public.user_role not null default 'client',
  email text not null,
  created_at timestamptz not null default now()
);

create table public.generation_limits (
  client_profile_id uuid primary key references public.client_profiles(id) on delete cascade,
  max_generations integer,
  used_generations integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint nonnegative_used_generations check (used_generations >= 0),
  constraint positive_or_unlimited_limit check (max_generations is null or max_generations > 0)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references public.client_profiles(id) on delete cascade,
  name text not null,
  app_category text not null,
  created_by uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.design_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  app_name text not null,
  audience text not null,
  desired_mood text not null,
  liked_colors text[] not null default '{}',
  disliked_colors text[] not null default '{}',
  font_preferences text not null default '',
  reference_links text[] not null default '{}',
  visual_dislikes text not null default '',
  brand_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.design_directions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  summary text not null,
  theme_notes jsonb not null default '{}'::jsonb,
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.asset_generations (
  id uuid primary key default gen_random_uuid(),
  design_direction_id uuid not null references public.design_directions(id) on delete cascade,
  requested_by uuid not null references public.user_profiles(id),
  status public.generation_status not null default 'queued',
  freeform_feedback text not null default '',
  structured_interpretation jsonb not null default '{}'::jsonb,
  prompt text not null,
  provider text not null,
  model text not null,
  counted_against_limit boolean not null default false,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.asset_files (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.asset_generations(id) on delete cascade,
  kind public.asset_kind not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  width integer,
  height integer,
  byte_size integer,
  created_at timestamptz not null default now()
);

create table public.style_specs (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.asset_generations(id) on delete cascade,
  theme_json jsonb not null,
  buttons_json jsonb not null,
  readme text not null,
  created_at timestamptz not null default now()
);

create table public.download_events (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.asset_generations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now()
);

create index user_profiles_client_profile_id_idx on public.user_profiles(client_profile_id);
create index projects_client_profile_id_idx on public.projects(client_profile_id);
create unique index design_briefs_project_id_key on public.design_briefs(project_id);
create index design_directions_project_id_idx on public.design_directions(project_id);
create unique index design_directions_one_selected_per_project_idx
  on public.design_directions(project_id)
  where is_selected;
create index asset_generations_direction_id_idx on public.asset_generations(design_direction_id);
create index asset_files_generation_id_idx on public.asset_files(generation_id);
create index download_events_generation_id_idx on public.download_events(generation_id);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public, auth
as $$
  select role from public.user_profiles where id = auth.uid()
$$;

create or replace function private.current_client_profile_id()
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select client_profile_id from public.user_profiles where id = auth.uid()
$$;

grant execute on function private.current_user_role() to authenticated;
grant execute on function private.current_client_profile_id() to authenticated;

alter table public.client_profiles enable row level security;
alter table public.user_profiles enable row level security;
alter table public.generation_limits enable row level security;
alter table public.projects enable row level security;
alter table public.design_briefs enable row level security;
alter table public.design_directions enable row level security;
alter table public.asset_generations enable row level security;
alter table public.asset_files enable row level security;
alter table public.style_specs enable row level security;
alter table public.download_events enable row level security;

create policy "admins and clients can read client profiles"
on public.client_profiles for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or id = private.current_client_profile_id()
);

create policy "users can read own profile"
on public.user_profiles for select
to authenticated
using (id = (select auth.uid()) or private.current_user_role() = 'admin');

create policy "admins and clients can read generation limits"
on public.generation_limits for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or client_profile_id = private.current_client_profile_id()
);

create policy "admins can insert generation limits"
on public.generation_limits for insert
to authenticated
with check (private.current_user_role() = 'admin');

create policy "admins can update generation limits"
on public.generation_limits for update
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

create policy "admins can delete generation limits"
on public.generation_limits for delete
to authenticated
using (private.current_user_role() = 'admin');

create policy "clients can read own projects"
on public.projects for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or client_profile_id = private.current_client_profile_id()
);

create policy "clients can insert own projects"
on public.projects for insert
to authenticated
with check (
  private.current_user_role() = 'admin'
  or (
    client_profile_id = private.current_client_profile_id()
    and created_by = (select auth.uid())
  )
);

create policy "clients can update own projects"
on public.projects for update
to authenticated
using (
  private.current_user_role() = 'admin'
  or (
    client_profile_id = private.current_client_profile_id()
    and created_by = (select auth.uid())
  )
)
with check (
  private.current_user_role() = 'admin'
  or (
    client_profile_id = private.current_client_profile_id()
    and created_by = (select auth.uid())
  )
);

create policy "clients can read own briefs"
on public.design_briefs for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.projects
    where projects.id = design_briefs.project_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
);

create policy "clients can insert own briefs"
on public.design_briefs for insert
to authenticated
with check (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.projects
    where projects.id = design_briefs.project_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
);

create policy "clients can update own briefs"
on public.design_briefs for update
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.projects
    where projects.id = design_briefs.project_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
)
with check (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.projects
    where projects.id = design_briefs.project_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
);

create policy "clients can read own directions"
on public.design_directions for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.projects
    where projects.id = design_directions.project_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
);

create policy "clients can update selected own directions"
on public.design_directions for update
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.projects
    where projects.id = design_directions.project_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
)
with check (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.projects
    where projects.id = design_directions.project_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
);

create policy "clients can read own generations"
on public.asset_generations for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1
    from public.design_directions
    join public.projects on projects.id = design_directions.project_id
    where design_directions.id = asset_generations.design_direction_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
);

create policy "clients can read own asset files"
on public.asset_files for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1
    from public.asset_generations
    join public.design_directions on design_directions.id = asset_generations.design_direction_id
    join public.projects on projects.id = design_directions.project_id
    where asset_generations.id = asset_files.generation_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
);

create policy "clients can read own style specs"
on public.style_specs for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1
    from public.asset_generations
    join public.design_directions on design_directions.id = asset_generations.design_direction_id
    join public.projects on projects.id = design_directions.project_id
    where asset_generations.id = style_specs.generation_id
    and projects.client_profile_id = private.current_client_profile_id()
  )
);

create policy "clients can insert own download events"
on public.download_events for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    private.current_user_role() = 'admin'
    or exists (
      select 1
      from public.asset_generations
      join public.design_directions on design_directions.id = asset_generations.design_direction_id
      join public.projects on projects.id = design_directions.project_id
      where asset_generations.id = download_events.generation_id
      and projects.client_profile_id = private.current_client_profile_id()
    )
  )
);

create policy "clients can read own download events"
on public.download_events for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or user_id = (select auth.uid())
);
