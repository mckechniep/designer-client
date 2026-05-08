import { createDownloadPackage } from "./download-package";
import { parseFontSystem, svgFontStack } from "./fonts";
import sharp, { renderSvgToPng } from "./svg-renderer";
import {
  paletteModeToAssetPalette,
  type PaletteModeSpec,
  type RuntimeAssetPalette,
} from "@/lib/palette/spec";
import type {
  AssetPackageOptions,
  GeneratedAssetPackage,
  GeneratedImage,
} from "./provider";

type AssetMode = "light" | "dark";
type AssetPalette = RuntimeAssetPalette;

interface ColorSample {
  h: number;
  l: number;
  luminance: number;
  s: number;
}

const fallbackPalettes: Record<AssetMode, AssetPalette> = {
  light: {
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#101820",
    muted: "#65717f",
    primary: "#0b7a88",
    primaryHover: "#0f8ea0",
    primaryPressed: "#075965",
    primarySoft: "#d7f9ff",
    accent: "#d7f9ff",
    border: "#d9e2ea",
    surfaceMuted: "#e8eef4",
  },
  dark: {
    background: "#06121f",
    surface: "#0b1b2b",
    text: "#eef8fb",
    muted: "#9fb2bf",
    primary: "#7de7ff",
    primaryHover: "#a7f3ff",
    primaryPressed: "#56bfd7",
    primarySoft: "rgba(125, 231, 255, 0.18)",
    accent: "#0b485f",
    border: "#244255",
    surfaceMuted: "#334155",
  },
};

