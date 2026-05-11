import type {
  PaletteEffectPreference,
  PaletteGenerationInput,
} from "./input";

export interface PaletteToken {
  name: string;
  value: string;
}

export interface PaletteGroup {
  name: string;
  tokens: PaletteToken[];
}

export interface PaletteModeSpec {
  background: string;
  groups: PaletteGroup[];
  mode: "light" | "dark";
  reviewBackground: string;
  subtitle: string;
  title: string;
}

export interface PaletteSystem {
  dark: PaletteModeSpec;
  light: PaletteModeSpec;
  source: {
    accent: string;
    appCategory?: string;
    audience?: string;
    desiredMood?: string;
    dislikedColors: string[];
    effectPreference?: PaletteEffectPreference;
    likedColors: string[];
    primary: string;
    provider?: string;
    rationale?: string[];
    warnings?: string[];
  };
  summary: string;
}

export type PaletteBuildInput = PaletteGenerationInput;

export interface RuntimeAssetPalette {
  accent: string;
  background: string;
  border: string;
  primaryHover: string;
  primaryPressed: string;
  primarySoft: string;
  muted: string;
  primary: string;
  surface: string;
  surfaceMuted: string;
  text: string;
}

export function buildPaletteSystem(input: PaletteBuildInput): PaletteSystem {
  const inferredAnchors = inferPaletteAnchors(input);
  const primary = findAnchoredColor(input.likedColors, "primary") ??
    findHexColor(input.likedColors, 0) ??
    inferredAnchors.primary;
  const accent = findAnchoredColor(input.likedColors, "accent") ??
    findHexColor(input.likedColors, 1) ??
    inferredAnchors.accent;
  const appName = input.appName.trim() || "App";
  const effects = buildEffectGroup(input, primary, accent);

  const light = buildLightPalette(appName, primary, accent, effects);
  const dark = buildDarkPalette(appName, primary, accent, effects);

  return {
    dark,
    light,
    source: {
      accent,
      appCategory: input.appCategory,
      audience: input.audience,
      desiredMood: input.desiredMood,
      dislikedColors: input.dislikedColors,
      effectPreference: input.effectPreference,
      likedColors: input.likedColors,
      primary,
      provider: "deterministic",
      rationale:
        input.likedColors.length > 0
          ? [
              "Exact hex anchors were used when available.",
              "Functional UI tokens were derived from the primary hue.",
            ]
          : [
              "No liked colors were provided, so anchors were inferred from app category, audience, and mood.",
              "Functional UI tokens were derived from the inferred primary hue.",
            ],
      warnings: [],
    },
    summary: [
      `Primary anchor ${primary}.`,
      `Accent anchor ${accent}.`,
      `Light and dark palettes include base surfaces, typography, borders, primary states, and semantic/status tokens.`,
      effects
        ? `Effect tokens are ${input.effectPreference ?? "auto"} and should be used only for generated imagery or atmospheric accents.`
        : "No decorative effect tokens were requested.",
    ].join(" "),
  };
}

export function formatPaletteSystemForPrompt(palette: PaletteSystem | null) {
  if (!palette) {
    return "No approved palette system is available.";
  }

  return [
    "Use this approved UI token palette as hard color guidance.",
    palette.summary,
    formatModeForPrompt(palette.light),
    formatModeForPrompt(palette.dark),
  ].join("\n");
}

