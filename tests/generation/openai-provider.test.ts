import { describe, expect, it } from "vitest";
import {
  findImageGenerationCall,
  openAIImageAction,
  openAIImageQuality,
  openAIResponsesImageTool,
  openAIImageSize,
} from "../../src/lib/generation/openai-provider";

describe("OpenAI image provider helpers", () => {
  it("uses a large portrait master size for gpt-image-2", () => {
    expect(openAIImageSize("gpt-image-2")).toBe("1440x2560");
  });

  it("uses a standard supported portrait size for other GPT image models", () => {
    expect(openAIImageSize("gpt-image-1.5")).toBe("1024x1536");
  });

  it("maps draft and final quality to OpenAI image quality values", () => {
    expect(openAIImageQuality("draft")).toBe("low");
    expect(openAIImageQuality("final")).toBe("high");
  });

  it("generates cold and switches to auto for feedback edits with previous response context", () => {
    expect(openAIImageAction()).toBe("generate");
    expect(openAIImageAction("resp_123")).toBe("auto");
  });

  it("builds a Responses image generation tool", () => {
    expect(
      openAIResponsesImageTool({
        action: "auto",
        imageModel: "gpt-image-2",
        quality: "final",
      }),
    ).toMatchObject({
      action: "auto",
      model: "gpt-image-2",
      quality: "high",
      size: "1440x2560",
      type: "image_generation",
    });
  });

  it("extracts the completed image generation call from Responses output", () => {
    const call = findImageGenerationCall([
      {
        id: "ig_failed",
        result: null,
        status: "failed",
        type: "image_generation_call",
      },
      {
        id: "ig_done",
        result: "base64-image",
        status: "completed",
        type: "image_generation_call",
      },
    ]);

    expect(call?.id).toBe("ig_done");
    expect(call?.result).toBe("base64-image");
  });
});
