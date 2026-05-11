import { analyzeProjectReferences } from "@/app/projects/actions";

interface ReferenceAnalysisPanelProps {
  errorMessage?: string | null;
  projectId: string;
  sourceUrls: string[];
  status?: string | null;
  summary?: string | null;
}

export function ReferenceAnalysisPanel({
  errorMessage,
  projectId,
  sourceUrls,
  status,
  summary,
}: ReferenceAnalysisPanelProps) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">
            Reference analysis
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Extracted style guidance from the saved reference links.
          </p>
        </div>
        <form action={analyzeProjectReferences.bind(null, projectId)}>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Analyze references
          </button>
        </form>
      </div>

      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
        {sourceUrls.length > 0 ? (
          <ul className="space-y-1 text-xs leading-5 text-zinc-500">
            {sourceUrls.map((url) => (
              <li key={url} className="truncate">
                {url}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No reference links saved.</p>
        )}

        {summary ? (
          <pre className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
            {summary}
          </pre>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            No reference analysis has been saved yet.
          </p>
        )}

        {status ? (
          <p className="mt-4 text-xs uppercase tracking-wide text-zinc-600">
            {status}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-3 text-sm leading-6 text-red-200">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
