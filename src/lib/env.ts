import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://127.0.0.1:3000"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ASSET_BUCKET: z.string().min(1).default("asset-generations"),
  GENERATION_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_IMAGE_MODEL: z.string().min(1).default("gpt-image-2"),
  INTERNAL_UNLIMITED_EMAILS: z.string().default(""),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(
  input: NodeJS.ProcessEnv | Record<string, string | undefined>,
): AppEnv {
  const parsed = envSchema.parse(input);

  if (parsed.GENERATION_PROVIDER === "openai" && !parsed.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when GENERATION_PROVIDER=openai");
  }

  return parsed;
}

let cachedEnv: AppEnv | undefined;

function getEnv() {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}

export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return getEnv().NEXT_PUBLIC_SUPABASE_URL;
  },
  get NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY() {
    return getEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  },
  get NEXT_PUBLIC_SITE_URL() {
    return getEnv().NEXT_PUBLIC_SITE_URL;
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
  get ASSET_BUCKET() {
    return getEnv().ASSET_BUCKET;
  },
  get GENERATION_PROVIDER() {
    return getEnv().GENERATION_PROVIDER;
  },
  get OPENAI_API_KEY() {
    return getEnv().OPENAI_API_KEY;
  },
  get OPENAI_IMAGE_MODEL() {
    return getEnv().OPENAI_IMAGE_MODEL;
  },
  get INTERNAL_UNLIMITED_EMAILS() {
    return getEnv().INTERNAL_UNLIMITED_EMAILS;
  },
} satisfies AppEnv;
