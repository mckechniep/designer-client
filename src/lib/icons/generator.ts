import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  fallbackIconSubjects,
  normalizeIconSubjectInput,
  normalizeIconSubjects,
  type IconSubjectGenerationInput,
} from "./input";

const LlmIconSubjectSchema = z.object({
  subjects: z.array(z.string().trim().min(2)).min(8).max(12),
});

export async function generateIconSubjectList(
  input: IconSubjectGenerationInput,
) {
  const normalizedInput = normalizeIconSubjectInput(input);

  if (env.GENERATION_PROVIDER !== "openai") {
    return fallbackIconSubjects(normalizedInput);
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: env.OPENAI_PALETTE_MODEL,
    input: [
      {
        role: "system",
        content: [
          "You are a senior mobile product designer planning utility icons for an app asset package.",
          "Return only the structured JSON requested by the schema.",
          "Create 8 to 12 short icon subject labels, each two or three words at most.",
          "The list must be app-specific, useful in real mobile navigation or feature UI, and not generic decoration.",
          "Do not include logos, mascots, emoji, colors, style adjectives, brand names, or duplicate concepts.",
          "Prefer concrete nouns or noun phrases that an image model can draw consistently as a small icon.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(normalizedInput),
      },
    ],
    text: {
      format: zodTextFormat(LlmIconSubjectSchema, "icon_subject_plan"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI did not return an icon subject list.");
  }

  return normalizeIconSubjects(response.output_parsed.subjects, normalizedInput);
}