function inferPaletteAnchors(input: PaletteBuildInput) {
  const context = [
    input.appCategory,
    input.audience,
    input.desiredMood,
    input.appName,
  ]
    .join(" ")
    .toLowerCase();

  if (matchesAny(context, ["parent", "baby", "care", "calm", "wellness"])) {
    return { accent: "#d8a7a1", primary: "#b7791f" };
  }

  if (matchesAny(context, ["fitness", "health", "workout", "training"])) {
    return { accent: "#84cc16", primary: "#0f766e" };
  }

  if (matchesAny(context, ["finance", "bank", "invest", "budget"])) {
    return { accent: "#14b8a6", primary: "#1d4ed8" };
  }

  if (matchesAny(context, ["education", "learn", "school", "study"])) {
    return { accent: "#0ea5e9", primary: "#4f46e5" };
  }

  if (matchesAny(context, ["music", "dj", "club", "neon", "cyber"])) {
    return { accent: "#c026d3", primary: "#0891b2" };
  }

  if (matchesAny(context, ["luxury", "premium", "fashion", "editorial"])) {
    return { accent: "#b45309", primary: "#334155" };
  }

  const primary = hslToHex(hashHue(context || "mobile app"), 68, 42);

  return {
    accent: rotateHue(primary, 48),
    primary,
  };
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function paletteModeToAssetPalette(
  palette: PaletteModeSpec,
): RuntimeAssetPalette {
  return {
    accent: tokenValue(palette, "primary-soft") ?? tokenValue(palette, "accent") ?? "#d7f9ff",
    background: tokenValue(palette, "canvas") ?? palette.background,
    border: tokenValue(palette, "border-soft") ?? "#d9e2ea",
    muted: tokenValue(palette, "text-muted") ?? "#65717f",
    primary: tokenValue(palette, "primary") ?? "#0b7a88",
    primaryHover:
      tokenValue(palette, "primary-hover") ??
      tokenValue(palette, "primary") ??
      "#0b7a88",
    primaryPressed:
      tokenValue(palette, "primary-pressed") ??
      tokenValue(palette, "primary") ??
      "#075965",
    primarySoft:
      tokenValue(palette, "primary-soft") ??
      tokenValue(palette, "surface-soft") ??
      "#d7f9ff",
    surface: tokenValue(palette, "surface") ?? "#ffffff",
    surfaceMuted:
      tokenValue(palette, "surface-muted") ??
      tokenValue(palette, "surface-soft") ??
      tokenValue(palette, "border-soft") ??
      "#d9e2ea",
    text: tokenValue(palette, "text-primary") ?? "#101820",
  };
}

function buildLightPalette(
  appName: string,
  primary: string,
  accent: string,
  effects: PaletteGroup | null,
): PaletteModeSpec {
  const primaryHsl = hexToHsl(primary);
  const accentHsl = hexToHsl(accent);
  const canvas = hslToHex(primaryHsl.h, 24, 97);
  const textPrimary = hslToHex(primaryHsl.h, 50, 10);

  return {
    background: canvas,
    mode: "light",
    reviewBackground: canvas,
    subtitle: "Complete CSS token palette with grouped swatches and exact values.",
    title: `${appName} Light Palette`,
    groups: withOptionalEffects(
      [
        {
          name: "Base Surfaces",
          tokens: [
            token("canvas", canvas),
            token("surface", "#ffffff"),
            token("surface-soft", hslToHex(primaryHsl.h, 42, 96)),
            token("surface-muted", hslToHex(primaryHsl.h, 18, 90)),
          ],
        },
        {
          name: "Typography",
          tokens: [
            token("text-primary", textPrimary),
            token("text-secondary", hslToHex(primaryHsl.h, 10, 40)),
            token("text-muted", hslToHex(primaryHsl.h, 8, 54)),
          ],
        },
        {
          name: "Borders",
          tokens: [
            token("border-soft", hslToHex(primaryHsl.h, 20, 84)),
            token("border-medium", hslToHex(primaryHsl.h, 18, 76)),
          ],
        },
        {
          name: "Primary",
          tokens: [
            token("primary", primary),
            token("primary-hover", darken(primary, 10)),
            token("primary-pressed", darken(primary, 22)),
            token("primary-soft", mixHex(primary, "#ffffff", 0.78)),
          ],
        },
        {
          name: "Semantic / Status",
          tokens: [
            token("success", hslToHex(106, 24, 47)),
            token("success-soft", hslToHex(106, 30, 93)),
            token("info", hslToHex(203, 31, 49)),
            token("info-soft", hslToHex(203, 26, 93)),
            token("warning", hslToHex(40, 72, 51)),
            token("warning-soft", hslToHex(44, 88, 91)),
            token("danger", hslToHex(8, 42, 51)),
            token("danger-soft", hslToHex(7, 64, 94)),
            token("care", hslToHex(accentHsl.h, 38, 56)),
            token("care-soft", hslToHex(accentHsl.h, 52, 93)),
          ],
        },
      ],
      effects,
    ),
  };
}

function buildDarkPalette(
  appName: string,
  primary: string,
  accent: string,
  effects: PaletteGroup | null,
): PaletteModeSpec {
  const primaryHsl = hexToHsl(primary);
  const accentHsl = hexToHsl(accent);
  const canvas = hslToHex(primaryHsl.h, 30, 8);

  return {
    background: "#ffffff",
    mode: "dark",
    reviewBackground: canvas,
    subtitle: `Dark-theme CSS tokens shown on a white review background. RGBA swatches preview over ${canvas}.`,
    title: `${appName} Dark Palette`,
    groups: withOptionalEffects(
      [
        {
          name: "Base Surfaces",
          tokens: [
            token("canvas", canvas),
            token("surface", hslToHex(primaryHsl.h, 24, 12)),
            token("surface-soft", hslToHex(primaryHsl.h, 18, 16)),
            token("surface-elevated", hslToHex(primaryHsl.h, 14, 20)),
          ],
        },
        {
          name: "Typography",
          tokens: [
            token("text-primary", hslToHex(primaryHsl.h, 50, 96)),
            token("text-secondary", hslToHex(primaryHsl.h, 14, 78)),
            token("text-muted", hslToHex(primaryHsl.h, 12, 64)),
          ],
        },
        {
          name: "Borders",
          tokens: [
            token("border-soft", rgbaFromHex("#fffdf5", 0.1)),
            token("border-medium", rgbaFromHex("#fffdf5", 0.18)),
          ],
        },
        {
          name: "Primary",
          tokens: [
            token("primary", primary),
            token("primary-hover", lighten(primary, 8)),
            token("primary-pressed", darken(primary, 18)),
            token("primary-soft", rgbaFromHex(primary, 0.18)),
          ],
        },
        {
          name: "Semantic / Status",
          tokens: [
            token("success", hslToHex(105, 24, 71)),
            token("success-soft", rgbaFromHex(hslToHex(105, 24, 48), 0.2)),
            token("info", hslToHex(198, 27, 69)),
            token("info-soft", rgbaFromHex(hslToHex(198, 27, 48), 0.22)),
            token("warning", hslToHex(45, 88, 70)),
            token("warning-soft", rgbaFromHex(hslToHex(45, 62, 46), 0.18)),
            token("danger", hslToHex(8, 54, 67)),
            token("danger-soft", rgbaFromHex(hslToHex(8, 44, 46), 0.22)),
            token("care", hslToHex(accentHsl.h, 42, 68)),
            token("care-soft", rgbaFromHex(hslToHex(accentHsl.h, 34, 44), 0.2)),
          ],
        },
      ],
      effects,
    ),
  };
}

function withOptionalEffects(
  groups: PaletteGroup[],
  effects: PaletteGroup | null,
) {
  return effects ? [...groups, effects] : groups;
}

function buildEffectGroup(
  input: PaletteBuildInput,
  primary: string,
  accent: string,
): PaletteGroup | null {
  const intensity = resolveEffectIntensity(input);

  if (intensity === "none") {
    return null;
  }

  const primaryHsl = hexToHsl(primary);
  const accentHsl = hexToHsl(accent);
  const expressive = intensity === "expressive";

  return {
    name: "Effects / Atmosphere",
    tokens: [
      token("glow-primary", rgbaFromHex(primary, expressive ? 0.48 : 0.24)),
      token("glow-accent", rgbaFromHex(accent, expressive ? 0.42 : 0.18)),
      token("ambient-start", hslToHex(primaryHsl.h, 46, expressive ? 7 : 11)),
      token(
        "ambient-mid",
        hslToHex(accentHsl.h, expressive ? 68 : 38, expressive ? 22 : 18),
      ),
      token("ambient-end", hslToHex(primaryHsl.h, 48, 4)),
      token("edge-highlight", rgbaFromHex("#ffffff", expressive ? 0.34 : 0.18)),
    ],
  };
}

function resolveEffectIntensity(input: PaletteBuildInput) {
  if ((input.effectPreference ?? "auto") === "none") {
    return "none";
  }

  if (input.effectPreference === "subtle") {
    return "subtle";
  }

  if (input.effectPreference === "expressive") {
    return "expressive";
  }

  const text = [
    input.appCategory ?? "",
    input.audience ?? "",
    input.desiredMood ?? "",
    ...input.likedColors,
  ]
    .join(" ")
    .toLowerCase();

  if (
    /\b(neon|glow|glowing|cyberpunk|synthwave|electric|ambient|aura)\b/.test(
      text,
    )
  ) {
    return "expressive";
  }

  if (
    /\b(premium|depth|soft|warm|atmospheric|gradient|polished)\b/.test(text)
  ) {
    return "subtle";
  }

  return "none";
}

function formatModeForPrompt(mode: PaletteModeSpec) {
  const groups = mode.groups
    .map((group) => {
      const tokens = group.tokens
        .map((item) => `--${item.name}: ${item.value}`)
        .join(", ");

      return `${group.name}: ${tokens}.`;
    })
    .join("\n");

  return `${mode.mode.toUpperCase()} PALETTE\n${groups}`;
}

function token(name: string, value: string): PaletteToken {
  return { name, value };
}

function tokenValue(mode: PaletteModeSpec, name: string) {
  for (const group of mode.groups) {
    const found = group.tokens.find((item) => item.name === name);

    if (found) {
      return found.value;
    }
  }

  return undefined;
}

function findAnchoredColor(values: string[], anchor: "accent" | "primary") {
  const match = values
    .map((value) =>
      value.match(new RegExp(`${anchor}\\s+anchor\\s+(#[0-9a-f]{6})`, "i")),
    )
    .find(Boolean);

  return match?.[1]?.toLowerCase();
}

function findHexColor(values: string[], index: number) {
  const hexes = values
    .flatMap((value) => [...value.matchAll(/#[0-9a-f]{6}\b/gi)])
    .map((match) => match[0].toLowerCase());

  return hexes[index];
}

function rotateHue(hex: string, amount: number) {
  const hsl = hexToHsl(hex);
  return hslToHex((hsl.h + amount) % 360, hsl.s, hsl.l);
}

function hashHue(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 360;
}

function lighten(hex: string, amount: number) {
  const hsl = hexToHsl(hex);
  return hslToHex(hsl.h, hsl.s, Math.min(98, hsl.l + amount));
}

function darken(hex: string, amount: number) {
  const hsl = hexToHsl(hex);
  return hslToHex(hsl.h, hsl.s, Math.max(6, hsl.l - amount));
}

function mixHex(hex: string, target: string, targetWeight: number) {
  const sourceRgb = hexToRgb(hex);
  const targetRgb = hexToRgb(target);
  const sourceWeight = 1 - targetWeight;

  return rgbToHex({
    b: sourceRgb.b * sourceWeight + targetRgb.b * targetWeight,
    g: sourceRgb.g * sourceWeight + targetRgb.g * targetWeight,
    r: sourceRgb.r * sourceWeight + targetRgb.r * targetWeight,
  });
}

function rgbaFromHex(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: { b: number; g: number; r: number }) {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) =>
      Math.round(channel)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function hexToHsl(hex: string) {
  const rgb = hexToRgb(hex);
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue =
    max === r
      ? ((g - b) / delta) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;

  hue *= 60;

  return {
    h: hue < 0 ? hue + 360 : hue,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const chroma =
    (1 - Math.abs((2 * lightness) / 100 - 1)) * (saturation / 100);
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness / 100 - chroma / 2;
  const [r, g, b] =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];

  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
