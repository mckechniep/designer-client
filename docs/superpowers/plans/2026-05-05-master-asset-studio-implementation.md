# Master Asset Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 Master Asset Studio portal where clients can create mobile asset projects, generate/refine static master assets, download export packages, and stay within a 50-generation cap unless marked unlimited.

**Architecture:** Use a Next.js App Router application with server actions for authenticated mutations, Supabase for auth/database/storage, and a provider adapter around image generation. The first working path uses a mock image provider so the portal, limits, downloads, and admin controls are testable before enabling the real image provider.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, Zod, Vitest, Playwright, JSZip, Sharp, OpenAI Images API behind an adapter.

---

## Source Spec

- `docs/superpowers/specs/2026-05-05-master-asset-studio-design.md`

## Implementation Notes

- Current repo is greenfield except for docs.
- Supabase tables in `public` must have RLS enabled.
- Store role and cap decisions in application tables, not user-editable auth metadata.
- The UI is an app portal, not a landing page.
- OpenAI image generation currently supports large portrait sizes such as `2160x3840` for `gpt-image-2`; keep the app data model flexible so future providers can store larger masters.
- A generation only counts when usable image assets are produced.
- The mock provider must stay available for tests and local development.

## File Structure

Create this structure:

```text
.
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── supabase/
│   └── migrations/
│       └── 20260505000100_master_asset_studio.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx
│   │   ├── login/
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── logout/
│   │   │   └── route.ts
│   │   ├── projects/
│   │   │   ├── actions.ts
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [projectId]/
│   │   │       ├── generate/actions.ts
│   │   │       ├── page.tsx
│   │   │       └── download/route.ts
│   │   └── admin/
│   │       ├── actions.ts
│   │       └── page.tsx
│   ├── components/
│   │   ├── admin/client-table.tsx
│   │   ├── assets/asset-preview.tsx
│   │   ├── briefs/brief-form.tsx
│   │   ├── generation/direction-picker.tsx
│   │   ├── generation/feedback-form.tsx
│   │   ├── generation/generation-counter.tsx
│   │   ├── layout/app-shell.tsx
│   │   ├── projects/project-card.tsx
│   │   └── ui/button.tsx
│   ├── lib/
│   │   ├── auth/require-user.ts
│   │   ├── env.ts
│   │   ├── generation/derivatives.ts
│   │   ├── generation/download-package.ts
│   │   ├── generation/limits.ts
│   │   ├── generation/mock-provider.ts
│   │   ├── generation/openai-provider.ts
│   │   ├── generation/prompt.ts
│   │   ├── generation/provider.ts
│   │   ├── generation/provider-selector.ts
│   │   ├── generation/types.ts
│   │   ├── supabase/client.ts
│   │   ├── supabase/server.ts
│   │   └── supabase/types.ts
│   └── proxy.ts
└── tests/
    ├── generation/download-package.test.ts
    ├── generation/env.test.ts
    ├── generation/limits.test.ts
    ├── generation/prompt.test.ts
    └── e2e/auth-and-projects.spec.ts
```

---

### Task 1: Scaffold The Next.js App

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create the app scaffold**

Run:

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Expected: Next.js files are created in the repo root.

- [ ] **Step 2: Install runtime and test dependencies**

Run:

```bash
npm install @supabase/ssr @supabase/supabase-js zod jszip sharp openai
npm install -D vitest @vitest/coverage-v8 playwright @playwright/test
```

Expected: dependencies are added to `package.json`.

- [ ] **Step 3: Replace `package.json` scripts**

Set scripts to:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
```

- [ ] **Step 5: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

- [ ] **Step 6: Add environment example**

Create `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ASSET_BUCKET=asset-generations
GENERATION_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-2
INTERNAL_UNLIMITED_EMAILS=
```

- [ ] **Step 7: Replace the default home page**

Create `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/projects");
}
```

- [ ] **Step 8: Run baseline checks**

Run:

```bash
npm run typecheck
npm run test
```

Expected: both commands pass.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs vitest.config.ts playwright.config.ts .env.example src
git commit -m "chore: scaffold master asset studio app"
```

---

### Task 2: Add Environment And Supabase Clients

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/proxy.ts`
- Test: `tests/generation/env.test.ts`

- [ ] **Step 1: Write failing env tests**

Create `tests/generation/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("defaults to the mock generation provider", () => {
    const env = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
      ASSET_BUCKET: "asset-generations",
    });

    expect(env.GENERATION_PROVIDER).toBe("mock");
  });

  it("accepts openai as a provider", () => {
    const env = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
      ASSET_BUCKET: "asset-generations",
      GENERATION_PROVIDER: "openai",
      OPENAI_API_KEY: "sk-test",
    });

    expect(env.GENERATION_PROVIDER).toBe("openai");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test -- tests/generation/env.test.ts
```

Expected: FAIL because `@/lib/env` does not exist.

- [ ] **Step 3: Implement env parsing**

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ASSET_BUCKET: z.string().min(1).default("asset-generations"),
  GENERATION_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_IMAGE_MODEL: z.string().min(1).default("gpt-image-2"),
  INTERNAL_UNLIMITED_EMAILS: z.string().default(""),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv | Record<string, string | undefined>): AppEnv {
  const parsed = envSchema.parse(input);

  if (parsed.GENERATION_PROVIDER === "openai" && !parsed.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when GENERATION_PROVIDER=openai");
  }

  return parsed;
}

export const env = parseEnv(process.env);
```

- [ ] **Step 4: Implement browser Supabase client**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
```

- [ ] **Step 5: Implement server Supabase clients**

Create `src/lib/supabase/server.ts`:

```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

export function createServiceSupabaseClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server admin operations");
  }

  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
```

- [ ] **Step 6: Add Proxy session refresh**

Create `src/proxy.ts`:

```ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```bash
npm run test -- tests/generation/env.test.ts
npm run typecheck
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add .env.example src/lib/env.ts src/lib/supabase src/proxy.ts tests/generation/env.test.ts
git commit -m "chore: add environment and supabase clients"
```

---

### Task 3: Add Database Schema And RLS

**Files:**
- Create: `supabase/migrations/20260505000100_master_asset_studio.sql`
- Create: `src/lib/supabase/types.ts`

- [ ] **Step 1: Create the migration SQL**

Create `supabase/migrations/20260505000100_master_asset_studio.sql`:

