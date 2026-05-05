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
});
