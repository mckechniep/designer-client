import sharp from "sharp";
import type { GeneratedImage } from "./provider";

export async function createThumbnail(
  image: GeneratedImage,
): Promise<GeneratedImage> {
  const bytes = await sharp(image.bytes)
    .resize({ width: 360, height: 640, fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  return {
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
    fileName: "master-background.webp",
    mimeType: "image/webp",
    width: 1440,
    height: 2560,
    bytes,
  };
}

export async function createSplashExport(
  image: GeneratedImage,
): Promise<GeneratedImage> {
  const bytes = await sharp(image.bytes)
    .resize({ width: 1290, height: 2796, fit: "cover", position: "center" })
    .png()
    .toBuffer();

  return {
    fileName: "splash-1290x2796.png",
    mimeType: "image/png",
    width: 1290,
    height: 2796,
    bytes,
  };
}
