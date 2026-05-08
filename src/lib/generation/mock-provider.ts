import type {
  GeneratedImage,
  ImageGenerationProvider,
  ImageGenerationRequest,
} from "./provider";
import { renderSvgToPng } from "./svg-renderer";

export class MockImageProvider implements ImageGenerationProvider {
  name = "mock";
  model = "mock-gradient-v1";

  async generateAsset(
    request: ImageGenerationRequest,
  ): Promise<GeneratedImage> {
    const width = 1440;
    const height = 2560;
    const variant = createPromptVariant(
      `${request.kind ?? "master_background"} ${request.prompt}`,
    );
    const title = request.targetLabel ?? formatKind(request.kind ?? "asset");
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="${variant.background}"/>
            <stop offset="45%" stop-color="${variant.mid}"/>
            <stop offset="100%" stop-color="${variant.accent}"/>
          </linearGradient>
          <radialGradient id="glow" cx="${variant.glowX}%" cy="${variant.glowY}%" r="38%">
            <stop offset="0%" stop-color="${variant.glow}" stop-opacity="0.82"/>
            <stop offset="100%" stop-color="${variant.glow}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <circle cx="${variant.circleX}" cy="${variant.circleY}" r="${variant.radius}" fill="url(#glow)"/>
        <path d="${variant.wavePath}" fill="${variant.shadow}" fill-opacity="0.56"/>
        <rect x="116" y="236" width="1208" height="1780" rx="72" fill="${variant.surface}" fill-opacity="0.38" stroke="${variant.accent}" stroke-opacity="0.36" stroke-width="6"/>
        <text x="160" y="340" fill="${variant.accent}" font-size="54" font-family="Arial" font-weight="800">${escapeSvg(title)}</text>
        <text x="160" y="430" fill="#f8fafc" font-size="34" font-family="Arial">Mock generated asset ${variant.label}</text>
      </svg>
    `;

    const bytes = await renderSvgToPng({ height, svg, width });

    return {
      kind: request.kind ?? "master_background",
      fileName: request.fileName ?? "master-background.png",
      mimeType: "image/png",
      providerMetadata: {
        kind: request.kind ?? "master_background",
        prompt: request.prompt,
        targetLabel: request.targetLabel ?? null,
      },
      width,
      height,
      bytes,
    };
  }

  async generateMasterAsset(
    request: ImageGenerationRequest,
  ): Promise<GeneratedImage> {
    return this.generateAsset({
      ...request,
      fileName:
        request.quality === "final"
          ? "master-background.png"
          : "draft-master-background.png",
      kind: "master_background",
      targetLabel: "Master background",
    });
  }
}

function createPromptVariant(prompt: string) {
  const hash = hashString(prompt);
  const hue = hash % 360;
  const accentHue = (hue + 74) % 360;
  const glowHue = (hue + 34) % 360;
  const glowX = 36 + (hash % 28);
  const glowY = 28 + ((hash >>> 4) % 24);
  const circleX = 520 + ((hash >>> 8) % 420);
  const circleY = 760 + ((hash >>> 12) % 460);
  const radius = 470 + ((hash >>> 16) % 250);
  const waveLift = 120 + ((hash >>> 20) % 260);

  return {
    accent: hsl(accentHue, 84, 84),
    background: hsl(hue, 48, 8),
    circleX,
    circleY,
    glow: hsl(glowHue, 88, 72),
    glowX,
    glowY,
    label: hash.toString(16).slice(0, 6),
    mid: hsl(hue, 58, 28),
    radius,
    shadow: hsl(hue, 52, 7),
    surface: hsl(hue, 44, 12),
    wavePath: `M160 ${1780 - waveLift} C420 ${1590 - waveLift} 650 ${1680 - waveLift / 2} 880 ${1510 - waveLift} C1060 ${1378 - waveLift / 2} 1180 ${1410 - waveLift} 1290 ${1330 - waveLift / 3} L1290 2560 L160 2560 Z`,
  };
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function hsl(hue: number, saturation: number, lightness: number) {
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function formatKind(kind: string) {
  return kind.replaceAll("_", " ");
}

function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
