import sharp from "sharp";
import type {
  GeneratedImage,
  ImageGenerationProvider,
  ImageGenerationRequest,
} from "./provider";

export class MockImageProvider implements ImageGenerationProvider {
  name = "mock";
  model = "mock-gradient-v1";

  async generateMasterAsset(
    request: ImageGenerationRequest,
  ): Promise<GeneratedImage> {
    const width = 1440;
    const height = 2560;
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#06121f"/>
            <stop offset="45%" stop-color="#0b485f"/>
            <stop offset="100%" stop-color="#d7f9ff"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="38%" r="38%">
            <stop offset="0%" stop-color="#7de7ff" stop-opacity="0.82"/>
            <stop offset="100%" stop-color="#7de7ff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <circle cx="720" cy="940" r="620" fill="url(#glow)"/>
        <path d="M160 1780 C420 1590 650 1680 880 1510 C1060 1378 1180 1410 1290 1330 L1290 2560 L160 2560 Z" fill="#071018" fill-opacity="0.56"/>
        <text x="120" y="2320" fill="#d7f9ff" font-size="42" font-family="Arial">Mock master asset</text>
      </svg>
    `;

    const bytes = await sharp(Buffer.from(svg)).png().toBuffer();

    return {
      fileName:
        request.quality === "final"
          ? "master-background.png"
          : "draft-master-background.png",
      mimeType: "image/png",
      width,
      height,
      bytes,
    };
  }
}