```sql
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
create index design_briefs_project_id_idx on public.design_briefs(project_id);
create index design_directions_project_id_idx on public.design_directions(project_id);
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

create policy "admins can read all client profiles"
on public.client_profiles for select
to authenticated
using (private.current_user_role() = 'admin');

create policy "clients can read own client profile"
on public.client_profiles for select
to authenticated
using (id = private.current_client_profile_id());

create policy "users can read own profile"
on public.user_profiles for select
to authenticated
using (id = auth.uid() or private.current_user_role() = 'admin');

create policy "admins can manage generation limits"
on public.generation_limits for all
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

create policy "clients can read own generation limits"
on public.generation_limits for select
to authenticated
using (client_profile_id = private.current_client_profile_id());

create policy "clients can manage own projects"
on public.projects for all
to authenticated
using (
  private.current_user_role() = 'admin'
  or client_profile_id = private.current_client_profile_id()
)
with check (
  private.current_user_role() = 'admin'
  or client_profile_id = private.current_client_profile_id()
);

create policy "clients can manage own briefs"
on public.design_briefs for all
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

create policy "clients can manage own directions"
on public.design_directions for all
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
with check (user_id = auth.uid());

create policy "clients can read own download events"
on public.download_events for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or user_id = auth.uid()
);
```

- [ ] **Step 2: Add initial hand-written Supabase types**

Create `src/lib/supabase/types.ts`:

```ts
export type UserRole = "client" | "admin";
export type GenerationStatus = "queued" | "running" | "succeeded" | "failed";
export type AssetKind =
  | "master_background"
  | "splash"
  | "button_preview"
  | "thumbnail"
  | "download_package";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface UserProfile {
  id: string;
  client_profile_id: string | null;
  role: UserRole;
  email: string;
  created_at: string;
}

export interface GenerationLimit {
  client_profile_id: string;
  max_generations: number | null;
  used_generations: number;
  updated_at: string;
}
```

- [ ] **Step 3: Apply migration locally**

Run:

```bash
supabase db reset
```

Expected: local database applies `20260505000100_master_asset_studio.sql` without SQL errors.

- [ ] **Step 4: Run Supabase advisors**

Run:

```bash
supabase db advisors
```

Expected: no critical RLS or security findings. Fix any reported exposed table without RLS before proceeding.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260505000100_master_asset_studio.sql src/lib/supabase/types.ts
git commit -m "feat: add master asset studio database schema"
```

---

### Task 4: Add Auth Guards And Portal Shell

**Files:**
- Create: `src/lib/auth/require-user.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/app/logout/route.ts`
- Create: `src/components/layout/app-shell.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Implement `requireUser`**

Create `src/lib/auth/require-user.ts`:

```ts
import { redirect } from "next/navigation";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/supabase/types";

export interface RequiredUser {
  id: string;
  email: string;
  profile: UserProfile;
}

export async function requireUser(): Promise<RequiredUser> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, client_profile_id, role, email, created_at")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login?error=missing-profile");
  }

  return {
    id: user.id,
    email: user.email,
    profile: profile as UserProfile,
  };
}
```

- [ ] **Step 2: Implement login action**

Create `src/app/login/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/login?error=email-required");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/projects`,
    },
  });

  if (error) {
    redirect("/login?error=signin-failed");
  }

  redirect("/login?sent=1");
}
```

- [ ] **Step 3: Implement login page**

Create `src/app/login/page.tsx`:

```tsx
import { signInWithEmail } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-50">
      <form action={signInWithEmail} className="w-full max-w-sm space-y-5 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Master Asset Studio</h1>
          <p className="mt-2 text-sm text-neutral-400">Sign in to create and download project assets.</p>
        </div>
        <label className="block text-sm">
          <span className="text-neutral-300">Email</span>
          <input
            name="email"
            type="email"
            required
            className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-50 outline-none focus:border-cyan-400"
          />
        </label>
        <button className="w-full rounded-md bg-cyan-400 px-4 py-2 font-medium text-neutral-950">
          Send sign-in link
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Implement logout route**

Create `src/app/logout/route.ts`:

```ts
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 5: Add app shell**

Create `src/components/layout/app-shell.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import type { RequiredUser } from "@/lib/auth/require-user";

export function AppShell({ user, children }: { user: RequiredUser; children: ReactNode }) {
  const isAdmin = user.profile.role === "admin";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/projects" className="font-semibold tracking-normal">
            Master Asset Studio
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-300">
            <Link href="/projects">Projects</Link>
            {isAdmin ? <Link href="/admin">Admin</Link> : null}
            <a href="/logout">Logout</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Update global CSS**

Ensure `src/app/globals.css` contains:

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #0a0a0a;
  color: #f5f5f5;
}

