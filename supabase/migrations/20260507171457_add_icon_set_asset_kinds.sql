delete from supabase_migrations.schema_migrations
where version = '20260507171457';

alter type public.app_asset_kind add value if not exists 'icon_set_light';
alter type public.app_asset_kind add value if not exists 'icon_set_dark';
