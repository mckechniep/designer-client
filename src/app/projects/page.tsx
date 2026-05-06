import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectCard } from "@/components/projects/project-card";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ProjectListItem {
  id: string;
  name: string;
  app_category: string;
}

export default async function ProjectsPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, app_category")
    .order("updated_at", { ascending: false })
    .returns<ProjectListItem[]>();

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-zinc-50">
            Projects
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Create, refine, and download static mobile assets from guided
            project briefs.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex w-full items-center justify-center rounded-md bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-zinc-950 sm:w-auto"
        >
          New project
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              category={project.app_category}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-md border border-dashed border-zinc-700 bg-zinc-900/35 px-5 py-10 text-center">
          <h2 className="text-base font-semibold text-zinc-100">
            No projects yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
            Start with a guided brief to create the project record, default
            design directions, and client generation limit.
          </p>
          <Link
            href="/projects/new"
            className="mt-5 inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Create first project
          </Link>
        </div>
      )}
    </AppShell>
  );
}