button,
input,
textarea,
select {
  font: inherit;
}
```

- [ ] **Step 7: Run checks**

Run:

```bash
npm run typecheck
npm run test
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add src/app src/components/layout src/lib/auth
git commit -m "feat: add auth guard and portal shell"
```

---

### Task 5: Add Projects And Guided Brief Form

**Files:**
- Create: `src/app/projects/page.tsx`
- Create: `src/app/projects/new/page.tsx`
- Create: `src/app/projects/actions.ts`
- Create: `src/components/projects/project-card.tsx`
- Create: `src/components/briefs/brief-form.tsx`

- [ ] **Step 1: Create project actions**

Create `src/app/projects/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { initialMaxGenerationsForEmail } from "@/lib/generation/limits";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const projectSchema = z.object({
  name: z.string().min(2),
  appCategory: z.string().min(2),
  appName: z.string().min(2),
  audience: z.string().min(2),
  desiredMood: z.string().min(2),
  likedColors: z.string().default(""),
  dislikedColors: z.string().default(""),
  fontPreferences: z.string().default(""),
  referenceLinks: z.string().default(""),
  visualDislikes: z.string().default(""),
  brandNotes: z.string().default(""),
});

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createProject(formData: FormData) {
  const user = await requireUser();
  if (!user.profile.client_profile_id) {
    redirect("/projects/new?error=missing-client-profile");
  }

  const input = projectSchema.parse({
    name: formData.get("name"),
    appCategory: formData.get("appCategory"),
    appName: formData.get("appName"),
    audience: formData.get("audience"),
    desiredMood: formData.get("desiredMood"),
    likedColors: formData.get("likedColors"),
    dislikedColors: formData.get("dislikedColors"),
    fontPreferences: formData.get("fontPreferences"),
    referenceLinks: formData.get("referenceLinks"),
    visualDislikes: formData.get("visualDislikes"),
    brandNotes: formData.get("brandNotes"),
  });

  const supabase = await createServerSupabaseClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      client_profile_id: user.profile.client_profile_id,
      name: input.name,
      app_category: input.appCategory,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    redirect("/projects/new?error=create-project-failed");
  }

  const { error: briefError } = await supabase.from("design_briefs").insert({
    project_id: project.id,
    app_name: input.appName,
    audience: input.audience,
    desired_mood: input.desiredMood,
    liked_colors: splitLines(input.likedColors),
    disliked_colors: splitLines(input.dislikedColors),
    font_preferences: input.fontPreferences,
    reference_links: splitLines(input.referenceLinks),
    visual_dislikes: input.visualDislikes,
    brand_notes: input.brandNotes,
  });

  if (briefError) {
    redirect(`/projects/${project.id}?error=create-brief-failed`);
  }

  const { error: directionsError } = await supabase.from("design_directions").insert([
    {
      project_id: project.id,
      title: "Clean Precision",
      summary: `A restrained mobile visual system for ${input.appName}, focused on clarity, safe crop zones, and premium spacing.`,
      theme_notes: {
        tone: "minimal, polished, calm",
        assetUse: ["auth backgrounds", "onboarding", "headers"],
      },
      is_selected: true,
    },
    {
      project_id: project.id,
      title: "Atmospheric Depth",
      summary: `A richer visual direction for ${input.appName}, using depth, glow, and layered composition while preserving overlay readability.`,
      theme_notes: {
        tone: "immersive, premium, dimensional",
        assetUse: ["splash", "onboarding", "hero crops"],
      },
      is_selected: false,
    },
    {
      project_id: project.id,
      title: "Bold Utility",
      summary: `A stronger product-facing direction for ${input.appName}, with confident contrast, punchier accents, and implementation-friendly button states.`,
      theme_notes: {
        tone: "confident, practical, high-contrast",
        assetUse: ["home headers", "empty states", "button systems"],
      },
      is_selected: false,
    },
  ]);

  if (directionsError) {
    redirect(`/projects/${project.id}?error=create-directions-failed`);
  }

  await supabase.from("generation_limits").upsert(
    {
      client_profile_id: user.profile.client_profile_id,
      max_generations: initialMaxGenerationsForEmail(user.email),
      used_generations: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_profile_id", ignoreDuplicates: true },
  );

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}
```

- [ ] **Step 2: Create brief form**

Create `src/components/briefs/brief-form.tsx`:

```tsx
import { createProject } from "@/app/projects/actions";

export function BriefForm() {
  return (
    <form action={createProject} className="grid gap-5">
      <input name="name" required placeholder="Project name" className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <input name="appCategory" required placeholder="App category" className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <input name="appName" required placeholder="App name" className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <textarea name="audience" required placeholder="Audience" className="min-h-24 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <textarea name="desiredMood" required placeholder="Desired mood" className="min-h-24 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <textarea name="likedColors" placeholder="Colors they like, separated by commas or lines" className="min-h-20 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <textarea name="dislikedColors" placeholder="Colors they dislike" className="min-h-20 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <textarea name="fontPreferences" placeholder="Font preferences" className="min-h-20 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <textarea name="referenceLinks" placeholder="Reference links, one per line" className="min-h-20 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <textarea name="visualDislikes" placeholder="Visual dislikes" className="min-h-20 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <textarea name="brandNotes" placeholder="Brand personality notes" className="min-h-24 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      <button className="rounded-md bg-cyan-400 px-4 py-2 font-medium text-neutral-950">Create project</button>
    </form>
  );
}
```

- [ ] **Step 3: Create new project page**

Create `src/app/projects/new/page.tsx`:

```tsx
import { AppShell } from "@/components/layout/app-shell";
import { BriefForm } from "@/components/briefs/brief-form";
import { requireUser } from "@/lib/auth/require-user";

export default async function NewProjectPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold">New mobile asset project</h1>
        <p className="mt-2 text-neutral-400">Create a guided brief for static master asset generation.</p>
        <div className="mt-8">
          <BriefForm />
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Create project card**

Create `src/components/projects/project-card.tsx`:

```tsx
import Link from "next/link";

export function ProjectCard({ id, name, category }: { id: string; name: string; category: string }) {
  return (
    <Link href={`/projects/${id}`} className="block rounded-lg border border-neutral-800 bg-neutral-900 p-5 hover:border-cyan-500">
      <h2 className="font-semibold">{name}</h2>
      <p className="mt-2 text-sm text-neutral-400">{category}</p>
    </Link>
  );
}
```

- [ ] **Step 5: Create projects page**

Create `src/app/projects/page.tsx`:

```tsx
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectCard } from "@/components/projects/project-card";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, app_category")
    .order("updated_at", { ascending: false });

  return (
    <AppShell user={user}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Projects</h1>
          <p className="mt-2 text-neutral-400">Create, refine, and download static mobile assets.</p>
        </div>
        <Link href="/projects/new" className="rounded-md bg-cyan-400 px-4 py-2 font-medium text-neutral-950">
          New project
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(projects ?? []).map((project) => (
          <ProjectCard key={project.id} id={project.id} name={project.name} category={project.app_category} />
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 6: Run checks**

Run:

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/projects src/components/briefs src/components/projects
git commit -m "feat: add project brief flow"
```

---

### Task 6: Add Generation Domain Logic

**Files:**
- Create: `src/lib/generation/types.ts`
- Create: `src/lib/generation/limits.ts`
- Create: `src/lib/generation/prompt.ts`
- Test: `tests/generation/limits.test.ts`
- Test: `tests/generation/prompt.test.ts`

- [ ] **Step 1: Write generation limit tests**

Create `tests/generation/limits.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canGenerate, initialMaxGenerationsForEmail, nextUsedGenerationCount } from "@/lib/generation/limits";

describe("generation limits", () => {
  it("allows unlimited accounts", () => {
    expect(canGenerate({ maxGenerations: null, usedGenerations: 500 })).toEqual({
      allowed: true,
      remaining: null,
    });
  });

  it("allows clients below the cap", () => {
    expect(canGenerate({ maxGenerations: 50, usedGenerations: 49 })).toEqual({
      allowed: true,
      remaining: 1,
    });
  });

  it("blocks clients at the cap", () => {
    expect(canGenerate({ maxGenerations: 50, usedGenerations: 50 })).toEqual({
      allowed: false,
      remaining: 0,
    });
  });

  it("increments only after a usable asset is produced", () => {
    expect(nextUsedGenerationCount({ usedGenerations: 10, producedUsableAssets: true })).toBe(11);
    expect(nextUsedGenerationCount({ usedGenerations: 10, producedUsableAssets: false })).toBe(10);
  });

  it("marks configured internal emails as unlimited", () => {
    expect(initialMaxGenerationsForEmail("owner@example.com", "owner@example.com,test@example.com")).toBeNull();
    expect(initialMaxGenerationsForEmail("client@example.com", "owner@example.com,test@example.com")).toBe(50);
  });
});
```

