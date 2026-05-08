alter table public.design_briefs
add column if not exists effect_preference text not null default 'auto';

alter table public.design_briefs
drop constraint if exists design_briefs_effect_preference_check;

alter table public.design_briefs
add constraint design_briefs_effect_preference_check
check (effect_preference in ('auto', 'none', 'subtle', 'expressive'));
