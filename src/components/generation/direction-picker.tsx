import { selectDesignDirection } from "@/app/projects/[projectId]/generate/actions";

interface Direction {
  id: string;
  title: string;
  summary: string;
  is_selected: boolean;
}

export function DirectionPicker({
  directions,
  projectId,
}: {
  directions: Direction[];
  projectId: string;
}) {
  if (directions.length === 0) {
    return (
      <div className="rounded-md border border-amber-900/70 bg-amber-950/20 px-4 py-3 text-sm leading-6 text-amber-100">
        No design directions are available yet. Refresh this project; the app
        will recreate the default directions before generation.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {directions.map((direction) => (
        <form
          key={direction.id}
          action={selectDesignDirection.bind(null, projectId)}
          className={`rounded-md border p-5 ${
            direction.is_selected
              ? "border-cyan-700 bg-cyan-950/25"
              : "border-zinc-800 bg-zinc-900/45"
          }`}
        >
          <input type="hidden" name="directionId" value={direction.id} />
          <div className="flex min-h-32 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-50">
                {direction.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {direction.summary}
              </p>
            </div>
            <button
              type="submit"
              aria-pressed={direction.is_selected}
              className={`inline-flex w-24 shrink-0 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-500 ${
                direction.is_selected
                  ? "border-cyan-700 bg-cyan-900/40 text-cyan-50"
                  : "border-zinc-700 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
              }`}
            >
              {direction.is_selected ? "Selected" : "Select"}
            </button>
          </div>
        </form>
      ))}
    </div>
  );
}
