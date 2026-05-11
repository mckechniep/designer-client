import type { PaletteSystem } from "@/lib/palette/spec";

export type GeneratedAssetKind =
  | "palette_light"
  | "palette_dark"
  | "buttons_light"
  | "buttons_dark"
  | "controls_showcase"
  | "icon_set_light"
  | "icon_set_dark"
  | "icon_set_showcase"
  | "icon_mark_light"
  | "icon_mark_dark"
  | "screen_examples_light"
  | "screen_examples_dark"
  | "screen_plain_light"
  | "screen_plain_dark"
  | "background_plate_light"
  | "background_plate_dark"
  | "app_image"
  | "master_background"
  | "splash"
  | "button_preview"
  | "thumbnail"
  | "download_package";

export type GeneratedAssetMimeType =
  | "image/png"
  | "image/webp"
  | "application/zip";

export interface GeneratedAssetFile {
  kind: GeneratedAssetKind;
  fileName: string;
  mimeType: GeneratedAssetMimeType;
  width?: number;
  height?: number;
  bytes: Buffer;
}

export interface GeneratedImage extends GeneratedAssetFile {
  mimeType: "image/png" | "image/webp";
  width: number;
  height: number;
  bytes: Buffer;
  providerImageId?: string;
  providerMetadata?: Record<string, unknown>;
  providerResponseId?: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  aspect: "portrait";
  fileName?: string;
  kind?: GeneratedAssetKind;
  previousResponseId?: string;
  quality: "draft" | "final";
  responsesAction?: "auto" | "edit" | "generate";
  targetLabel?: string;
}

export interface ImageGenerationProvider {
  name: string;
  model: string;
  generateAsset(request: ImageGenerationRequest): Promise<GeneratedImage>;
  generateMasterAsset(request: ImageGenerationRequest): Promise<GeneratedImage>;
}

export interface GeneratedAssetManifestItem {
  kind: GeneratedAssetKind;
  path: string;
  fileName: string;
  mimeType: GeneratedAssetMimeType;
  width: number;
  height: number;
  byteSize: number;
}

export interface AssetPackageOptions {
  appSlug?: string;
  fontPreferences?: string;
  generatedAssets?: GeneratedImage[];
  iconSubjects?: string[];
  paletteSystem?: PaletteSystem;
  version?: string;
}

export interface GeneratedAssetPackage {
  files: GeneratedImage[];
  downloadPackage: GeneratedAssetFile;
  manifest: {
    version: string;
    files: GeneratedAssetManifestItem[];
  };
}
