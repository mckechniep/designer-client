export interface IconSubjectGenerationInput {
  appCategory?: string;
  appName: string;
  audience?: string;
  desiredMood?: string;
  dislikedColors?: string[];
  likedColors?: string[];
  paletteSignature?: string;
  paletteSummary?: string;
}

export function iconSubjectInputSignature(input: IconSubjectGenerationInput) {
  const normalizedInput = normalizeIconSubjectInput(input);

  return JSON.stringify({
    appCategory: normalizedInput.appCategory,
    appName: normalizedInput.appName,
    audience: normalizedInput.audience,
    desiredMood: normalizedInput.desiredMood,
    dislikedColors: normalizedInput.dislikedColors,
    likedColors: normalizedInput.likedColors,
    paletteSignature: normalizedInput.paletteSignature,
  });
}

export function normalizeIconSubjects(
  subjects: string[],
  input: IconSubjectGenerationInput = { appName: "" },
) {
  const seen = new Set<string>();
  const normalized = subjects
    .map(cleanIconSubject)
    .filter(Boolean)
    .filter((subject) => {
      const key = subject.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 12);

  if (normalized.length >= 6) {
    return normalized;
  }

  return fallbackIconSubjects(input);
}

export function fallbackIconSubjects(input: IconSubjectGenerationInput) {
  const context = `${input.appCategory ?? ""} ${input.appName}`.toLowerCase();

  if (
    context.includes("parent") ||
    context.includes("baby") ||
    context.includes("child") ||
    context.includes("family")
  ) {
    return [
      "home",
      "feeding",
      "sleep",
      "diaper",
      "growth",
      "calendar",
      "timer",
      "checklist",
      "health",
      "chat",
      "profile",
      "settings",
    ];
  }

  if (context.includes("fitness") || context.includes("health")) {
    return [
      "home",
      "workout",
      "timer",
      "progress",
      "heart",
      "meal",
      "calendar",
      "checklist",
      "chat",
      "profile",
      "settings",
      "alert",
    ];
  }

  if (
    context.includes("finance") ||
    context.includes("budget") ||
    context.includes("bank") ||
    context.includes("invest")
  ) {
    return [
      "home",
      "wallet",
      "transactions",
      "budget",
      "savings",
      "chart",
      "card",
      "calendar",
      "alert",
      "profile",
      "settings",
      "search",
    ];
  }

  return [
    "home",
    "profile",
    "calendar",
    "timer",
    "checklist",
    "heart",
    "chat",
    "stats",
    "settings",
    "alert",
    "search",
    "bookmark",
  ];
}

export function normalizeIconSubjectInput(
  input: IconSubjectGenerationInput,
): Required<IconSubjectGenerationInput> {
  return {
    appCategory: input.appCategory?.trim() ?? "",
    appName: input.appName.trim(),
    audience: input.audience?.trim() ?? "",
    desiredMood: input.desiredMood?.trim() ?? "",
    dislikedColors: normalizeList(input.dislikedColors ?? []),
    likedColors: normalizeList(input.likedColors ?? []),
    paletteSignature: input.paletteSignature?.trim() ?? "",
    paletteSummary: input.paletteSummary?.trim() ?? "",
  };
}

function normalizeList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function cleanIconSubject(value: string) {
  return value
    .replace(/^[\d.)\-\s]+/, "")
    .replace(/[^\w\s/&+-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}
