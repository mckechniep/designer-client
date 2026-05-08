import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import type { PaletteGenerationInput } from "./input";
import { normalizePaletteEffectPreference } from "./input";
import { buildPaletteSystem, type PaletteGroup, type PaletteModeSpec, type PaletteSystem } from "./spec";
import { PaletteSystemSchema } from "./validation";

const PaletteTokenSchema = z.object({
  name: z.string(),
  value: z.string(),
});

const PaletteGroupSchema = z.object({
  name: z.string(),
  tokens: z.array(PaletteTokenSchema),
});

const PaletteModeSchema = z.object({
  background: z.string(),
  groups: z.array(PaletteGroupSchema),
  mode: z.enum(["light", "dark"]),
  reviewBackground: z.string(),
  subtitle: z.string(),
  title: z.string(),
});

const LlmPaletteSchema = z.object({
  dark: PaletteModeSchema,
  light: PaletteModeSchema,
  source: z.object({
    accent: z.string(),
    appCategory: z.string(),
    audience: z.string(),
    desiredMood: z.string(),
    dislikedColors: z.array(z.string()),
    effectPreference: z.enum(["auto", "none", "subtle", "expressive"]),
    likedColors: z.array(z.string()),
    primary: z.string(),
    provider: z.string(),
    rationale: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
  summary: z.string(),
});

const REQUIRED_GROUPS = [
  "Base Surfaces",
  "Typography",
  "Borders",
  "Primary",
  "Semantic / Status",
];
const EFFECTS_GROUP = "Effects / Atmosphere";

export async function generatePaletteSystem(
  input: PaletteGenerationInput,
): Promise<PaletteSystem> {
  const normalizedInput = normalizePaletteInput(input);

  if (env.GENERATION_PROVIDER !== "openai") {
    return buildPaletteSystem(normalizedInput);
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: env.OPENAI_PALETTE_MODEL,
    input: [
      {
        role: "system",
        content: [
          "You are a senior mobile product designer creating exact UI color tokens.",
          "Return only the structured palette JSON requested by the schema.",
          "Interpret typed color words like neon, sage, cream, cyberpunk, clinical, warm, luxury, playful, and calm into exact usable hex tokens.",
          "Audience and app category must influence the tone. A parenting app and a DJ app should not use neon/glow the same way.",
          "Functional UI tokens must remain readable and professional. Do not use glow colors as body text or primary surfaces.",
          "If effectPreference is none, omit the Effects / Atmosphere group.",
          "If effectPreference is subtle, use restrained effect tokens for gentle depth, gradients, or bloom.",
          "If effectPreference is expressive, glow/neon tokens are allowed only for generated imagery, source screens, hero backgrounds, aura, and rim-light effects.",
          "If exact Primary anchor or Accent anchor hex values are present, preserve them as source.primary/source.accent and the --primary token unless readability requires a state adjustment.",
          "Treat disliked colors as disallowed for brand identity, primary/accent, base surfaces, decorative effects, and dominant imagery.",
          "Do not remove or neutralize required semantic status tokens just because a disliked color word overlaps a UI convention. If red is disliked, still provide an accessible --danger and --danger-soft, but make it subdued, professional, and limited to error/destructive UI states only.",
          "Likewise, preserve usable success, warning, info, and care tokens even when green, yellow, blue, or pink are disliked; avoid using those colors outside their semantic role.",
          "Required light groups: Base Surfaces, Typography, Borders, Primary, Semantic / Status.",
          "Required dark groups: Base Surfaces, Typography, Borders, Primary, Semantic / Status.",
          "Required Primary tokens: primary, primary-hover, primary-pressed, primary-soft.",
          "Required semantic tokens: success, success-soft, info, info-soft, warning, warning-soft, danger, danger-soft, care, care-soft.",
          "Use #RRGGBB for solid colors and rgba(r, g, b, a) for overlays.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          appCategory: normalizedInput.appCategory,
          appName: normalizedInput.appName,
          audience: normalizedInput.audience,
          desiredMood: normalizedInput.desiredMood,
          dislikedColors: normalizedInput.dislikedColors,
          effectPreference: normalizedInput.effectPreference,
          likedColors: normalizedInput.likedColors,
        }),
      },
    ],
    text: {
      format: zodTextFormat(LlmPaletteSchema, "palette_system"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI did not return a palette system.");
  }

  return normalizeGeneratedPalette(response.output_parsed, normalizedInput);
}

function normalizePaletteInput(
  input: PaletteGenerationInput,
): Required<PaletteGenerationInput> {
  return {
    appCategory: input.appCategory?.trim() ?? "",
    appName: input.appName.trim(),
    audience: input.audience?.trim() ?? "",
    desiredMood: input.desiredMood?.trim() ?? "",
    dislikedColors: normalizeList(input.dislikedColors),
    effectPreference: normalizePaletteEffectPreference(
      input.effectPreference ?? "auto",
    ),
    likedColors: normalizeList(input.likedColors),
  };
}

function normalizeGeneratedPalette(
  raw: z.infer<typeof LlmPaletteSchema>,
  input: Required<PaletteGenerationInput>,
): PaletteSystem {
  const fallback = buildPaletteSystem(input);
  const parsed = PaletteSystemSchema.parse(raw) as PaletteSystem;
  const primary = exactAnchor(input.likedColors, "primary") ??
    validColor(parsed.source.primary) ??
    fallback.source.primary;
  const accent = exactAnchor(input.likedColors, "accent") ??
    validColor(parsed.source.accent) ??
    fallback.source.accent;

  return {
    dark: normalizeMode(parsed.dark, fallback.dark, input),
    light: normalizeMode(parsed.light, fallback.light, input),
    source: {
      ...parsed.source,
      accent,
      appCategory: input.appCategory,
      audience: input.audience,
      desiredMood: input.desiredMood,
      dislikedColors: input.dislikedColors,
      effectPreference: input.effectPreference,
      likedColors: input.likedColors,
      primary,
      provider: `openai:${env.OPENAI_PALETTE_MODEL}`,
    },
    summary: parsed.summary.trim() || fallback.summary,
  };
}

function normalizeMode(
  rawMode: PaletteModeSpec,
  fallbackMode: PaletteModeSpec,
  input: Required<PaletteGenerationInput>,
): PaletteModeSpec {
  const rawGroups = rawMode.groups;
  const groups = fallbackMode.groups
    .filter((group) => REQUIRED_GROUPS.includes(group.name))
    .map((fallbackGroup) => {
      const rawGroup = findGroup(rawGroups, fallbackGroup.name);

      return {
        ...fallbackGroup,
        tokens: fallbackGroup.tokens.map((fallbackToken) => {
          const rawToken = rawGroup?.tokens.find(
            (token) => token.name === fallbackToken.name,
          );
          const value = validColor(rawToken?.value) ?? fallbackToken.value;

          return { ...fallbackToken, value };
        }),
      };
    });
  const rawEffects = findGroup(rawGroups, EFFECTS_GROUP);
  const fallbackEffects = findGroup(fallbackMode.groups, EFFECTS_GROUP);
  const effects = normalizeEffectsGroup(rawEffects, fallbackEffects, input);

  if (effects) {
    groups.push(effects);
  }

  return {
    ...fallbackMode,
    background: validColor(rawMode.background) ?? fallbackMode.background,
    groups,
    reviewBackground:
      validColor(rawMode.reviewBackground) ?? fallbackMode.reviewBackground,
    subtitle: rawMode.subtitle.trim() || fallbackMode.subtitle,
    title: rawMode.title.trim() || fallbackMode.title,
  };
}

function normalizeEffectsGroup(
  rawGroup: PaletteGroup | undefined,
  fallbackGroup: PaletteGroup | undefined,
  input: Required<PaletteGenerationInput>,
) {
  if (input.effectPreference === "none") {
    return null;
  }

  const sourceGroup = rawGroup ?? fallbackGroup;

  if (!sourceGroup) {
    return null;
  }

  const tokens = sourceGroup.tokens
    .map((token) => {
      const value = validColor(token.value);
      return value ? { name: token.name, value } : null;
    })
    .filter((token): token is { name: string; value: string } => Boolean(token));

  return tokens.length > 0 ? { name: EFFECTS_GROUP, tokens } : null;
}

function findGroup(groups: PaletteGroup[], name: string) {
  return groups.find((group) => group.name === name);
}

function validColor(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return value.toLowerCase();
  }

  if (
    /^rgba\(\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(0|0?\.\d+|1|1\.0+)\s*\)$/i.test(
      value,
    )
  ) {
    return value;
  }

  return null;
}

function exactAnchor(values: string[], anchor: "accent" | "primary") {
  const match = values
    .map((value) =>
      value.match(new RegExp(`${anchor}\\s+anchor\\s+(#[0-9a-f]{6})`, "i")),
    )
    .find(Boolean);

  return match?.[1]?.toLowerCase() ?? null;
}

function normalizeList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}
