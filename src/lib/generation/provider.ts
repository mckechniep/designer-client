export interface GeneratedImage {
  fileName: string;
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
