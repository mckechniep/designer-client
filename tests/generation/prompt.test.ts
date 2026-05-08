import { describe, expect, it } from "vitest";
import {
  buildRelatedAssetPrompt,
  buildMasterAssetPrompt,
  buildStructuredInterpretation,
} from "@/lib/generation/prompt";

describe("prompt building", () => {
  it("turns freeform feedback into stable constraints", () => {
    const result = buildStructuredInterpretation(
      "make it more futuristic but less dark",
    );

    expect(result.changes).toContain("Increase futuristic visual cues.");
    expect(result.changes).toContain("Lighten the overall image.");
    expect(result.locked).toContain("Keep mobile safe crop zones.");
  });

  it("builds a master asset prompt without requesting clickable screens", () => {
    const prompt = buildMasterAssetPrompt({
      appName: "FitTalk",
      audience: "busy fitness coaches",
      desiredMood: "premium, calm, strong",
      likedColors: ["black", "electric blue"],
      dislikedColors: ["red"],
      fontPreferences: "modern sans serif",
      paletteSystem:
        "LIGHT PALETTE --primary: #123456. DARK PALETTE --primary: #123456.",
      referenceAnalysis:
        "Theme: clean, modern. Colors: primary #123456, accent #abcdef.",
      referenceLinks: ["https://example.com"],
      selectedDirection: {
        title: "Clean Precision",
        summary: "Restrained, clean mobile assets.",
      },
      visualDislikes: "stock photos",
      brandNotes: "AI coaching assistant",
      feedbackInterpretation: {
        changes: ["Lighten the overall image."],
        locked: ["No critical UI text.", "Keep mobile safe crop zones."],
      },
    });

    expect(prompt).toContain("master background");
    expect(prompt).toContain("Shared design-system contract");
    expect(prompt).toContain("No clickable prototype");
    expect(prompt).toContain("No critical UI text");
    expect(prompt).toContain("https://example.com");
    expect(prompt).toContain("stock photos");
    expect(prompt).toContain("Approved palette system");
    expect(prompt).toContain("Do not invent a competing palette");
    expect(prompt).toContain("Disliked colors mean avoid brand");
    expect(prompt).toContain("red disliked means no red brand look");
    expect(prompt).toContain("error/destructive state can still use");
  });

  it("builds a dark screen prompt as a real dark theme, not a haze overlay", () => {
    const prompt = buildRelatedAssetPrompt({
      kind: "screen_plain_dark",
      input: {
        appName: "Laitly",
        audience: "new parents",
        desiredMood: "warm and calm",
        likedColors: ["cream", "gold"],
        dislikedColors: ["neon green"],
        fontPreferences: "Body / Workhorse font: Inter.",
        paletteSystem: "DARK PALETTE --canvas: #141312.",
        referenceAnalysis: "Warm editorial mobile references.",
        referenceLinks: [],
        selectedDirection: {
          title: "Clean Precision",
          summary: "Restrained mobile source screens.",
        },
        visualDislikes: "clutter",
        brandNotes: "parenting assistant",
        feedbackInterpretation: {
          changes: [],
          locked: ["No critical UI text."],
        },
      },
    });

    expect(prompt).toContain("dark-theme counterpart");
    expect(prompt).toContain("not a simple black haze");
    expect(prompt).toContain("Do not draw a full app mockup");
  });
});
