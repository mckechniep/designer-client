import { describe, expect, it } from "vitest";
import {
  buildAdditionalBackgroundPrompt,
  buildAppImageryPrompt,
  buildOptionalIconSetPrompt,
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

  it("builds a master asset prompt without requesting fake UI screens", () => {
    const prompt = buildMasterAssetPrompt({
      appName: "FitTalk",
      audience: "busy fitness coaches",
      desiredMood: "premium, calm, strong",
      likedColors: ["black", "electric blue"],
      dislikedColors: ["red"],
      fontPreferences: "modern sans serif",
      iconSubjects: ["home", "workout", "progress"],
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

    expect(prompt).toContain("master source background plate");
    expect(prompt).toContain("Shared design-system contract");
    expect(prompt).toContain("No clickable prototype");
    expect(prompt).toContain("no text, no icons, no charts");
    expect(prompt).not.toContain("https://example.com");
    expect(prompt).toContain("Reference UI analysis");
    expect(prompt).toContain("stock photos");
    expect(prompt).toContain("Approved palette system");
    expect(prompt).toContain("Do not invent a competing palette");
    expect(prompt).toContain("Disliked colors mean avoid brand");
    expect(prompt).toContain("red disliked means no red brand look");
    expect(prompt).toContain("error/destructive state can still use");
  });

  it("builds a dark source background prompt as a real dark theme", () => {
    const prompt = buildRelatedAssetPrompt({
      kind: "screen_plain_dark",
      input: {
        appName: "Laitly",
        audience: "new parents",
        desiredMood: "warm and calm",
        likedColors: ["cream", "gold"],
        dislikedColors: ["neon green"],
        fontPreferences: "Body / Workhorse font: Inter.",
        iconSubjects: ["feeding", "sleep", "growth"],
        paletteSystem: "DARK PALETTE --canvas: #141312.",
        referenceAnalysis: "Warm editorial mobile references.",
        referenceLinks: [],
        selectedDirection: {
          title: "Clean Precision",
          summary: "Restrained mobile source backgrounds.",
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
    expect(prompt).toContain("UI text");
  });

  it("feeds approved icon subjects into the icon showcase prompt", () => {
    const prompt = buildRelatedAssetPrompt({
      kind: "icon_set_showcase",
      input: {
        appName: "Laitly",
        audience: "new parents",
        desiredMood: "warm and calm",
        likedColors: ["cream", "gold"],
        dislikedColors: [],
        fontPreferences: "Body / Workhorse font: Inter.",
        iconSubjects: ["feeding", "sleep", "diaper", "growth"],
        paletteSystem: "LIGHT PALETTE --primary: #e8c86a.",
        referenceAnalysis: "Warm editorial mobile references.",
        referenceLinks: [],
        selectedDirection: {
          title: "Clean Precision",
          summary: "Restrained mobile source backgrounds.",
        },
        visualDislikes: "clutter",
        brandNotes: "parenting assistant",
        feedbackInterpretation: {
          changes: [],
          locked: ["No critical UI text."],
        },
      },
    });

    expect(prompt).toContain("Approved utility icon subjects");
    expect(prompt).toContain("feeding, sleep, diaper, growth");
    expect(prompt).toContain("Draw exactly one icon concept");
  });

  it("builds optional icon prompts as a post-background light/dark pass", () => {
    const prompt = buildOptionalIconSetPrompt({
      appName: "Laitly",
      audience: "new parents",
      desiredMood: "warm and calm",
      likedColors: ["cream", "gold"],
      dislikedColors: [],
      fontPreferences: "Body / Workhorse font: Inter.",
      iconSubjects: ["feeding", "sleep", "diaper", "growth"],
      paletteSystem: "LIGHT PALETTE --primary: #e8c86a.",
      referenceAnalysis: "Warm editorial mobile references.",
      referenceLinks: [],
      selectedDirection: {
        title: "Clean Precision",
        summary: "Restrained mobile source backgrounds.",
      },
      visualDislikes: "clutter",
      brandNotes: "parenting assistant",
      feedbackInterpretation: {
        changes: [],
        locked: ["No critical UI text."],
      },
    });

    expect(prompt).toContain("post-background utility icon sheet");
    expect(prompt).toContain("Light icons and Dark icons");
    expect(prompt).toContain("same glyph geometry");
    expect(prompt).toContain("feeding, sleep, diaper, growth");
  });

  it("builds expanded background prompts as textless app plates", () => {
    const prompt = buildAdditionalBackgroundPrompt({
      backgroundName: "Dashboard",
      mode: "dark",
      input: {
        appName: "Laitly",
        audience: "new parents",
        desiredMood: "warm and calm",
        likedColors: ["cream", "gold"],
        dislikedColors: [],
        fontPreferences: "Body / Workhorse font: Inter.",
        iconSubjects: ["feeding", "sleep", "diaper", "growth"],
        paletteSystem: "DARK PALETTE --canvas: #141312.",
        referenceAnalysis: "Warm editorial mobile references.",
        referenceLinks: [],
        selectedDirection: {
          title: "Clean Precision",
          summary: "Restrained mobile source backgrounds.",
        },
        visualDislikes: "clutter",
        brandNotes: "parenting assistant",
        feedbackInterpretation: {
          changes: [],
          locked: ["No readable UI content."],
        },
      },
    });

    expect(prompt).toContain("Dashboard");
    expect(prompt).toContain("textless app background plate");
    expect(prompt).toContain("Do not include text");
    expect(prompt).toContain("nav bars");
    expect(prompt).toContain("real dark-mode plate");
    expect(prompt).toContain("overlay-ready");
  });

  it("builds app imagery prompts as standalone in-app assets", () => {
    const prompt = buildAppImageryPrompt({
      image: {
        compatibility: "Works on both approved light and dark surfaces",
        format: "Square/card-friendly source",
        name: "Feature card image",
        purpose: "Feature card visual",
        style: "Abstract product visual",
        subject: "A close-up metaphor for the core feature",
      },
      input: {
        appName: "Laitly",
        audience: "new parents",
        desiredMood: "warm and calm",
        likedColors: ["cream", "gold"],
        dislikedColors: [],
        fontPreferences: "Body / Workhorse font: Inter.",
        iconSubjects: ["feeding", "sleep", "diaper", "growth"],
        paletteSystem: "LIGHT PALETTE --primary: #e8c86a.",
        referenceAnalysis: "Warm editorial mobile references.",
        referenceLinks: [],
        selectedDirection: {
          title: "Clean Precision",
          summary: "Restrained mobile source backgrounds.",
        },
        visualDislikes: "clutter",
        brandNotes: "parenting assistant",
        feedbackInterpretation: {
          changes: [],
          locked: ["No readable UI content."],
        },
      },
    });

    expect(prompt).toContain("text-free in-app image asset");
    expect(prompt).toContain("Feature card image");
    expect(prompt).toContain("not a background plate");
    expect(prompt).toContain("not an icon sheet");
    expect(prompt).toContain("Do not include text");
    expect(prompt).toContain("fake UI");
    expect(prompt).toContain("Square/card-friendly source");
  });
});
