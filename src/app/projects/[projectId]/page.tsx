import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ProjectDetailParams = Promise<{
  projectId: string;
}>;

type ProjectDetailSearchParams = Promise<{
  error?: string | string[] | undefined;
}>;

interface ProjectDetail {
  id: string;
  name: string;
  app_category: string;
  client_profile_id: string;
}

interface BriefSummary {
  app_name: string;
  audience: string;
  desired_mood: string;
}

interface DirectionSummary {
  id: string;
  title: string;
  summary: string;
  is_selected: boolean;
}

interface LimitSummary {
  max_generations: number | null;
  used_generations: number;
}

const errorMessages: Record<string, string> = {
  "create-brief-failed":
    "The project was created, but we could not save the design brief.",
  "create-directions-failed":
    "The project was created, but we could not create the default design directions.",
  "create-generation-limit-failed":
    "The project was created, but we could not set the generation limit.",
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: ProjectDetailParams;
  searchParams: ProjectDetailSearchParams;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const error = getParam(resolvedSearchParams.error);
  const message = error ? errorMessages[error] : undefined;
  const supabase = await createServerSupabaseClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, app_category, client_profile_id")
    .eq("id", projectId)
    .single<ProjectDetail>();

  if (!project) {
    return (
      <AppShell user={user}>
        <div className="max-w-2xl rounded-md border border-zinc-800 bg-zinc-900/40 p-6">
          <h1 className="text-2xl font-semibold text-zinc-50">
            Project not found
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            This project is unavailable or you do not have access to it.
          </p>
          <Link
            href="/projects"
            className="mt-5 inline-flex rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Back to projects
          </Link>
        </div>
      </AppShell>
    );
  }

  const [{ data: brief }, { data: directions }, { data: limit }] =
    await Promise.all([
      supabase
        .from("design_briefs")
        .select("app_name, audience, desired_mood")
        .eq("project_id", projectId)
        .single<BriefSummary>(),
      supabase
        .from("design_directions")
        .select("id, title, summary, is_selected")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .returns<DirectionSummary[]>(),
      supabase
        .from("generation_limits")
        .select("max_generations, used_generations")
        .eq("client_profile_id", project.client_profile_id)
        .single<LimitSummary>(),
    ]);

  return (
    <AppShell user={user}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <Link
            href="/projects"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-300"
          >
            Projects
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">
            {project.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            {project.app_category} asset project for static mobile backgrounds,
            splash assets, and implementation-ready visual direction.
          </p>

          {message ? (
            <div
              className="mt-6 rounded-md border border-red-800/80 bg-red-950/50 px-4 py-3 text-sm text-red-100"
              role="alert"
            >
              {message}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4">
            {(directions ?? []).map((direction) => (
              <div
                key={direction.id}
                className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-50">
                      {direction.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {direction.summary}
                    </p>
                  </div>
                  {direction.is_selected ? (
                    <span className="inline-flex rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300">
                      Selected
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5">
            <h2 className="text-sm font-semibold text-zinc-100">Brief</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-zinc-500">App name</dt>
                <dd className="mt-1 text-zinc-200">
                  {brief?.app_name ?? "Not saved yet"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Audience</dt>
                <dd className="mt-1 leading-6 text-zinc-300">
                  {brief?.audience ?? "Not saved yet"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Mood</dt>
                <dd className="mt-1 leading-6 text-zinc-300">
                  {brief?.desired_mood ?? "Not saved yet"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5">
            <h2 className="text-sm font-semibold text-zinc-100">
              Generation limit
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {!limit
                ? "Not saved yet"
                : limit.max_generations === null
                ? "Unlimited generations"
                : `${limit.used_generations} / ${limit.max_generations} generations used`}
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
