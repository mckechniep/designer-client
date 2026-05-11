"use client";

import { generateAdditionalBackgroundAssets } from "@/app/projects/[projectId]/generate/actions";
import { useFormStatus } from "react-dom";

const defaultBackgroundSubjects = [
  "Home",
  "Dashboard",
  "Detail",
  "Settings",
];

export function GenerateBackgroundsForm({
  disabled = false,
  disabledReason = "Generate and review the source backgrounds first.",
  projectId,
}: {
  disabled?: boolean;
  disabledReason?: string;
  projectId: string;
}) {
  return (
    <form
      action={generateAdditionalBackgroundAssets.bind(null, projectId)}
      className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5"
    >
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">
          Background plates
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          List up to four app areas. The model will create paired light and
          dark textless backgrounds that keep the approved source style, colors,
          and overlay-safe zones.
        </p>
      </div>

      <textarea
        name="backgroundSubjects"
        className="mt-4 min-h-32 w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
        defaultValue={defaultBackgroundSubjects.join("\n")}
        disabled={disabled}
        placeholder={"Home\nDashboard\nDetail\nSettings"}
      />

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        The prompt forbids text, labels, icons, charts, nav bars, buttons, and
        readable placeholder content.
      </p>

      {disabled ? (
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {disabledReason}
        </p>
      ) : null}

      <BackgroundSubmitButton disabled={disabled} />
      <BackgroundPendingNote />
    </form>
  );
}

function BackgroundSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={disabled || pending}
    >
      {pending ? <Spinner /> : null}
      {pending ? "Generating backgrounds..." : "Generate expanded backgrounds"}
    </button>
  );
}

function BackgroundPendingNote() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <p className="mt-3 max-w-2xl rounded-md border border-cyan-900/70 bg-cyan-950/30 px-3 py-2 text-sm leading-6 text-cyan-100">
      Background expansion started. Keep this page open while the model creates
      paired light and dark textless plates from the approved source
      backgrounds.
    </p>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100"
    />
  );
}
