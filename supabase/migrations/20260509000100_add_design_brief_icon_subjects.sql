alter table public.design_briefs
add column if not exists icon_subjects text[] not null default '{}';
