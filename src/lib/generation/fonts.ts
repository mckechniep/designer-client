export interface FontSystem {
  body: string;
  display: string;
  utility: string;
}

export interface FontPreferenceInput {
  bodyFont: string;
  displayFont: string;
  fontPreferences: string;
  fontPreset: string;
  utilityFont: string;
}

const DEFAULT_FONT_SYSTEM: FontSystem = {
  body: "Inter",
  display: "Instrument Serif",
  utility: "JetBrains Mono",
};

export function parseFontSystem(fontPreferences?: string | null): FontSystem {
  const input = fontPreferences ?? "";

  return {
    body:
      extractFont(input, /Body\s*\/\s*Workhorse font:\s*([^.\n]+)/i) ??
      DEFAULT_FONT_SYSTEM.body,
    display:
      extractFont(input, /Display\s*\/\s*Voice font:\s*([^.\n]+)/i) ??
      DEFAULT_FONT_SYSTEM.display,
    utility:
      extractFont(input, /Utility\s*\/\s*Accent font:\s*([^.\n]+)/i) ??
      DEFAULT_FONT_SYSTEM.utility,
  };
}

export function svgFontStack(fontName: string, role: keyof FontSystem) {
  const familyFallback =
    role === "utility"
      ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      : serifLikeFont(fontName)
        ? "Georgia, Times New Roman, serif"
        : "Arial, Helvetica, sans-serif";

  return `&quot;${escapeFontFamily(fontName)}&quot;, ${familyFallback}`;
}

export function formatFontPreferences(input: FontPreferenceInput) {
  return [
    input.fontPreset ? `Suggested font pairing: ${input.fontPreset}.` : "",
    input.displayFont
      ? `Display / Voice font: ${input.displayFont}. Use for brand-first headlines, large moments, logos, and personality.`
      : "",
    input.bodyFont
      ? `Body / Workhorse font: ${input.bodyFont}. Use for paragraphs, UI labels, navigation, buttons, forms, and most client-facing text. It should do roughly 80% of the typography work.`
      : "",
    input.utilityFont
      ? `Utility / Accent font: ${input.utilityFont}. Use for timestamps, metadata, captions, data readouts, quotes, or small supporting moments.`
      : "",
    input.fontPreferences
      ? `Additional client font notes: ${input.fontPreferences}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function extractFont(input: string, pattern: RegExp) {
  const match = input.match(pattern);
  const font = match?.[1]?.trim();

  return font || null;
}

function serifLikeFont(fontName: string) {
  const value = fontName.toLowerCase();

  return (
    value.includes("serif") ||
    value.includes("lora") ||
    value.includes("fraunces") ||
    value.includes("tiempos") ||
    value.includes("recoleta") ||
    value.includes("reckless") ||
    value.includes("migra") ||
    value.includes("editorial") ||
    value.includes("boogy")
  );
}

function escapeFontFamily(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
