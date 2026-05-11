import type { GenerationDecision, GenerationLimitState } from "./types";

const DEFAULT_CLIENT_MAX_GENERATIONS = 50;

export function canGenerate(state: GenerationLimitState): GenerationDecision {
  if (state.maxGenerations === null) {
    return {
      allowed: true,
      remaining: null,
    };
  }

  const remaining = Math.max(state.maxGenerations - state.usedGenerations, 0);

  return {
    allowed: remaining > 0,
    remaining,
  };
}

export function nextUsedGenerationCount({
  usedGenerations,
  producedUsableAssets,
}: {
  usedGenerations: number;
  producedUsableAssets: boolean;
}) {
  return producedUsableAssets ? usedGenerations + 1 : usedGenerations;
}

export function initialMaxGenerationsForEmail(
  email: string | null | undefined,
  configuredInternalEmails = process.env.INTERNAL_UNLIMITED_EMAILS ?? "",
) {
  if (!email) {
    return DEFAULT_CLIENT_MAX_GENERATIONS;
  }

  const normalizedEmail = normalizeEmail(email);
  const internalEmails = configuredInternalEmails
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);

  return internalEmails.includes(normalizedEmail)
    ? null
    : DEFAULT_CLIENT_MAX_GENERATIONS;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
