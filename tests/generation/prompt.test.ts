import { describe, expect, it } from "vitest";
import {
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
      dislikedColors: ["orange"],
      fontPreferences: "modern sans serif",
      brandNotes: "AI coaching assistant",
      feedbackInterpretation: {
        changes: ["Lighten the overall image."],
        locked: ["No critical UI text.", "Keep mobile safe crop zones."],
      },
    });

    expect(prompt).toContain("static portrait master source image");
    expect(prompt).toContain("No clickable prototype");
    expect(prompt).toContain("No critical UI text");
  });
});
