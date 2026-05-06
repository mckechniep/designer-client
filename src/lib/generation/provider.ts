export type GeneratedAssetKind =
  | "palette_light"
  | "palette_dark"
  | "buttons_light"
  | "buttons_dark"
  | "icon_mark_light"
  | "icon_mark_dark"
  | "screen_plain_light"
  | "screen_plain_dark"
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
}

export interface ImageGenerationRequest {
  prompt: string;
  aspect: "portrait";
  quality: "draft" | "final";
}

export interface ImageGenerationProvider {
  name: string;
  model: string;
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
