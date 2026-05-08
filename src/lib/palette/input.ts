export type PaletteEffectPreference =
  | "auto"
  | "expressive"
  | "none"
  | "subtle";

export const paletteEffectPreferences: PaletteEffectPreference[] = [
  "auto",
  "none",
  "subtle",
  "expressive",
];

export interface PaletteGenerationInput {
  appCategory?: string;
  appName: string;
  audience?: string;
  desiredMood?: string;
  dislikedColors: string[];
  effectPreference?: PaletteEffectPreference;
  likedColors: string[];
}

export function normalizePaletteEffectPreference(
  value: string,
): PaletteEffectPreference {
  return paletteEffectPreferences.includes(value as PaletteEffectPreference)
    ? (value as PaletteEffectPreference)
    : "auto";
}

export function paletteInputSignature(input: PaletteGenerationInput) {
  return JSON.stringify({
    appCategory: input.appCategory?.trim() ?? "",
    appName: input.appName.trim(),
    audience: input.audience?.trim() ?? "",
    desiredMood: input.desiredMood?.trim() ?? "",
    dislikedColors: normalizeList(input.dislikedColors),
    effectPreference: input.effectPreference ?? "auto",
    likedColors: normalizeList(input.likedColors),
  });
}

function normalizeList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}
