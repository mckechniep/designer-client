import { describe, expect, it } from "vitest";
import {
  buildPaletteSystem,
  formatPaletteSystemForPrompt,
  paletteModeToAssetPalette,
} from "@/lib/palette/spec";

describe("palette system", () => {
  it("turns exact primary and accent anchors into light and dark token sets", () => {
    const palette = buildPaletteSystem({
      appName: "Laitly",
      dislikedColors: ["neon green"],
      likedColors: [
        "warm cream",
        "Primary anchor #e8c86a",
        "Accent anchor #b97862",
      ],
    });

    expect(palette.source.primary).toBe("#e8c86a");
    expect(palette.source.accent).toBe("#b97862");
    expect(formatPaletteSystemForPrompt(palette)).toContain(
      "--primary: #e8c86a",
    );
    expect(formatPaletteSystemForPrompt(palette)).toContain(
      "DARK PALETTE",
    );
  });

  it("maps full token modes to runtime asset colors", () => {
    const palette = buildPaletteSystem({
      appName: "FitTalk",
      dislikedColors: [],
      likedColors: ["Primary anchor #0ea5e9"],
    });
    const runtime = paletteModeToAssetPalette(palette.light);

    expect(runtime.primary).toBe("#0ea5e9");
    expect(runtime.background).toMatch(/^#[0-9a-f]{6}$/);
    expect(runtime.text).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("adds effect tokens when the client asks for expressive glow", () => {
    const palette = buildPaletteSystem({
      appCategory: "Music",
      appName: "NightDeck",
      audience: "DJs and nightlife promoters",
      desiredMood: "neon, glowing, premium",
      dislikedColors: [],
      effectPreference: "expressive",
      likedColors: ["Primary anchor #00e5ff", "Accent anchor #ff2fd6"],
    });

    expect(formatPaletteSystemForPrompt(palette)).toContain(
      "Effects / Atmosphere",
    );
    expect(formatPaletteSystemForPrompt(palette)).toContain("--glow-primary");
  });

  it("keeps semantic status tokens even when a client dislikes red", () => {
    const palette = buildPaletteSystem({
      appName: "CalmTask",
      dislikedColors: ["red"],
      likedColors: ["Primary anchor #2563eb", "Accent anchor #14b8a6"],
    });
    const promptText = formatPaletteSystemForPrompt(palette);

    expect(promptText).toContain("--danger:");
    expect(promptText).toContain("--danger-soft:");
    expect(palette.source.dislikedColors).toContain("red");
  });
});
