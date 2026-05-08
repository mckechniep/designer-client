export function GenerationCounter({
  max,
  used,
}: {
  max: number | null;
  used: number;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5">
      <h2 className="text-sm font-semibold text-zinc-100">
        Generation limit
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {max === null ? "Unlimited generations" : `${used} / ${max} used`}
      </p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Tracked across this client&apos;s projects, not just this project.
      </p>
    </div>
  );
}
