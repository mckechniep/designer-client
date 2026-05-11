alter table public.asset_generations
  add column if not exists provider_response_id text,
  add column if not exists provider_image_id text,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

create index if not exists asset_generations_provider_response_id_idx
on public.asset_generations(provider_response_id)
where provider_response_id is not null;

create index if not exists asset_generations_openai_context_idx
on public.asset_generations(design_direction_id, created_at desc)
where provider = 'openai-responses'
  and status = 'succeeded'
  and provider_response_id is not null;
