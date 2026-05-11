import Link from "next/link";
import { DeleteProjectForm } from "@/components/projects/delete-project-form";

interface ProjectCardProps {
  id: string;
  name: string;
  category: string;
}

export function ProjectCard({ id, name, category }: ProjectCardProps) {
  return (
    <article className="grid min-h-44 grid-rows-[1fr_auto] rounded-md border border-zinc-800 bg-zinc-900/50 p-5">
      <div>
        <h2 className="line-clamp-2 text-base font-semibold leading-6 text-zinc-50">
          {name}
        </h2>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
          {category}
        </p>
      </div>
      <div className="mt-5 grid gap-2">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        >
          Open project
        </Link>
        <DeleteProjectForm projectId={id} />
      </div>
    </article>
  );
}
