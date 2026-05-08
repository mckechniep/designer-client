import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import type sharpFactory from "sharp";

interface SvgRenderInput {
  height: number;
  svg: string;
  width: number;
}

const bundledFontDirectory = path.join(
  process.cwd(),
  "src/lib/generation/font-assets",
);
const fontconfigDirectory = path.join(os.tmpdir(), "designer-client-fontconfig");
const fontconfigFile = path.join(fontconfigDirectory, "fonts.conf");
const fontconfigCacheDirectory = path.join(fontconfigDirectory, "cache");

configureBundledFonts();

const require = createRequire(import.meta.url);
const sharp = require("sharp") as typeof sharpFactory;

export default sharp;

export async function renderSvgToPng({
  height,
  svg,
  width,
}: SvgRenderInput): Promise<Buffer> {
  return sharp(Buffer.from(svg, "utf8"))
    .resize({ fit: "fill", height, width })
    .png()
    .toBuffer();
}

function configureBundledFonts() {
  if (process.env.DESIGNER_CLIENT_DISABLE_BUNDLED_FONTS === "1") {
    return;
  }

  if (!fs.existsSync(bundledFontDirectory)) {
    return;
  }

  fs.mkdirSync(fontconfigCacheDirectory, { recursive: true });
  fs.writeFileSync(
    fontconfigFile,
    [
      '<?xml version="1.0"?>',
      '<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">',
      "<fontconfig>",
      '  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>',
      `  <dir>${escapeXml(bundledFontDirectory)}</dir>`,
      `  <cachedir>${escapeXml(fontconfigCacheDirectory)}</cachedir>`,
      "</fontconfig>",
      "",
    ].join("\n"),
  );

  process.env.FONTCONFIG_FILE = fontconfigFile;
  process.env.XDG_CACHE_HOME = fontconfigCacheDirectory;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
