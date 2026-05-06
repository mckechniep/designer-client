import sharp from "sharp";
import { createDownloadPackage } from "./download-package";
import type {
  AssetPackageOptions,
  GeneratedAssetPackage,
  GeneratedImage,
} from "./provider";

type AssetMode = "light" | "dark";

interface AssetPalette {
  background: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  border: string;
}

const palettes: Record<AssetMode, AssetPalette> = {
  light: {
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#101820",
    muted: "#65717f",
    primary: "#0b7a88",
    accent: "#d7f9ff",
    border: "#d9e2ea",
  },
  dark: {
    background: "#06121f",
    surface: "#0b1b2b",
    text: "#eef8fb",
    muted: "#9fb2bf",
    primary: "#7de7ff",
    accent: "#0b485f",
    border: "#244255",
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

export async function createSplashExport(
  image: GeneratedImage,
  options: AssetPackageOptions = {},
): Promise<GeneratedImage> {
  const bytes = await sharp(image.bytes)
    .resize({ width: 1290, height: 2796, fit: "cover", position: "center" })
    .png()
    .toBuffer();

  return {
    kind: "splash",
    fileName: `splash-${assetVersion(options)}.png`,
    mimeType: "image/png",
    width: 1290,
    height: 2796,
    bytes,
  };
}

export async function createPaletteSheet(
  mode: AssetMode,
  options: AssetPackageOptions = {},
): Promise<GeneratedImage> {
  const palette = palettes[mode];
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

export async function createButtonSheet(
  mode: AssetMode,
  options: AssetPackageOptions = {},
): Promise<GeneratedImage> {
  const palette = palettes[mode];
  const width = 2400;
  const height = 1600;
  const variants = [
    ["Primary", palette.primary, mode === "light" ? "#ffffff" : "#06121f"],
    ["Pressed", mode === "light" ? "#075965" : "#56bfd7", "#ffffff"],
    ["Secondary", palette.surface, palette.text],
    ["Disabled", mode === "light" ? "#d9e2ea" : "#334155", palette.muted],
  ];
  const rows = variants
    .map(([label, fill, text], index) => {
      const y = 290 + index * 270;

      return `
        <g>
          <text x="140" y="${y + 72}" fill="${palette.text}" font-size="38" font-family="Arial" font-weight="700">${label}</text>
          <rect x="520" y="${y}" width="760" height="130" rx="34" fill="${fill}" stroke="${palette.border}" stroke-width="3"/>
          <text x="900" y="${y + 82}" text-anchor="middle" fill="${text}" font-size="40" font-family="Arial" font-weight="700">${label} button</text>
          <rect x="1380" y="${y}" width="360" height="130" rx="34" fill="${fill}" stroke="${palette.border}" stroke-width="3"/>
          <text x="1560" y="${y + 82}" text-anchor="middle" fill="${text}" font-size="40" font-family="Arial" font-weight="700">Tap</text>
          <rect x="1840" y="${y}" width="250" height="130" rx="34" fill="${fill}" stroke="${palette.border}" stroke-width="3"/>
          <text x="1965" y="${y + 82}" text-anchor="middle" fill="${text}" font-size="40" font-family="Arial" font-weight="700">OK</text>
        </g>
      `;
    })
    .join("");
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${palette.background}"/>
      <text x="140" y="130" fill="${palette.text}" font-size="64" font-family="Arial" font-weight="700">${titleCase(mode)} button sheet</text>
      <text x="140" y="190" fill="${palette.muted}" font-size="30" font-family="Arial">Static button states for handoff and implementation reference</text>
      ${rows}
    </svg>
  `;

  return imageFromSvg({
    svg,
    kind: mode === "light" ? "buttons_light" : "buttons_dark",
    fileName: `buttons-${mode}-all-${assetVersion(options)}.png`,
    width,
    height,
  });
}

export async function createIconMark(
  mode: AssetMode,
  options: AssetPackageOptions = {},
): Promise<GeneratedImage> {
  const palette = palettes[mode];
  const width = 1024;
  const height = 1024;
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="220" fill="${palette.background}"/>
      <path d="M512 136 C662 328 760 464 760 618 C760 779 650 890 512 890 C374 890 264 779 264 618 C264 464 362 328 512 136 Z" fill="${palette.primary}"/>
      <path d="M414 626 C486 580 550 532 607 450 C584 574 538 674 420 744 C394 706 390 660 414 626 Z" fill="${palette.accent}" opacity="0.78"/>
    </svg>
  `;

  return imageFromSvg({
    svg,
    kind: mode === "light" ? "icon_mark_light" : "icon_mark_dark",
    fileName: `icon-mark-${mode}-${assetVersion(options)}.png`,
    width,
    height,
  });
}

export async function createPlainScreen(
  image: GeneratedImage,
  mode: AssetMode,
): Promise<GeneratedImage> {
  const palette = palettes[mode];
  const width = 1440;
  const height = 2560;
  const base = await sharp(image.bytes)
    .resize({ width, height, fit: "cover" })
    .modulate({
      brightness: mode === "light" ? 1.2 : 0.62,
      saturation: mode === "light" ? 0.72 : 0.9,
    })
    .blur(mode === "light" ? 9 : 5)
    .png()
    .toBuffer();
  const overlaySvg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${palette.background}" opacity="${mode === "light" ? "0.34" : "0.58"}"/>
      <rect x="96" y="210" width="1248" height="2140" rx="64" fill="${palette.surface}" opacity="${mode === "light" ? "0.16" : "0.18"}" stroke="${palette.border}" stroke-width="4"/>
    </svg>
  `;
  const bytes = await sharp(base)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  return {
    kind: mode === "light" ? "screen_plain_light" : "screen_plain_dark",
    fileName: `${mode}-screen-plain.png`,
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
  const files = [
    master,
    await createPracticalWebp(master),
    await createSplashExport(master, options),
    await createPlainScreen(master, "light"),
    await createPlainScreen(master, "dark"),
    await createPaletteSheet("light", options),
    await createPaletteSheet("dark", options),
    await createButtonSheet("light", options),
    await createButtonSheet("dark", options),
    await createIconMark("light", options),
    await createIconMark("dark", options),
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
  const bytes = await sharp(Buffer.from(svg)).png().toBuffer();

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