- [ ] **Step 2: Write prompt interpretation tests**

Create `tests/generation/prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildStructuredInterpretation, buildMasterAssetPrompt } from "@/lib/generation/prompt";

describe("prompt building", () => {
  it("turns freeform feedback into stable constraints", () => {
    const result = buildStructuredInterpretation("make it more futuristic but less dark");

    expect(result.changes).toContain("Increase futuristic visual cues.");
    expect(result.changes).toContain("Lighten the overall image.");
    expect(result.locked).toContain("Keep mobile safe crop zones.");
  });

  it("builds a master asset prompt without requesting clickable screens", () => {
    const prompt = buildMasterAssetPrompt({
      appName: "FitTalk",
      audience: "busy fitness coaches",
      desiredMood: "premium, calm, strong",
      likedColors: ["black", "electric blue"],
      dislikedColors: ["orange"],
      fontPreferences: "modern sans serif",
      brandNotes: "AI coaching assistant",
      feedbackInterpretation: {
        changes: ["Lighten the overall image."],
        locked: ["No critical UI text.", "Keep mobile safe crop zones."],
      },
    });

    expect(prompt).toContain("static portrait master source image");
    expect(prompt).toContain("No clickable prototype");
    expect(prompt).toContain("No critical UI text");
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm run test -- tests/generation/limits.test.ts tests/generation/prompt.test.ts
```

Expected: FAIL because generation modules do not exist.

- [ ] **Step 4: Implement generation types**

Create `src/lib/generation/types.ts`:

```ts
export interface GenerationLimitState {
  maxGenerations: number | null;
  usedGenerations: number;
}

export interface GenerationDecision {
  allowed: boolean;
  remaining: number | null;
}

export interface StructuredInterpretation {
  changes: string[];
  locked: string[];
  warnings: string[];
}

export interface MasterAssetPromptInput {
  appName: string;
  audience: string;
  desiredMood: string;
  likedColors: string[];
  dislikedColors: string[];
  fontPreferences: string;
  brandNotes: string;
  feedbackInterpretation: Pick<StructuredInterpretation, "changes" | "locked">;
}
```

- [ ] **Step 5: Implement limit helpers**

Create `src/lib/generation/limits.ts`:

```ts
import type { GenerationDecision, GenerationLimitState } from "./types";

export function canGenerate(limit: GenerationLimitState): GenerationDecision {
  if (limit.maxGenerations === null) {
    return { allowed: true, remaining: null };
  }

  const remaining = Math.max(limit.maxGenerations - limit.usedGenerations, 0);
  return {
    allowed: remaining > 0,
    remaining,
  };
}

export function nextUsedGenerationCount({
  usedGenerations,
  producedUsableAssets,
}: {
  usedGenerations: number;
  producedUsableAssets: boolean;
}) {
  return producedUsableAssets ? usedGenerations + 1 : usedGenerations;
}

export function initialMaxGenerationsForEmail(email: string, configuredEmails = process.env.INTERNAL_UNLIMITED_EMAILS ?? "") {
  const unlimitedEmails = configuredEmails
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return unlimitedEmails.includes(email.trim().toLowerCase()) ? null : 50;
}
```

- [ ] **Step 6: Implement prompt helpers**

Create `src/lib/generation/prompt.ts`:

```ts
import type { MasterAssetPromptInput, StructuredInterpretation } from "./types";

export function buildStructuredInterpretation(feedback: string): StructuredInterpretation {
  const normalized = feedback.toLowerCase();
  const changes: string[] = [];
  const warnings: string[] = [];

  if (normalized.includes("futuristic")) changes.push("Increase futuristic visual cues.");
  if (normalized.includes("less dark") || normalized.includes("lighter")) changes.push("Lighten the overall image.");
  if (normalized.includes("premium")) changes.push("Make the composition feel more premium and restrained.");
  if (normalized.includes("minimal")) changes.push("Reduce decorative clutter.");

  if (changes.length === 0 && feedback.trim()) {
    changes.push(`Apply this client feedback while preserving the approved design system: ${feedback.trim()}`);
  }

  if (!feedback.trim()) {
    warnings.push("No freeform feedback was provided; generate from the approved brief.");
  }

  return {
    changes,
    locked: [
      "Keep mobile safe crop zones.",
      "No critical UI text.",
      "Keep the selected color family unless feedback explicitly changes it.",
      "Keep output static; do not create clickable screens or prototype UI.",
    ],
    warnings,
  };
}

export function buildMasterAssetPrompt(input: MasterAssetPromptInput): string {
  return [
    "Create a static portrait master source image for a mobile app visual asset system.",
    "No clickable prototype. No complete app screen mockup. No critical UI text baked into the image.",
    `App name: ${input.appName}.`,
    `Audience: ${input.audience}.`,
    `Desired mood: ${input.desiredMood}.`,
    `Liked colors: ${input.likedColors.join(", ") || "not specified"}.`,
    `Disliked colors to avoid: ${input.dislikedColors.join(", ") || "not specified"}.`,
    `Font preference context: ${input.fontPreferences || "not specified"}.`,
    `Brand notes: ${input.brandNotes || "not specified"}.`,
    "Design for mobile overlay use: readable safe zones near the top and bottom, strong center composition, crop-safe edges, professional UI/UX polish.",
    "The image should work as a source for splash screens, onboarding backgrounds, auth backgrounds, empty states, home headers, and hero crops.",
    `Requested changes: ${input.feedbackInterpretation.changes.join(" ") || "Generate from the initial brief."}`,
    `Locked constraints: ${input.feedbackInterpretation.locked.join(" ")}`,
  ].join("\n");
}
```

- [ ] **Step 7: Run tests**

Run:

```bash
npm run test -- tests/generation/limits.test.ts tests/generation/prompt.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/generation tests/generation/limits.test.ts tests/generation/prompt.test.ts
git commit -m "feat: add generation prompt and limit logic"
```

---

### Task 7: Add Mock Provider, Derivatives, And Style Specs

**Files:**
- Create: `src/lib/generation/provider.ts`
- Create: `src/lib/generation/mock-provider.ts`
- Create: `src/lib/generation/derivatives.ts`
- Test: `tests/generation/download-package.test.ts`

- [ ] **Step 1: Create provider interface**

Create `src/lib/generation/provider.ts`:

