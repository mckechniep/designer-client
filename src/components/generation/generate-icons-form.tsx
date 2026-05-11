"use client";

import { generateOptionalIconAssets } from "@/app/projects/[projectId]/generate/actions";
import { useFormStatus } from "react-dom";

export function GenerateIconsForm({
  disabled = false,
  disabledReason = "Generate and review the source backgrounds first.",
  initialSubjects,
  projectId,
}: {
  disabled?: boolean;
  disabledReason?: string;
  initialSubjects: string[];
  projectId: string;
}) {
  return (
    <form
      action={generateOptionalIconAssets.bind(null, projectId)}
      className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5"
    >
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">Icon subjects</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Optional final pass. Edit the list before generation; the image model
          will create a controlled light/dark icon sheet against the generated
          visual system.
        </p>
      </div>

      <textarea
        name="iconSubjects"
        className="mt-4 min-h-40 w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
        defaultValue={initialSubjects.join("\n")}
        disabled={disabled}
        placeholder={"home\ncalendar\nprofile\nchat\nsettings\nalerts"}
      />

      {disabled ? (
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {disabledReason}
        </p>
      ) : null}

      <IconSubmitButton disabled={disabled} />
      <IconPendingNote />
    </form>
  );
}

function IconSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={disabled || pending}
    >
      {pending ? <Spinner /> : null}
      {pending ? "Generating icons..." : "Generate optional icons"}
    </button>
  );
}

function IconPendingNote() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <p className="mt-3 max-w-2xl rounded-md border border-cyan-900/70 bg-cyan-950/30 px-3 py-2 text-sm leading-6 text-cyan-100">
      Icon generation started. Keep this page open while the model creates a
      controlled light/dark icon sheet using the generated background context.
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