export async function createThumbnail(
  image: GeneratedImage,
): Promise<GeneratedImage> {
  const bytes = await sharp(image.bytes)
    .resize({ width: 360, height: 640, fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  return {
    kind: "thumbnail",
    fileName: "thumbnail.webp",
    mimeType: "image/webp",
    width: 360,
    height: 640,
    bytes,
  };
}

export async function createPracticalWebp(
  image: GeneratedImage,
): Promise<GeneratedImage> {
  const bytes = await sharp(image.bytes)
    .resize({
      width: 1440,
      height: 2560,
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: 88 })
    .toBuffer();

  return {
    kind: "master_background",
    fileName: "master-background.webp",
    mimeType: "image/webp",
    width: 1440,
    height: 2560,
    bytes,
  };
}

export async function createPaletteSheet(
  mode: AssetMode,
  options: AssetPackageOptions = {},
  palette: AssetPalette = fallbackPalettes[mode],
  paletteSpec?: PaletteModeSpec,
): Promise<GeneratedImage> {
  if (paletteSpec) {
    return createDetailedPaletteSheet(mode, options, palette, paletteSpec);
  }

  const width = 1600;
  const height = 1000;
  const swatches = Object.entries(palette)
    .map(([name, color], index) => {
      const x = 96 + (index % 4) * 360;
      const y = 220 + Math.floor(index / 4) * 280;

      return `
        <g>
          <rect x="${x}" y="${y}" width="260" height="150" rx="22" fill="${color}"/>
          <text x="${x}" y="${y + 205}" fill="${palette.text}" font-size="32" font-family="Arial" font-weight="700">${name}</text>
          <text x="${x}" y="${y + 250}" fill="${palette.muted}" font-size="28" font-family="Arial">${color}</text>
        </g>
      `;
    })
    .join("");
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${palette.background}"/>
      <text x="96" y="112" fill="${palette.text}" font-size="56" font-family="Arial" font-weight="700">${titleCase(mode)} palette</text>
      <text x="96" y="170" fill="${palette.muted}" font-size="28" font-family="Arial">Implementation-ready colors for mobile UI assets</text>
      ${swatches}
    </svg>
  `;

  return imageFromSvg({
    svg,
    kind: mode === "light" ? "palette_light" : "palette_dark",
    fileName: `${assetPrefix(options)}${mode}-palette.png`,
    width,
    height,
  });
}

async function createDetailedPaletteSheet(
  mode: AssetMode,
  options: AssetPackageOptions,
  palette: AssetPalette,
  paletteSpec: PaletteModeSpec,
): Promise<GeneratedImage> {
  const width = 1600;
  const columns = 4;
  const cardWidth = 320;
  const cardHeight = 130;
  const columnGap = 36;
  const rowGap = 42;
  const titleColor = "#2e1c02";
  const mutedColor = "#6a5e55";
  let y = 220;
  const sections = paletteSpec.groups
    .map((group) => {
      const sectionY = y;
      const swatches = group.tokens
        .map((token, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          const x = 68 + column * (cardWidth + columnGap);
          const cardY = sectionY + 46 + row * (cardHeight + rowGap);
          const swatchFill = token.value.startsWith("rgba(")
            ? paletteSpec.reviewBackground
            : token.value;

          return `
            <g>
              <rect x="${x + 5}" y="${cardY + 5}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="#ddd7ce"/>
              <rect x="${x}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="#fffdf8" stroke="#d7cbbc"/>
              <rect x="${x + 14}" y="${cardY + 14}" width="${cardWidth - 28}" height="68" rx="12" fill="${swatchFill}" stroke="#d7cbbc"/>
              ${
                token.value.startsWith("rgba(")
                  ? `<rect x="${x + 14}" y="${cardY + 14}" width="${cardWidth - 28}" height="68" rx="12" fill="${token.value}"/>`
                  : ""
              }
              <text x="${x + 28}" y="${cardY + 58}" fill="${textForSwatch(token.value, palette.text)}" font-size="21" font-family="Arial">${token.value}</text>
              <text x="${x + 14}" y="${cardY + 106}" fill="${titleColor}" font-size="25" font-family="Arial" font-weight="800">--${token.name}</text>
              <text x="${x + 14}" y="${cardY + 126}" fill="${mutedColor}" font-size="16" font-family="Arial">${token.value}</text>
            </g>
          `;
        })
        .join("");
      const rows = Math.ceil(group.tokens.length / columns);

      y += 70 + rows * cardHeight + Math.max(0, rows - 1) * rowGap + 44;

      return `
        <g>
          <text x="68" y="${sectionY}" fill="${titleColor}" font-size="34" font-family="Arial" font-weight="800">${group.name}</text>
          ${swatches}
        </g>
      `;
    })
    .join("");
  const height = y + 40;
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${paletteSpec.background}"/>
      <text x="68" y="96" fill="${titleColor}" font-size="58" font-family="Arial" font-weight="900">${escapeSvg(paletteSpec.title)}</text>
      <text x="68" y="136" fill="${mutedColor}" font-size="24" font-family="Arial">${escapeSvg(paletteSpec.subtitle)}</text>
      ${sections}
    </svg>
  `;

  return imageFromSvg({
    svg,
    kind: mode === "light" ? "palette_light" : "palette_dark",
    fileName: `${assetPrefix(options)}${mode}-palette.png`,
    width,
    height,
  });
}

export async function createButtonSheet(
  mode: AssetMode,
  options: AssetPackageOptions = {},
  palette: AssetPalette = fallbackPalettes[mode],
): Promise<GeneratedImage> {
  const width = 2400;
  const height = 1600;
  const svg = createButtonSheetSvg(mode, {
    fontPreferences: options.fontPreferences,
    palette,
    version: assetVersion(options),
  });

  return imageFromSvg({
    svg,
    kind: mode === "light" ? "buttons_light" : "buttons_dark",
    fileName: `buttons-${mode}-all-${assetVersion(options)}.png`,
    width,
    height,
  });
}

export function createButtonSheetSvg(
  mode: AssetMode,
  {
    fontPreferences,
    palette = fallbackPalettes[mode],
  }: {
    fontPreferences?: string;
    palette?: AssetPalette;
    version?: string;
  } = {},
) {
  const width = 2400;
  const height = 1600;
  const fonts = parseFontSystem(fontPreferences);
  const bodyFontStack = svgFontStack(fonts.body, "body");
  const displayFontStack = svgFontStack(fonts.display, "display");
  const variants = [
    ["Primary", palette.primary, buttonTextForFill(palette.primary, mode)],
    [
      "Hover",
      palette.primaryHover,
      buttonTextForFill(palette.primaryHover, mode),
    ],
    [
      "Pressed",
      palette.primaryPressed,
      buttonTextForFill(palette.primaryPressed, mode),
    ],
    ["Secondary", palette.surface, palette.text],
    ["Soft", palette.primarySoft, palette.text],
    ["Disabled", palette.surfaceMuted, palette.muted],
  ];
  const rows = variants
    .map(([label, fill, text], index) => {
      const y = 260 + index * 205;
      const normalizedFill = normalizeCssColor(fill);

      return `
        <g>
          <text x="140" y="${y + 72}" fill="${normalizeCssColor(palette.text)}" font-size="34" font-family="${bodyFontStack}" font-weight="700">${label}</text>
          <rect x="520" y="${y}" width="760" height="118" rx="32" fill="${normalizedFill}" stroke="${normalizeCssColor(palette.border)}" stroke-width="3"/>
          <text x="900" y="${y + 75}" text-anchor="middle" fill="${normalizeCssColor(text)}" font-size="37" font-family="${bodyFontStack}" font-weight="700">${label} button</text>
          <rect x="1380" y="${y}" width="360" height="118" rx="32" fill="${normalizedFill}" stroke="${normalizeCssColor(palette.border)}" stroke-width="3"/>
          <text x="1560" y="${y + 75}" text-anchor="middle" fill="${normalizeCssColor(text)}" font-size="37" font-family="${bodyFontStack}" font-weight="700">Tap</text>
          <rect x="1840" y="${y}" width="250" height="118" rx="32" fill="${normalizedFill}" stroke="${normalizeCssColor(palette.border)}" stroke-width="3"/>
          <text x="1965" y="${y + 75}" text-anchor="middle" fill="${normalizeCssColor(text)}" font-size="37" font-family="${bodyFontStack}" font-weight="700">OK</text>
        </g>
      `;
    })
    .join("");
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${normalizeCssColor(palette.background)}"/>
      <text x="140" y="120" fill="${normalizeCssColor(palette.text)}" font-size="60" font-family="${displayFontStack}" font-weight="700">${titleCase(mode)} button sheet</text>
      <text x="140" y="178" fill="${normalizeCssColor(palette.muted)}" font-size="29" font-family="${bodyFontStack}">Static button states using ${escapeSvg(fonts.body)} and approved palette tokens</text>
      ${rows}
    </svg>
  `;
}

export async function createIconSet(
  mode: AssetMode,
  options: AssetPackageOptions = {},
  palette: AssetPalette = fallbackPalettes[mode],
): Promise<GeneratedImage> {
  const width = 2400;
  const height = 1600;
  const subjects = iconSubjects(options.iconSubjects);
  const tiles = subjects
    .slice(0, 12)
    .map((subject, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = 140 + column * 560;
      const y = 250 + row * 390;
      const centerX = x + 170;
      const centerY = y + 140;

      return `
        <g>
          <rect x="${x}" y="${y}" width="340" height="260" rx="38" fill="${palette.surface}" stroke="${palette.border}" stroke-width="3"/>
          ${iconSvg(subject, centerX, centerY, palette)}
          <text x="${centerX}" y="${y + 222}" text-anchor="middle" fill="${palette.text}" font-size="34" font-family="Arial" font-weight="700">${escapeSvg(subject.label)}</text>
        </g>
      `;
    })
    .join("");
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${palette.background}"/>
      <text x="140" y="130" fill="${palette.text}" font-size="64" font-family="Arial" font-weight="700">${titleCase(mode)} app icon set</text>
      <text x="140" y="190" fill="${palette.muted}" font-size="30" font-family="Arial">Static utility icons for mobile app screens and asset handoff</text>
      ${tiles}
    </svg>
  `;

  return imageFromSvg({
    svg,
    kind: mode === "light" ? "icon_set_light" : "icon_set_dark",
    fileName: `icons-${mode}-all-${assetVersion(options)}.png`,
    width,
    height,
  });
}

export async function createPlainScreen(
  image: GeneratedImage,
  mode: AssetMode,
  palette: AssetPalette = fallbackPalettes[mode],
): Promise<GeneratedImage> {
  const width = 1440;
  const height = 2560;

  if (mode === "light") {
    const bytes = await sharp(image.bytes)
      .resize({ width, height, fit: "cover", position: "center" })
      .png()
      .toBuffer();

    return {
      kind: "screen_plain_light",
      fileName: "light-screen.png",
      mimeType: "image/png",
      width,
      height,
      bytes,
    };
  }

  const base = await sharp(image.bytes)
    .resize({ width, height, fit: "cover" })
    .modulate({
      brightness: 0.52,
      saturation: 0.82,
    })
    .blur(3)
    .png()
    .toBuffer();
  const overlaySvg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${palette.background}" opacity="0.42"/>
      <rect x="96" y="210" width="1248" height="2140" rx="64" fill="${palette.surface}" opacity="0.10" stroke="${palette.border}" stroke-width="4"/>
    </svg>
  `;
  const bytes = await sharp(base)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  return {
    kind: "screen_plain_dark",
    fileName: "dark-screen.png",
    mimeType: "image/png",
    width,
    height,
    bytes,
  };
}

export async function createAssetPackage(
  master: GeneratedImage,
  options: AssetPackageOptions = {},
): Promise<GeneratedAssetPackage> {
  const packagePalettes = options.paletteSystem
    ? {
        light: paletteModeToAssetPalette(options.paletteSystem.light),
        dark: paletteModeToAssetPalette(options.paletteSystem.dark),
      }
    : await createPackagePalettes(master);
  const generatedAssets = options.generatedAssets ?? [];
  const generatedDarkScreen = generatedAssets.find(
    (asset) => asset.kind === "screen_plain_dark",
  );
  const canonicalGeneratedAssets = generatedAssets.filter(
    (asset) => asset.kind === "icon_set_showcase",
  );
  const files = [
    master,
    await createPracticalWebp(master),
    await createPlainScreen(master, "light", packagePalettes.light),
    generatedDarkScreen ??
      (await createPlainScreen(master, "dark", packagePalettes.dark)),
    ...canonicalGeneratedAssets,
    await createPaletteSheet(
      "light",
      options,
      packagePalettes.light,
      options.paletteSystem?.light,
    ),
    await createPaletteSheet(
      "dark",
      options,
      packagePalettes.dark,
      options.paletteSystem?.dark,
    ),
    await createButtonSheet("light", options, packagePalettes.light),
    await createButtonSheet("dark", options, packagePalettes.dark),
    await createThumbnail(master),
  ];
  const manifest = {
    version: "asset-package-v1",
    files: files.map((file) => ({
      kind: file.kind,
      path: assetPath(file),
      fileName: file.fileName,
      mimeType: file.mimeType,
      width: file.width,
      height: file.height,
      byteSize: file.bytes.byteLength,
    })),
  };
  const downloadPackage = await createDownloadPackage({ files, manifest }, options);

  return {
    files,
    downloadPackage,
    manifest,
  };
}

async function createPackagePalettes(
  image: GeneratedImage,
): Promise<Record<AssetMode, AssetPalette>> {
  const samples = await sampleImageColors(image);
  const primary = pickPrimarySample(samples);
  const accent = pickAccentSample(samples, primary);
  const primaryHue = Math.round(primary.h);
  const accentHue = Math.round(accent.h);

  return {
    light: {
      background: hslToHex(primaryHue, 30, 96),
      surface: "#ffffff",
      text: hslToHex(primaryHue, 36, 9),
      muted: hslToHex(primaryHue, 14, 42),
      primary: hslToHex(primaryHue, 68, 34),
      primaryHover: hslToHex(primaryHue, 70, 40),
      primaryPressed: hslToHex(primaryHue, 68, 28),
      primarySoft: hslToHex(primaryHue, 74, 90),
      accent: hslToHex(accentHue, 82, 88),
      border: hslToHex(primaryHue, 22, 84),
      surfaceMuted: hslToHex(primaryHue, 24, 90),
    },
    dark: {
      background: hslToHex(primaryHue, 54, 7),
      surface: hslToHex(primaryHue, 42, 13),
      text: hslToHex(accentHue, 32, 94),
      muted: hslToHex(primaryHue, 18, 72),
      primary: hslToHex(accentHue, 76, 72),
      primaryHover: hslToHex(accentHue, 78, 78),
      primaryPressed: hslToHex(accentHue, 70, 62),
      primarySoft: `rgba(${hslColorChannels(accentHue, 76, 72).join(", ")}, 0.18)`,
      accent: hslToHex(primaryHue, 58, 24),
      border: hslToHex(primaryHue, 32, 30),
      surfaceMuted: hslToHex(primaryHue, 32, 22),
    },
  };
}

async function sampleImageColors(image: GeneratedImage): Promise<ColorSample[]> {
  const { data, info } = await sharp(image.bytes)
    .resize({ width: 32, height: 32, fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const samples: ColorSample[] = [];

  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const hsl = rgbToHsl(r, g, b);

    samples.push({
      ...hsl,
      luminance: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255,
    });
  }

  return samples;
}

function pickPrimarySample(samples: ColorSample[]) {
  return samples.reduce(
    (best, sample) =>
      sampleScore(sample, 54) > sampleScore(best, 54) ? sample : best,
    samples[0] ?? { h: 190, l: 50, luminance: 0.5, s: 70 },
  );
}

function pickAccentSample(samples: ColorSample[], primary: ColorSample) {
  const candidates = samples.filter(
    (sample) => hueDistance(sample.h, primary.h) > 28,
  );
  const pool = candidates.length > 0 ? candidates : samples;
  const fallback = {
    h: (primary.h + 72) % 360,
    l: 68,
    luminance: 0.6,
    s: Math.max(primary.s, 70),
  };

  return pool.reduce(
    (best, sample) =>
      sampleScore(sample, 68) > sampleScore(best, 68) ? sample : best,
    fallback,
  );
}

function sampleScore(sample: ColorSample, targetLightness: number) {
  const lightnessPenalty = Math.abs(sample.l - targetLightness);
  return sample.s * 2 + sample.luminance * 35 - lightnessPenalty;
}

function rgbToHsl(r: number, g: number, b: number) {
  const normalizedR = r / 255;
  const normalizedG = g / 255;
  const normalizedB = b / 255;
  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation =
    delta / (1 - Math.abs(2 * lightness - 1));
  let hue =
    max === normalizedR
      ? ((normalizedG - normalizedB) / delta) % 6
      : max === normalizedG
        ? (normalizedB - normalizedR) / delta + 2
        : (normalizedR - normalizedG) / delta + 4;

  hue *= 60;

  return {
    h: hue < 0 ? hue + 360 : hue,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  return `#${hslColorChannels(hue, saturation, lightness)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function hslColorChannels(
  hue: number,
  saturation: number,
  lightness: number,
) {
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

  return [r, g, b].map((channel) => Math.round((channel + match) * 255));
}

function hueDistance(a: number, b: number) {
  const distance = Math.abs(a - b);
  return Math.min(distance, 360 - distance);
}

interface IconSubject {
  label: string;
  type: string;
}

function iconSubjects(subjects: string[] | undefined): IconSubject[] {
  const defaults = [
    "home",
    "profile",
    "calendar",
    "feeding",
    "sleep",
    "timer",
    "checklist",
    "heart",
    "chat",
    "stats",
    "settings",
    "alert",
  ];
  const values = (subjects && subjects.length > 0 ? subjects : defaults)
    .map((subject) => subject.trim())
    .filter(Boolean);

  return values.map((label) => ({
    label,
    type: normalizeIconType(label),
  }));
}

function normalizeIconType(label: string) {
  const value = label.toLowerCase();

  if (value.includes("home")) return "home";
  if (value.includes("feed") || value.includes("bottle")) return "bottle";
  if (value.includes("meal")) return "bottle";
  if (value.includes("sleep") || value.includes("nap")) return "sleep";
  if (value.includes("calendar") || value.includes("schedule")) {
    return "calendar";
  }
  if (value.includes("timer") || value.includes("time")) return "timer";
  if (value.includes("check") || value.includes("task")) return "check";
  if (value.includes("diaper")) return "check";
  if (value.includes("heart") || value.includes("care")) return "heart";
  if (value.includes("health")) return "heart";
  if (value.includes("chat") || value.includes("message")) return "chat";
  if (value.includes("stat") || value.includes("progress")) return "stats";
  if (value.includes("growth") || value.includes("workout")) return "stats";
  if (value.includes("setting")) return "settings";
  if (value.includes("alert") || value.includes("reminder")) return "alert";
  if (value.includes("profile") || value.includes("account")) return "profile";

  return "spark";
}

function iconSvg(
  subject: IconSubject,
  centerX: number,
  centerY: number,
  palette: AssetPalette,
) {
  const stroke = palette.primary;
  const fill = palette.accent;
  const x = centerX;
  const y = centerY;

  switch (subject.type) {
    case "home":
      return `<path d="M${x - 76} ${y + 34} L${x - 76} ${y - 28} L${x} ${y - 90} L${x + 76} ${y - 28} L${x + 76} ${y + 34} Q${x + 76} ${y + 58} ${x + 52} ${y + 58} L${x + 24} ${y + 58} L${x + 24} ${y + 4} L${x - 24} ${y + 4} L${x - 24} ${y + 58} L${x - 52} ${y + 58} Q${x - 76} ${y + 58} ${x - 76} ${y + 34} Z" fill="${fill}" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/>`;
    case "bottle":
      return `<rect x="${x - 38}" y="${y - 78}" width="76" height="144" rx="28" fill="${fill}" stroke="${stroke}" stroke-width="10"/><rect x="${x - 24}" y="${y - 112}" width="48" height="38" rx="12" fill="${palette.surface}" stroke="${stroke}" stroke-width="10"/><path d="M${x - 18} ${y - 18} H${x + 18} M${x - 18} ${y + 18} H${x + 18}" stroke="${stroke}" stroke-width="10" stroke-linecap="round"/>`;
    case "sleep":
      return `<circle cx="${x - 18}" cy="${y + 18}" r="50" fill="${fill}" stroke="${stroke}" stroke-width="10"/><text x="${x + 24}" y="${y - 38}" fill="${stroke}" font-size="62" font-family="Arial" font-weight="800">Zz</text>`;
    case "calendar":
      return `<rect x="${x - 76}" y="${y - 74}" width="152" height="140" rx="24" fill="${fill}" stroke="${stroke}" stroke-width="10"/><path d="M${x - 76} ${y - 30} H${x + 76} M${x - 34} ${y - 102} V${y - 56} M${x + 34} ${y - 102} V${y - 56}" stroke="${stroke}" stroke-width="10" stroke-linecap="round"/><circle cx="${x - 30}" cy="${y + 14}" r="10" fill="${stroke}"/><circle cx="${x + 30}" cy="${y + 14}" r="10" fill="${stroke}"/>`;
    case "timer":
      return `<circle cx="${x}" cy="${y}" r="74" fill="${fill}" stroke="${stroke}" stroke-width="10"/><path d="M${x} ${y} V${y - 42} M${x} ${y} L${x + 36} ${y + 22} M${x - 28} ${y - 104} H${x + 28}" stroke="${stroke}" stroke-width="10" stroke-linecap="round"/>`;
    case "check":
      return `<rect x="${x - 76}" y="${y - 76}" width="152" height="152" rx="34" fill="${fill}" stroke="${stroke}" stroke-width="10"/><path d="M${x - 44} ${y + 4} L${x - 12} ${y + 36} L${x + 52} ${y - 38}" fill="none" stroke="${stroke}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "heart":
      return `<path d="M${x} ${y + 74} C${x - 78} ${y + 18} ${x - 92} ${y - 46} ${x - 48} ${y - 72} C${x - 20} ${y - 88} ${x} ${y - 66} ${x} ${y - 48} C${x} ${y - 66} ${x + 20} ${y - 88} ${x + 48} ${y - 72} C${x + 92} ${y - 46} ${x + 78} ${y + 18} ${x} ${y + 74} Z" fill="${fill}" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/>`;
    case "chat":
      return `<path d="M${x - 82} ${y - 62} Q${x - 82} ${y - 88} ${x - 56} ${y - 88} H${x + 58} Q${x + 84} ${y - 88} ${x + 84} ${y - 62} V${y + 20} Q${x + 84} ${y + 46} ${x + 58} ${y + 46} H${x - 18} L${x - 66} ${y + 82} L${x - 54} ${y + 46} H${x - 56} Q${x - 82} ${y + 46} ${x - 82} ${y + 20} Z" fill="${fill}" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/><path d="M${x - 38} ${y - 20} H${x + 40} M${x - 38} ${y + 14} H${x + 18}" stroke="${stroke}" stroke-width="10" stroke-linecap="round"/>`;
    case "stats":
      return `<rect x="${x - 84}" y="${y + 8}" width="38" height="70" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="10"/><rect x="${x - 18}" y="${y - 42}" width="38" height="120" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="10"/><rect x="${x + 48}" y="${y - 88}" width="38" height="166" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="10"/>`;
    case "settings":
      return `<circle cx="${x}" cy="${y}" r="34" fill="${palette.surface}" stroke="${stroke}" stroke-width="10"/><path d="M${x} ${y - 104} V${y - 74} M${x} ${y + 74} V${y + 104} M${x - 104} ${y} H${x - 74} M${x + 74} ${y} H${x + 104} M${x - 74} ${y - 74} L${x - 52} ${y - 52} M${x + 52} ${y + 52} L${x + 74} ${y + 74} M${x + 74} ${y - 74} L${x + 52} ${y - 52} M${x - 52} ${y + 52} L${x - 74} ${y + 74}" stroke="${stroke}" stroke-width="14" stroke-linecap="round"/>`;
    case "alert":
      return `<path d="M${x} ${y - 98} L${x + 90} ${y + 76} H${x - 90} Z" fill="${fill}" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/><path d="M${x} ${y - 34} V${y + 22}" stroke="${stroke}" stroke-width="12" stroke-linecap="round"/><circle cx="${x}" cy="${y + 48}" r="8" fill="${stroke}"/>`;
    case "profile":
      return `<circle cx="${x}" cy="${y - 38}" r="42" fill="${fill}" stroke="${stroke}" stroke-width="10"/><path d="M${x - 82} ${y + 82} Q${x} ${y + 2} ${x + 82} ${y + 82}" fill="${fill}" stroke="${stroke}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
    default:
      return `<path d="M${x} ${y - 96} L${x + 26} ${y - 28} L${x + 96} ${y} L${x + 26} ${y + 28} L${x} ${y + 96} L${x - 26} ${y + 28} L${x - 96} ${y} L${x - 26} ${y - 28} Z" fill="${fill}" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/>`;
  }
}

function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function textForSwatch(value: string, fallback: string) {
  if (value.startsWith("rgba(")) {
    return "#fffdf5";
  }

  const match = value.match(/^#([0-9a-f]{6})$/i);

  if (!match) {
    return fallback;
  }

  const hex = match[1];
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.55 ? "#211407" : "#fffdf5";
}

function buttonTextForFill(value: string, mode: AssetMode) {
  const normalized = normalizeCssColor(value);

  if (normalized.startsWith("rgba(")) {
    return mode === "light" ? "#211407" : "#fffdf5";
  }

  return textForSwatch(normalized, mode === "light" ? "#ffffff" : "#06121f");
}

function normalizeCssColor(value: string) {
  return value.replace(/^rgba/i, "rgba");
}

function assetPrefix(options: AssetPackageOptions) {
  return options.appSlug ? `${options.appSlug}-` : "";
}

function assetVersion(options: AssetPackageOptions) {
  return options.version ?? "v1";
}

function assetPath(file: GeneratedImage) {
  if (file.kind === "palette_light" || file.kind === "palette_dark") {
    return file.fileName;
  }

  return `mobile-assets/${file.fileName}`;
}

async function imageFromSvg({
  fileName,
  height,
  kind,
  svg,
  width,
}: {
  fileName: string;
  height: number;
  kind: GeneratedImage["kind"];
  svg: string;
  width: number;
}): Promise<GeneratedImage> {
  const bytes = await renderSvgToPng({ height, svg, width });

  return {
    kind,
    fileName,
    mimeType: "image/png",
    width,
    height,
    bytes,
  };
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