```ts
export interface GeneratedImage {
  fileName: string;
  mimeType: "image/png" | "image/webp";
  width: number;
  height: number;
  bytes: Buffer;
}

export interface ImageGenerationRequest {
  prompt: string;
  aspect: "portrait";
  quality: "draft" | "final";
}

export interface ImageGenerationProvider {
  name: string;
  model: string;
  generateMasterAsset(request: ImageGenerationRequest): Promise<GeneratedImage>;
}
```

- [ ] **Step 2: Implement mock provider**

Create `src/lib/generation/mock-provider.ts`:

```ts
import sharp from "sharp";
import type { GeneratedImage, ImageGenerationProvider, ImageGenerationRequest } from "./provider";

export class MockImageProvider implements ImageGenerationProvider {
  name = "mock";
  model = "mock-gradient-v1";

  async generateMasterAsset(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const width = 1440;
    const height = 2560;
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#06121f"/>
            <stop offset="45%" stop-color="#0b485f"/>
            <stop offset="100%" stop-color="#d7f9ff"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="38%" r="38%">
            <stop offset="0%" stop-color="#7de7ff" stop-opacity="0.82"/>
            <stop offset="100%" stop-color="#7de7ff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <circle cx="720" cy="940" r="620" fill="url(#glow)"/>
        <path d="M160 1780 C420 1590 650 1680 880 1510 C1060 1378 1180 1410 1290 1330 L1290 2560 L160 2560 Z" fill="#071018" fill-opacity="0.56"/>
        <text x="120" y="2320" fill="#d7f9ff" font-size="42" font-family="Arial">Mock master asset</text>
      </svg>
    `;

    const bytes = await sharp(Buffer.from(svg)).png().toBuffer();

    return {
      fileName: request.quality === "final" ? "master-background.png" : "draft-master-background.png",
      mimeType: "image/png",
      width,
      height,
      bytes,
    };
  }
}
```

- [ ] **Step 3: Implement derivative helpers**

Create `src/lib/generation/derivatives.ts`:

```ts
import sharp from "sharp";
import type { GeneratedImage } from "./provider";

