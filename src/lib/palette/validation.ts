import { z } from "zod";
import type { PaletteSystem } from "./spec";

const PaletteTokenSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
});

const PaletteGroupSchema = z.object({
  name: z.string().min(1),
  tokens: z.array(PaletteTokenSchema).min(1),
});

const PaletteModeSchema = z.object({
  background: z.string().min(1),
  groups: z.array(PaletteGroupSchema).min(1),
  mode: z.enum(["light", "dark"]),
  reviewBackground: z.string().min(1),
  subtitle: z.string().min(1),
  title: z.string().min(1),
});

export const PaletteSystemSchema = z.object({
  dark: PaletteModeSchema,
  light: PaletteModeSchema,
  source: z
    .object({
      accent: z.string().min(1),
      appCategory: z.string().optional(),
      audience: z.string().optional(),
      desiredMood: z.string().optional(),
      dislikedColors: z.array(z.string()),
      effectPreference: z
        .enum(["auto", "none", "subtle", "expressive"])
        .optional(),
      likedColors: z.array(z.string()),
      primary: z.string().min(1),
      provider: z.string().optional(),
      rationale: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
    })
    .passthrough(),
  summary: z.string().min(1),
});

export function parsePaletteSystemJson(value: string) {
  if (!value.trim()) {
    return null;
  }

  try {
    return PaletteSystemSchema.parse(JSON.parse(value)) as PaletteSystem;
  } catch {
    return null;
  }
}
