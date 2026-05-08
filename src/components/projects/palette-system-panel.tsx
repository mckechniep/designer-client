import { generateProjectPalette } from "@/app/projects/actions";
import type { PaletteModeSpec, PaletteSystem } from "@/lib/palette/spec";

interface PaletteSystemPanelProps {
  palette: PaletteSystem | null;
  projectId: string;
}

export function PaletteSystemPanel({
  palette,
  projectId,
}: PaletteSystemPanelProps) {
  return (
    <details
      className="group rounded-md border border-zinc-800 bg-zinc-900/45"
      open={!palette}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">
            Palette system
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            {palette
              ? "Approved light and dark tokens are saved for this project."
              : "Generate exact light and dark UI tokens before creating assets."}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-zinc-400 group-open:hidden">
          Show
        </span>
        <span className="hidden shrink-0 text-sm font-semibold text-zinc-400 group-open:inline">
          Hide
        </span>
      </summary>

      <div className="border-t border-zinc-800 px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-zinc-400">
            These exact tokens are the color contract for generated screens,
            buttons, icons, and source backgrounds.
          </p>
          <form action={generateProjectPalette.bind(null, projectId)}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              {palette ? "Regenerate palette" : "Generate palette"}
            </button>
          </form>
        </div>

        {palette ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <PaletteModePreview mode={palette.light} />
            <PaletteModePreview mode={palette.dark} />
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm leading-6 text-zinc-400">
              No palette has been generated yet. The asset package step uses
              this palette as its color contract.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

function PaletteModePreview({ mode }: { mode: PaletteModeSpec }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">{mode.title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {mode.subtitle}
        </p>
      </div>
      <div className="mt-4 space-y-4">
        {mode.groups.map((group) => (
          <div key={group.name}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {group.name}
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {group.tokens.map((token) => (
                <div
                  key={token.name}
                  className="rounded-md border border-zinc-800 bg-zinc-900 p-2"
                >
                  <div
                    className="h-10 rounded border border-zinc-700"
                    style={{
                      background: token.value,
                    }}
                  />
                  <div className="mt-2 min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-200">
                      --{token.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {token.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
