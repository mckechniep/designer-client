export type GenerationStatusValue =
  | "failed"
  | "queued"
  | "running"
  | "succeeded"
  | string;

export interface GenerationStatusLatest {
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  fileCount: number;
  id: string;
  model: string;
  provider: string;
  status: GenerationStatusValue;
}

export interface GenerationStatusSnapshot {
  latest: GenerationStatusLatest | null;
  polledAt: string;
}

export type GenerationStatusTone = "failed" | "idle" | "running" | "succeeded";

export function shouldPollGenerationStatus({
  formPending,
  latestStatus,
}: {
  formPending: boolean;
  latestStatus: GenerationStatusValue | null | undefined;
}) {
  return formPending || latestStatus === "queued" || latestStatus === "running";
}

export function generationStatusPresentation({
  errorMessage,
  fileCount,
  formPending,
  latestStatus,
}: {
  errorMessage?: string | null;
  fileCount: number;
  formPending: boolean;
  latestStatus: GenerationStatusValue | null | undefined;
}): {
  body: string;
  title: string;
  tone: GenerationStatusTone;
} {
  if (!latestStatus && formPending) {
    return {
      body: "The request is being created. The status will update here once the generation record exists.",
      title: "Starting generation",
      tone: "running",
    };
  }

  if (latestStatus === "queued") {
    return {
      body: "The generation is queued and waiting to start.",
      title: "Generation queued",
      tone: "running",
    };
  }

  if (latestStatus === "running") {
    return {
      body:
        "The image model is generating the light and dark source background plates. This can take 10-20 minutes.",
      title: "Generating background package",
      tone: "running",
    };
  }

  if (latestStatus === "succeeded") {
    return {
      body: `Background package finished and saved with ${fileCount} file${fileCount === 1 ? "" : "s"}.`,
      title: "Generation complete",
      tone: "succeeded",
    };
  }

  if (latestStatus === "failed") {
    return {
      body:
        errorMessage ||
        "The generation failed before a usable package was created.",
      title: "Generation failed",
      tone: "failed",
    };
  }

  return {
    body: "No generation is running right now.",
    title: "No active generation",
    tone: "idle",
  };
}
