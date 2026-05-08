import OpenAI from "openai";
import type {
  ResponseCreateParamsNonStreaming,
  ResponseOutputItem,
  Tool,
} from "openai/resources/responses/responses";
import sharp from "sharp";
import { env } from "@/lib/env";
import type {
  GeneratedImage,
  ImageGenerationProvider,
  ImageGenerationRequest,
} from "./provider";

const GPT_IMAGE_2_MASTER_SIZE = "1440x2560";
const STANDARD_PORTRAIT_SIZE = "1024x1536";
type ResponsesImageAction = "auto" | "edit" | "generate";

export class OpenAIImageProvider implements ImageGenerationProvider {
  name = "openai-responses";
  model: string;
  imageModel: string;
  responseModel: string;

  private readonly client: OpenAI;

  constructor({
    apiKey = env.OPENAI_API_KEY,
    imageModel = env.OPENAI_IMAGE_MODEL,
    model = env.OPENAI_RESPONSES_MODEL,
  }: {
    apiKey?: string;
    imageModel?: string;
    model?: string;
  } = {}) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI image generation");
    }

    this.client = new OpenAI({ apiKey });
    this.imageModel = imageModel;
    this.responseModel = model;
    this.model = `${model}+${imageModel}`;
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
      targetLabel: "master mobile app background",
    });
  }

  async generateAsset(
    request: ImageGenerationRequest,
  ): Promise<GeneratedImage> {
    const action =
      request.responsesAction ?? openAIImageAction(request.previousResponseId);
    const body = {
      input: responsesImagePrompt(request),
      max_tool_calls: 1,
      model: this.responseModel,
      parallel_tool_calls: false,
      previous_response_id: request.previousResponseId,
      store: true,
      tool_choice: { type: "image_generation" },
      tools: [
        openAIResponsesImageTool({
          action,
          imageModel: this.imageModel,
          quality: request.quality,
        }),
      ],
    } as ResponseCreateParamsNonStreaming;
    const response = await this.client.responses.create(body);
    const image = findImageGenerationCall(response.output);

    if (!image?.result) {
      throw new Error("OpenAI image generation returned no image data");
    }

    const bytes = Buffer.from(image.result, "base64");
    const metadata = await sharp(bytes).metadata();
    const fallbackDimensions = dimensionsFromSize(
      openAIImageSize(this.imageModel),
    );

    return {
      kind: request.kind ?? "master_background",
      fileName: request.fileName ?? "master-background.png",
      mimeType: "image/png",
      width: metadata.width ?? fallbackDimensions.width,
      height: metadata.height ?? fallbackDimensions.height,
      bytes,
      providerImageId: image.id,
      providerMetadata: {
        action,
        imageGenerationCallId: image.id,
        imageModel: this.imageModel,
        kind: request.kind ?? "master_background",
        prompt: request.prompt,
        previousResponseId: request.previousResponseId ?? null,
        responseModel: this.responseModel,
        targetLabel: request.targetLabel ?? null,
      },
      providerResponseId: response.id,
    };
  }
}

export function openAIImageSize(model: string) {
  return model.startsWith("gpt-image-2")
    ? GPT_IMAGE_2_MASTER_SIZE
    : STANDARD_PORTRAIT_SIZE;
}

export function openAIImageQuality(quality: ImageGenerationRequest["quality"]) {
  return quality === "draft" ? "low" : "high";
}

export function openAIImageAction(
  previousResponseId?: string,
): ResponsesImageAction {
  return previousResponseId ? "auto" : "generate";
}

export function openAIResponsesImageTool({
  action,
  imageModel,
  quality,
}: {
  action: ResponsesImageAction;
  imageModel: string;
  quality: ImageGenerationRequest["quality"];
}) {
  return {
    action,
    background: "opaque",
    model: imageModel,
    moderation: "auto",
    output_format: "png",
    quality: openAIImageQuality(quality),
    size: openAIImageSize(imageModel),
    type: "image_generation",
  } as Tool.ImageGeneration;
}

export function findImageGenerationCall(output: ResponseOutputItem[]) {
  return output.find(
    (
      item,
    ): item is ResponseOutputItem.ImageGenerationCall =>
      item.type === "image_generation_call" && item.status === "completed",
  );
}

function responsesImagePrompt(request: ImageGenerationRequest) {
  if (!request.previousResponseId) {
    return [
      `Draw a new ${request.targetLabel ?? "mobile app visual asset"} image from this brief.`,
      "",
      request.prompt,
    ].join("\n");
  }

  if (request.responsesAction === "generate") {
    return [
      `Use the previous response as design-system context, then draw a new separate ${request.targetLabel ?? "mobile app visual asset"} image.`,
      "Do not edit or duplicate the previous image. Keep palette, contrast, typography mood, app category fit, and visual language consistent with that context.",
      "Return one finished static image for this specific asset family.",
      "",
      request.prompt,
    ].join("\n");
  }

  return [
    "Edit the previous master mobile app visual asset image using the feedback in this request.",
    "Preserve the strongest composition, app category fit, approved palette discipline, and mobile crop-safe structure unless the feedback asks to change them.",
    "Return one updated final master image.",
    "",
    request.prompt,
  ].join("\n");
}

function dimensionsFromSize(size: string) {
  const [width, height] = size.split("x").map(Number);

  return {
    height: Number.isFinite(height) ? height : 1536,
    width: Number.isFinite(width) ? width : 1024,
  };
}
