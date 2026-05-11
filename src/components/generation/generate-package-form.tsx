"use client";

import { generateAssetPackage } from "@/app/projects/[projectId]/generate/actions";
import { GenerationStatusPanel } from "@/components/generation/generation-status-panel";
import type { GenerationStatusSnapshot } from "@/lib/generation/status";
import { useFormStatus } from "react-dom";

export function GeneratePackageForm({
  disabled = false,
  disabledReason = "Generate the palette system first.",
  initialStatus,
  projectId,
}: {
  disabled?: boolean;
  disabledReason?: string;
  initialStatus: GenerationStatusSnapshot;
  projectId: string;
}) {
  return (
    <form
      action={generateAssetPackage.bind(null, projectId)}
      className="grid gap-3"
    >
      <input type="hidden" name="feedback" value="" />
      <GenerateButton disabled={disabled} />
      {disabled ? (
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {disabledReason}
        </p>
      ) : null}
      <GenerationPendingNote />
      <GenerationStatusPanel
        initialSnapshot={initialStatus}
        projectId={projectId}
      />
    </form>
  );
}

function GenerateButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      disabled={disabled || pending}
    >
      {pending ? <Spinner /> : null}
      {pending ? "Generating backgrounds..." : "Generate source backgrounds"}
    </button>
  );
}

function GenerationPendingNote() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <p className="rounded-md border border-cyan-900/70 bg-cyan-950/30 px-3 py-2 text-sm leading-6 text-cyan-100">
      Generation started. This can take a few minutes while the image model
      creates the textless source backgrounds and the app builds the
      downloadable background package. Keep this page open while it runs; the
      project will update when it finishes.
    </p>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-950"
    />
  );
}
