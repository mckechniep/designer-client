delete from supabase_migrations.schema_migrations
where version = '20260506111014';

do $$
begin
  if exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'user_role'
  )
  and not exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'app_user_role'
  ) then
    alter type public.user_role rename to app_user_role;
  end if;

  if exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'generation_status'
  )
  and not exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'app_generation_status'
  ) then
    alter type public.generation_status rename to app_generation_status;
  end if;

  if exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'asset_kind'
  )
  and not exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'app_asset_kind'
  ) then
    alter type public.asset_kind rename to app_asset_kind;
  end if;
end $$;

alter type public.app_asset_kind add value if not exists 'palette_light';
alter type public.app_asset_kind add value if not exists 'palette_dark';
alter type public.app_asset_kind add value if not exists 'buttons_light';
alter type public.app_asset_kind add value if not exists 'buttons_dark';
alter type public.app_asset_kind add value if not exists 'icon_mark_light';
alter type public.app_asset_kind add value if not exists 'icon_mark_dark';
alter type public.app_asset_kind add value if not exists 'screen_plain_light';
alter type public.app_asset_kind add value if not exists 'screen_plain_dark';
