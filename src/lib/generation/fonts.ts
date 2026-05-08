export interface FontSystem {
  body: string;
  display: string;
  utility: string;
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
