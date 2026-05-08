"use client";

import { generateAssetPackage } from "@/app/projects/[projectId]/generate/actions";
import { GenerationStatusPanel } from "@/components/generation/generation-status-panel";
import type { GenerationStatusSnapshot } from "@/lib/generation/status";
import { useFormStatus } from "react-dom";

export function FeedbackForm({
  initialStatus,
  projectId,
}: {
  initialStatus: GenerationStatusSnapshot;
  projectId: string;
}) {
  return (
    <form
      action={generateAssetPackage.bind(null, projectId)}
      className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5"
    >
      <label className="block text-sm font-medium text-zinc-200">
        Freeform feedback
        <textarea
          name="feedback"
          placeholder="Example: make it more futuristic but less dark"
          className="mt-3 min-h-32 w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
        />
      </label>
      <FeedbackSubmitButton />
      <FeedbackPendingNote />
      <GenerationStatusPanel
        initialSnapshot={initialStatus}
        projectId={projectId}
        showExistingActive={false}
      />
    </form>
  );
}

function FeedbackSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
    >
      {pending ? <Spinner /> : null}
      {pending ? "Regenerating..." : "Re-generate from feedback"}
    </button>
  );
}

function FeedbackPendingNote() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <p className="mt-3 max-w-2xl rounded-md border border-cyan-900/70 bg-cyan-950/30 px-3 py-2 text-sm leading-6 text-cyan-100">
      Feedback regeneration started. This can take a few minutes because it
      edits from the previous image context, then rebuilds the full asset
      package.
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
