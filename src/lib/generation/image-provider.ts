import { env } from "@/lib/env";
import { MockImageProvider } from "./mock-provider";
import { OpenAIImageProvider } from "./openai-provider";
import type { ImageGenerationProvider } from "./provider";

export function createImageGenerationProvider(): ImageGenerationProvider {
  if (env.GENERATION_PROVIDER === "openai") {
    return new OpenAIImageProvider();
  }

  return new MockImageProvider();
}