export async function createThumbnail(image: GeneratedImage): Promise<GeneratedImage> {
  const bytes = await sharp(image.bytes)
    .resize({ width: 360, height: 640, fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  return {
    fileName: "thumbnail.webp",
    mimeType: "image/webp",
    width: 360,
    height: 640,
    bytes,
  };
}

export async function createPracticalWebp(image: GeneratedImage): Promise<GeneratedImage> {
  const bytes = await sharp(image.bytes)
    .resize({ width: 1440, height: 2560, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();

  return {
    fileName: "master-background.webp",
    mimeType: "image/webp",
    width: 1440,
    height: 2560,
    bytes,
  };
}

export async function createSplashExport(image: GeneratedImage): Promise<GeneratedImage> {
  const bytes = await sharp(image.bytes)
    .resize({ width: 1290, height: 2796, fit: "cover", position: "center" })
    .png()
    .toBuffer();

  return {
    fileName: "splash-1290x2796.png",
    mimeType: "image/png",
    width: 1290,
    height: 2796,
    bytes,
  };
}
```

- [ ] **Step 4: Add style spec fixture helper**

Append to `src/lib/generation/types.ts`:

```ts
export interface ThemeSpec {
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    heading: string;
    body: string;
  };
  notes: string[];
}

export interface ButtonSpec {
  normal: Record<string, string>;
  pressed: Record<string, string>;
  disabled: Record<string, string>;
  css: string;
}
```

- [ ] **Step 5: Run checks**

Run:

```bash
npm run typecheck
npm run test
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/generation
git commit -m "feat: add mock image provider and derivatives"
```

---

### Task 8: Add Generation Server Action And Project Detail Page

**Files:**
- Create: `src/app/projects/[projectId]/page.tsx`
- Create: `src/app/projects/[projectId]/generate/actions.ts`
- Create: `src/components/generation/direction-picker.tsx`
- Create: `src/components/generation/feedback-form.tsx`
- Create: `src/components/generation/generation-counter.tsx`
- Create: `src/components/assets/asset-preview.tsx`

- [ ] **Step 1: Implement direction picker**

Create `src/components/generation/direction-picker.tsx`:

```tsx
import { selectDesignDirection } from "@/app/projects/[projectId]/generate/actions";

interface Direction {
  id: string;
  title: string;
  summary: string;
  is_selected: boolean;
}

export function DirectionPicker({ projectId, directions }: { projectId: string; directions: Direction[] }) {
  return (
    <div className="grid gap-3">
      {directions.map((direction) => (
        <form
          key={direction.id}
          action={selectDesignDirection.bind(null, projectId)}
          className={`rounded-lg border p-4 ${
            direction.is_selected ? "border-cyan-400 bg-cyan-400/10" : "border-neutral-800 bg-neutral-900"
          }`}
        >
          <input type="hidden" name="directionId" value={direction.id} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">{direction.title}</h2>
              <p className="mt-1 text-sm text-neutral-400">{direction.summary}</p>
            </div>
            <button className="rounded-md bg-neutral-800 px-3 py-1 text-sm text-neutral-100">
              {direction.is_selected ? "Selected" : "Select"}
            </button>
          </div>
        </form>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement feedback form**

Create `src/components/generation/feedback-form.tsx`:

```tsx
import { generateAsset } from "@/app/projects/[projectId]/generate/actions";

export function FeedbackForm({ projectId }: { projectId: string }) {
  return (
    <form action={generateAsset.bind(null, projectId)} className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <label className="block text-sm">
        <span className="text-neutral-300">Freeform feedback</span>
        <textarea
          name="feedback"
          placeholder="Example: make it more futuristic but less dark"
          className="mt-2 min-h-28 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2"
        />
      </label>
      <button className="rounded-md bg-cyan-400 px-4 py-2 font-medium text-neutral-950">Generate master asset</button>
    </form>
  );
}
```

- [ ] **Step 3: Implement generation counter**

Create `src/components/generation/generation-counter.tsx`:

```tsx
export function GenerationCounter({
  used,
  max,
}: {
  used: number;
  max: number | null;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
      {max === null ? "Unlimited generations" : `${used} / ${max} generations used`}
    </div>
  );
}
```

- [ ] **Step 4: Implement asset preview**

Create `src/components/assets/asset-preview.tsx`:

```tsx
export function AssetPreview({ src, label }: { src?: string | null; label: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="aspect-[9/16] w-full object-cover" />
      ) : (
        <div className="flex aspect-[9/16] items-center justify-center text-sm text-neutral-500">No asset yet</div>
      )}
      <div className="border-t border-neutral-800 px-3 py-2 text-sm text-neutral-300">{label}</div>
    </div>
  );
}
```

- [ ] **Step 5: Implement generation action**

Create `src/app/projects/[projectId]/generate/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import { createSplashExport, createThumbnail, createPracticalWebp } from "@/lib/generation/derivatives";
import { canGenerate } from "@/lib/generation/limits";
import { MockImageProvider } from "@/lib/generation/mock-provider";
import { buildMasterAssetPrompt, buildStructuredInterpretation } from "@/lib/generation/prompt";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function selectDesignDirection(projectId: string, formData: FormData) {
  await requireUser();
  const directionId = String(formData.get("directionId") ?? "");
  const supabase = await createServerSupabaseClient();

  await supabase.from("design_directions").update({ is_selected: false }).eq("project_id", projectId);
  await supabase
    .from("design_directions")
    .update({ is_selected: true })
    .eq("project_id", projectId)
    .eq("id", directionId);

  revalidatePath(`/projects/${projectId}`);
}

export async function generateAsset(projectId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const service = createServiceSupabaseClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, client_profile_id, name")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/projects?error=project-not-found");

  const { data: limit } = await supabase
    .from("generation_limits")
    .select("max_generations, used_generations")
    .eq("client_profile_id", project.client_profile_id)
    .single();

  const decision = canGenerate({
    maxGenerations: limit?.max_generations ?? 50,
    usedGenerations: limit?.used_generations ?? 0,
  });

  if (!decision.allowed) redirect(`/projects/${projectId}?error=generation-limit`);

  const { data: brief } = await supabase
    .from("design_briefs")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (!brief) redirect(`/projects/${projectId}?error=missing-brief`);

  const feedback = String(formData.get("feedback") ?? "");
  const interpretation = buildStructuredInterpretation(feedback);
  const prompt = buildMasterAssetPrompt({
    appName: brief.app_name,
    audience: brief.audience,
    desiredMood: brief.desired_mood,
    likedColors: brief.liked_colors,
    dislikedColors: brief.disliked_colors,
    fontPreferences: brief.font_preferences,
    brandNotes: brief.brand_notes,
    feedbackInterpretation: interpretation,
  });

  const { data: direction } = await supabase
    .from("design_directions")
    .select("id")
    .eq("project_id", projectId)
    .eq("is_selected", true)
    .single();

  if (!direction) redirect(`/projects/${projectId}?error=select-direction-first`);

  const provider = new MockImageProvider();
  const { data: generation } = await service
    .from("asset_generations")
    .insert({
      design_direction_id: direction.id,
      requested_by: user.id,
      status: "running",
      freeform_feedback: feedback,
      structured_interpretation: interpretation,
      prompt,
      provider: provider.name,
      model: provider.model,
    })
    .select("id")
    .single();

  if (!generation) redirect(`/projects/${projectId}?error=generation-record-failed`);

  try {
    const master = await provider.generateMasterAsset({ prompt, aspect: "portrait", quality: "final" });
    const webp = await createPracticalWebp(master);
    const splash = await createSplashExport(master);
    const thumbnail = await createThumbnail(master);
    const files = [master, webp, splash, thumbnail];

    for (const file of files) {
      const path = `${project.client_profile_id}/${projectId}/${generation.id}/${file.fileName}`;
      await service.storage.from(env.ASSET_BUCKET).upload(path, file.bytes, {
        contentType: file.mimeType,
        upsert: true,
      });
      await service.from("asset_files").insert({
        generation_id: generation.id,
        kind: file.fileName.includes("thumbnail")
          ? "thumbnail"
          : file.fileName.includes("splash")
            ? "splash"
            : "master_background",
        storage_path: path,
        file_name: file.fileName,
        mime_type: file.mimeType,
        width: file.width,
        height: file.height,
        byte_size: file.bytes.byteLength,
      });
    }

    await service.from("style_specs").insert({
      generation_id: generation.id,
      theme_json: {
        colors: { primary: "#7de7ff", accent: "#0b485f", background: "#06121f", text: "#f5f5f5" },
        typography: { heading: "modern sans serif", body: "system sans serif" },
        notes: interpretation.locked,
      },
      buttons_json: {
        normal: { background: "#7de7ff", color: "#06121f", radius: "12px" },
        pressed: { background: "#56bfd7", transform: "translateY(1px)" },
        disabled: { background: "#334155", color: "#94a3b8" },
        css: ".button { border-radius: 12px; background: #7de7ff; color: #06121f; }",
      },
      readme: "Use the master PNG as the source crop for mobile backgrounds. Keep critical UI text in code.",
    });

    await service
      .from("asset_generations")
      .update({ status: "succeeded", counted_against_limit: true, completed_at: new Date().toISOString() })
      .eq("id", generation.id);

    await service
      .from("generation_limits")
      .upsert({
        client_profile_id: project.client_profile_id,
        max_generations: limit?.max_generations ?? 50,
        used_generations: (limit?.used_generations ?? 0) + 1,
        updated_at: new Date().toISOString(),
      });
  } catch (error) {
    await service
      .from("asset_generations")
      .update({ status: "failed", error_message: error instanceof Error ? error.message : "Unknown generation error" })
      .eq("id", generation.id);
  }

  revalidatePath(`/projects/${projectId}`);
}
```

- [ ] **Step 6: Create project detail page**

Create `src/app/projects/[projectId]/page.tsx`:

```tsx
import { AppShell } from "@/components/layout/app-shell";
import { AssetPreview } from "@/components/assets/asset-preview";
import { DirectionPicker } from "@/components/generation/direction-picker";
import { FeedbackForm } from "@/components/generation/feedback-form";
import { GenerationCounter } from "@/components/generation/generation-counter";
import { requireUser } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const service = createServiceSupabaseClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  const { data: limit } = await supabase
    .from("generation_limits")
    .select("*")
    .eq("client_profile_id", project?.client_profile_id ?? "")
    .single();
  const { data: files } = await supabase
    .from("asset_files")
    .select("storage_path, file_name, kind, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  const { data: directions } = await supabase
    .from("design_directions")
    .select("id, title, summary, is_selected")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const previewPath = files?.[0]?.storage_path;
  const { data: signedPreview } = previewPath
    ? await service.storage.from(env.ASSET_BUCKET).createSignedUrl(previewPath, 60 * 10)
    : { data: null };
  const previewUrl = signedPreview?.signedUrl ?? null;

  return (
    <AppShell user={user}>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <h1 className="text-3xl font-semibold">{project?.name ?? "Project"}</h1>
          <p className="mt-2 text-neutral-400">Generate high-resolution static master assets.</p>
          <div className="mt-6">
            <DirectionPicker projectId={projectId} directions={directions ?? []} />
          </div>
          <div className="mt-6">
            <FeedbackForm projectId={projectId} />
          </div>
        </section>
        <aside className="space-y-4">
          <GenerationCounter used={limit?.used_generations ?? 0} max={limit?.max_generations ?? 50} />
          <AssetPreview src={previewUrl} label="Latest master asset" />
          <a href={`/projects/${projectId}/download`} className="block rounded-md bg-cyan-400 px-4 py-2 text-center font-medium text-neutral-950">
            Download latest package
          </a>
        </aside>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 7: Run checks**

Run:

```bash
npm run typecheck
npm run test
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/projects/[projectId] src/components/assets src/components/generation
git commit -m "feat: add asset generation flow"
```

---

### Task 9: Add Download Package Creation

**Files:**
- Create: `src/lib/generation/download-package.ts`
- Create: `src/app/projects/[projectId]/download/route.ts`
- Test: `tests/generation/download-package.test.ts`

- [ ] **Step 1: Write download package test**

Create `tests/generation/download-package.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDownloadPackage } from "@/lib/generation/download-package";

describe("createDownloadPackage", () => {
  it("contains master assets, specs, and readme", async () => {
    const zip = await createDownloadPackage({
      files: [
        {
          fileName: "master-background.png",
          bytes: Buffer.from("png"),
        },
      ],
      theme: { colors: { primary: "#fff" } },
      buttons: { normal: { background: "#fff" } },
      readme: "Use this master asset for mobile crops.",
    });

    const names = Object.keys(zip.files);
    expect(names).toContain("assets/master-background.png");
    expect(names).toContain("theme.json");
    expect(names).toContain("buttons.json");
    expect(names).toContain("README.md");
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm run test -- tests/generation/download-package.test.ts
```

Expected: FAIL because `download-package.ts` does not exist.

- [ ] **Step 3: Implement package creator**

Create `src/lib/generation/download-package.ts`:

```ts
import JSZip from "jszip";

export interface DownloadPackageInput {
  files: Array<{
    fileName: string;
    bytes: Buffer;
  }>;
  theme: unknown;
  buttons: unknown;
  readme: string;
}

export async function createDownloadPackage(input: DownloadPackageInput) {
  const zip = new JSZip();

  for (const file of input.files) {
    zip.file(`assets/${file.fileName}`, file.bytes);
  }

  zip.file("theme.json", JSON.stringify(input.theme, null, 2));
  zip.file("buttons.json", JSON.stringify(input.buttons, null, 2));
  zip.file("README.md", input.readme);

  return zip;
}

export async function createDownloadPackageBuffer(input: DownloadPackageInput) {
  const zip = await createDownloadPackage(input);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
```

- [ ] **Step 4: Implement download route**

Create `src/app/projects/[projectId]/download/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { createDownloadPackageBuffer } from "@/lib/generation/download-package";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const service = createServiceSupabaseClient();

  const { data: generations } = await supabase
    .from("asset_generations")
    .select("id, style_specs(theme_json, buttons_json, readme), design_directions!inner(project_id)")
    .eq("design_directions.project_id", projectId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1);

  const generation = generations?.[0];
  if (!generation) {
    return NextResponse.json({ error: "No successful generation found" }, { status: 404 });
  }

  const { data: assetFiles } = await supabase
    .from("asset_files")
    .select("storage_path, file_name")
    .eq("generation_id", generation.id);

  const files = [];
  for (const file of assetFiles ?? []) {
    const { data } = await service.storage.from(env.ASSET_BUCKET).download(file.storage_path);
    if (data) {
      files.push({
        fileName: file.file_name,
        bytes: Buffer.from(await data.arrayBuffer()),
      });
    }
  }

  const spec = Array.isArray(generation.style_specs) ? generation.style_specs[0] : generation.style_specs;
  const buffer = await createDownloadPackageBuffer({
    files,
    theme: spec?.theme_json ?? {},
    buttons: spec?.buttons_json ?? {},
    readme: spec?.readme ?? "Use the master asset as the source for mobile crops.",
  });

  await service.from("download_events").insert({
    generation_id: generation.id,
    user_id: user.id,
  });

  return new NextResponse(buffer, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="master-asset-${projectId}.zip"`,
    },
  });
}
```

- [ ] **Step 5: Run checks**

Run:

```bash
npm run test -- tests/generation/download-package.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/generation/download-package.ts src/app/projects/[projectId]/download tests/generation/download-package.test.ts
git commit -m "feat: add asset download packages"
```

---

### Task 10: Add Admin Dashboard And Cap Overrides

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/actions.ts`
- Create: `src/components/admin/client-table.tsx`

- [ ] **Step 1: Implement admin actions**

Create `src/app/admin/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const user = await requireUser();
  if (user.profile.role !== "admin") redirect("/projects");
  return user;
}

export async function setClientGenerationLimit(formData: FormData) {
  await requireAdmin();
  const clientProfileId = String(formData.get("clientProfileId") ?? "");
  const mode = String(formData.get("mode") ?? "limited");
  const maxGenerations = mode === "unlimited" ? null : Number(formData.get("maxGenerations") ?? 50);
  const service = createServiceSupabaseClient();

  await service.from("generation_limits").upsert({
    client_profile_id: clientProfileId,
    max_generations: maxGenerations,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/admin");
}

export async function resetClientGenerationCount(formData: FormData) {
  await requireAdmin();
  const clientProfileId = String(formData.get("clientProfileId") ?? "");
  const service = createServiceSupabaseClient();

  await service
    .from("generation_limits")
    .update({ used_generations: 0, updated_at: new Date().toISOString() })
    .eq("client_profile_id", clientProfileId);

  revalidatePath("/admin");
}
```

- [ ] **Step 2: Implement client table**

Create `src/components/admin/client-table.tsx`:

```tsx
import { resetClientGenerationCount, setClientGenerationLimit } from "@/app/admin/actions";

interface AdminClientRow {
  id: string;
  name: string;
  max_generations: number | null;
  used_generations: number;
}

export function ClientTable({ clients }: { clients: AdminClientRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-900 text-neutral-300">
          <tr>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Usage</th>
            <th className="px-4 py-3">Limit</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-t border-neutral-800">
              <td className="px-4 py-3">{client.name}</td>
              <td className="px-4 py-3">{client.used_generations}</td>
              <td className="px-4 py-3">{client.max_generations === null ? "Unlimited" : client.max_generations}</td>
              <td className="flex gap-2 px-4 py-3">
                <form action={setClientGenerationLimit} className="flex gap-2">
                  <input type="hidden" name="clientProfileId" value={client.id} />
                  <input name="maxGenerations" defaultValue={client.max_generations ?? 50} className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-1" />
                  <button name="mode" value="limited" className="rounded bg-neutral-700 px-3 py-1">Set</button>
                  <button name="mode" value="unlimited" className="rounded bg-cyan-400 px-3 py-1 text-neutral-950">Unlimited</button>
                </form>
                <form action={resetClientGenerationCount}>
                  <input type="hidden" name="clientProfileId" value={client.id} />
                  <button className="rounded bg-neutral-700 px-3 py-1">Reset</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Implement admin page**

Create `src/app/admin/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { ClientTable } from "@/components/admin/client-table";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const user = await requireUser();
  if (user.profile.role !== "admin") redirect("/projects");

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("client_profiles")
    .select("id, name, generation_limits(max_generations, used_generations)")
    .order("created_at", { ascending: false });

  const clients = (data ?? []).map((client) => {
    const limit = Array.isArray(client.generation_limits) ? client.generation_limits[0] : client.generation_limits;
    return {
      id: client.id,
      name: client.name,
      max_generations: limit?.max_generations ?? 50,
      used_generations: limit?.used_generations ?? 0,
    };
  });

  return (
    <AppShell user={user}>
      <h1 className="text-3xl font-semibold">Admin</h1>
      <p className="mt-2 text-neutral-400">View clients and manage generation caps.</p>
      <div className="mt-8">
        <ClientTable clients={clients} />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin src/components/admin
git commit -m "feat: add admin generation cap controls"
```

---

### Task 11: Add OpenAI Image Provider Adapter

**Files:**
- Create: `src/lib/generation/openai-provider.ts`
- Modify: `src/app/projects/[projectId]/generate/actions.ts`

- [ ] **Step 1: Implement OpenAI provider**

Create `src/lib/generation/openai-provider.ts`:

```ts
import OpenAI from "openai";
import { env } from "@/lib/env";
import type { GeneratedImage, ImageGenerationProvider, ImageGenerationRequest } from "./provider";

export class OpenAIImageProvider implements ImageGenerationProvider {
  name = "openai";
  model = env.OPENAI_IMAGE_MODEL;

  private client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  async generateMasterAsset(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const result = await this.client.images.generate({
      model: this.model,
      prompt: request.prompt,
      size: "2160x3840",
      quality: request.quality === "final" ? "high" : "low",
      output_format: "png",
    });

    const image = result.data?.[0];
    if (!image?.b64_json) {
      throw new Error("OpenAI image generation returned no image data");
    }

    return {
      fileName: "master-background.png",
      mimeType: "image/png",
      width: 2160,
      height: 3840,
      bytes: Buffer.from(image.b64_json, "base64"),
    };
  }
}
```

- [ ] **Step 2: Add provider selector**

Create `src/lib/generation/provider-selector.ts`:

```ts
import { env } from "@/lib/env";
import { MockImageProvider } from "./mock-provider";
import { OpenAIImageProvider } from "./openai-provider";
import type { ImageGenerationProvider } from "./provider";

export function createImageGenerationProvider(): ImageGenerationProvider {
  if (env.GENERATION_PROVIDER === "openai") {
    return new OpenAIImageProvider();
  }

  return new MockImageProvider();
}
```

- [ ] **Step 3: Use provider selector in generation action**

In `src/app/projects/[projectId]/generate/actions.ts`, replace:

```ts
import { MockImageProvider } from "@/lib/generation/mock-provider";
```

with:

```ts
import { createImageGenerationProvider } from "@/lib/generation/provider-selector";
```

Then replace:

```ts
const provider = new MockImageProvider();
```

with:

```ts
const provider = createImageGenerationProvider();
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm run typecheck
npm run test
```

Expected: pass.

- [ ] **Step 5: Manual provider smoke test**

With `.env.local` set to `GENERATION_PROVIDER=openai` and `OPENAI_API_KEY` configured, generate one asset from the project detail page.

Expected:

- one `asset_generations` row with `status='succeeded'`
- one master PNG in Supabase Storage
- one WebP derivative
- one thumbnail
- generation count increments by 1

- [ ] **Step 6: Commit**

```bash
git add src/lib/generation/openai-provider.ts src/lib/generation/provider-selector.ts src/app/projects/[projectId]/generate/actions.ts
git commit -m "feat: add openai image provider"
```

---

### Task 12: Add E2E Coverage And Launch Verification

**Files:**
- Create: `tests/e2e/auth-and-projects.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Add README**

Create `README.md`:

```md
# Master Asset Studio

Client portal for generating static, high-resolution mobile app master assets and implementation specs.

## Development

1. Copy `.env.example` to `.env.local`.
2. Fill Supabase values.
3. Keep `GENERATION_PROVIDER=mock` for local portal testing.
4. Run `npm run dev`.

## Verification

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

## Image Providers

The app uses a provider adapter. `mock` is deterministic and used for tests. `openai` creates real image assets when `OPENAI_API_KEY` is configured.
```

- [ ] **Step 2: Add E2E smoke test**

Create `tests/e2e/auth-and-projects.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Master Asset Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeVisible();
});
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 4: Manual portal verification**

Run:

```bash
npm run dev
```

Expected manual checks:

- `/login` renders.
- authenticated client lands on `/projects`.
- client can create a project and brief.
- client can generate a mock master asset.
- generation counter increments only after success.
- client can download a zip containing `assets/`, `theme.json`, `buttons.json`, and `README.md`.
- admin can set a client to unlimited.
- normal client cannot open `/admin`.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/e2e/auth-and-projects.spec.ts
git commit -m "test: add portal smoke coverage"
```

---

## Self-Review

### Spec Coverage

- Client login: Task 4.
- Project and guided brief: Task 5.
- 2-4 design directions and selection: Task 5 creates three directions; Task 8 lets clients select one before generation.
- Freeform feedback: Task 6 and Task 8.
- Structured interpretation before generation: Task 6 and Task 8.
- Static master assets: Task 7, Task 8, Task 11.
- Splash/button/style specs: Task 7 creates splash derivatives; Task 8 records button/style specs; Task 9 packages all generated files.
- Self-serve downloads: Task 9.
- 50-generation cap and unlimited internal accounts: Task 6, Task 8, Task 10.
- Admin visibility and cap override: Task 10.
- Storage and download history: Task 8 and Task 9.
- Provider adapter: Task 7 and Task 11.
- Verification: Task 12.

### Known Follow-Up After V1

- Add reference image uploads to the guided brief.
- Add cost/usage analytics per provider.
