"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  generationStatusPresentation,
  shouldPollGenerationStatus,
  type GenerationStatusSnapshot,
  type GenerationStatusTone,
} from "@/lib/generation/status";

const POLL_INTERVAL_MS = 3000;

export function GenerationStatusPanel({
  initialSnapshot,
  projectId,
  showExistingActive = true,
}: {
  initialSnapshot: GenerationStatusSnapshot;
  projectId: string;
  showExistingActive?: boolean;
}) {
  const router = useRouter();
  const { pending } = useFormStatus();
  const [snapshot, setSnapshot] =
    useState<GenerationStatusSnapshot>(initialSnapshot);
  const [terminalGenerationId, setTerminalGenerationId] = useState<
    string | null
  >(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const refreshedGenerationIdRef = useRef<string | null>(null);
  const latest = snapshot.latest;
  const isActive =
    latest?.status === "queued" || latest?.status === "running";
  const shouldPoll = shouldPollGenerationStatus({
    formPending: pending,
    latestStatus: showExistingActive ? latest?.status : null,
  });
  const shouldDisplay =
    pending ||
    (showExistingActive && isActive) ||
    Boolean(latest?.id && latest.id === terminalGenerationId);
  const presentation = generationStatusPresentation({
    errorMessage: latest?.errorMessage,
    fileCount: latest?.fileCount ?? 0,
    formPending: pending,
    latestStatus: latest?.status,
  });

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    let cancelled = false;
    let timerId: number | undefined;

    async function pollStatus() {
      try {
        const response = await fetch(
          `/projects/${projectId}/generation-status`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Status check failed.");
        }

        const nextSnapshot =
          (await response.json()) as GenerationStatusSnapshot;

        if (cancelled) {
          return;
        }

        setSnapshot(nextSnapshot);
        setPollError(null);

        if (
          nextSnapshot.latest &&
          isTerminalStatus(nextSnapshot.latest.status) &&
          refreshedGenerationIdRef.current !== nextSnapshot.latest.id
        ) {
          setTerminalGenerationId(nextSnapshot.latest.id);
          refreshedGenerationIdRef.current = nextSnapshot.latest.id;
          router.refresh();
        }

        if (
          shouldPollGenerationStatus({
            formPending: pending,
            latestStatus: nextSnapshot.latest?.status,
          })
        ) {
          timerId = window.setTimeout(pollStatus, POLL_INTERVAL_MS);
        }
      } catch {
        if (cancelled) {
          return;
        }

        setPollError("Status check failed. This panel will retry.");
        timerId = window.setTimeout(pollStatus, POLL_INTERVAL_MS);
      }
    }

    timerId = window.setTimeout(pollStatus, 500);

    return () => {
      cancelled = true;
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [pending, projectId, router, shouldPoll]);

  if (!shouldDisplay) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`mt-4 rounded-md border px-4 py-3 ${toneClasses[presentation.tone]}`}
    >
      <div className="flex items-start gap-3">
        {presentation.tone === "running" ? <Spinner /> : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{presentation.title}</p>
          <p className="mt-1 text-sm leading-6 opacity-85">
            {presentation.body}
          </p>
          {latest ? (
            <dl className="mt-3 grid gap-2 text-xs opacity-80 sm:grid-cols-3">
              <StatusMeta label="Provider" value={latest.provider} />
              <StatusMeta label="Files" value={String(latest.fileCount)} />
              <StatusMeta
                label="Last checked"
                value={formatStatusTime(snapshot.polledAt)}
              />
            </dl>
          ) : null}
          {pollError ? (
            <p className="mt-2 text-xs leading-5 text-amber-100">
              {pollError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium opacity-70">{label}</dt>
      <dd className="mt-0.5 truncate">{value}</dd>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="mt-1 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

function isTerminalStatus(status: string) {
  return status === "failed" || status === "succeeded";
}

function formatStatusTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "just now";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

const toneClasses: Record<GenerationStatusTone, string> = {
  failed: "border-red-900/80 bg-red-950/30 text-red-100",
  idle: "border-zinc-800 bg-zinc-950/40 text-zinc-300",
  running: "border-cyan-900/80 bg-cyan-950/30 text-cyan-100",
  succeeded: "border-emerald-900/80 bg-emerald-950/25 text-emerald-100",
};
