import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/lib/env";

describe("parseEnv", () => {
  it("defaults to the mock generation provider", () => {
    const env = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
      ASSET_BUCKET: "asset-generations",
    });

    expect(env.GENERATION_PROVIDER).toBe("mock");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://127.0.0.1:3000");
  });

  it("accepts openai as a provider", () => {
    const env = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
      ASSET_BUCKET: "asset-generations",
      GENERATION_PROVIDER: "openai",
      OPENAI_API_KEY: "sk-test",
    });

    expect(env.GENERATION_PROVIDER).toBe("openai");
  });

  it("requires an OpenAI API key when the OpenAI provider is enabled", () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
        ASSET_BUCKET: "asset-generations",
        GENERATION_PROVIDER: "openai",
      }),
    ).toThrow("OPENAI_API_KEY is required when GENERATION_PROVIDER=openai");
  });
});
