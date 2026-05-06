import Link from "next/link";

interface ProjectCardProps {
  id: string;
  name: string;
  category: string;
}

export function ProjectCard({ id, name, category }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${id}`}
      className="group grid min-h-36 grid-rows-[1fr_auto] rounded-md border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-600 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
    >
      <div>
        <h2 className="line-clamp-2 text-base font-semibold leading-6 text-zinc-50">
          {name}
        </h2>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
          {category}
        </p>
      </div>
      <span className="mt-5 text-sm font-medium text-zinc-300 transition group-hover:text-zinc-50">
        Open project
      </span>
    </Link>
  );
}
