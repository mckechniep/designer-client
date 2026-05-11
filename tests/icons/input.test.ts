import { describe, expect, it } from "vitest";
import {
  fallbackIconSubjects,
  iconSubjectInputSignature,
  normalizeIconSubjects,
} from "@/lib/icons/input";

describe("icon subject input", () => {
  it("normalizes duplicate and numbered icon subjects", () => {
    expect(
      normalizeIconSubjects([
        "1. Home",
        "Home",
        "Feeding!",
        "Sleep",
        "Growth",
        "Calendar",
        "Timer",
      ]),
    ).toEqual(["Home", "Feeding", "Sleep", "Growth", "Calendar", "Timer"]);
  });

  it("falls back to category-aware subjects when the list is too thin", () => {
    expect(
      fallbackIconSubjects({
        appCategory: "baby tracking",
        appName: "Laitly",
      }),
    ).toContain("diaper");
  });

  it("does not include palette prose in the signature", () => {
    const base = {
      appCategory: "fitness",
      appName: "FitTalk",
      paletteSignature: "palette-v1",
    };

    expect(
      iconSubjectInputSignature({
        ...base,
        paletteSummary: "First generated summary.",
      }),
    ).toBe(
      iconSubjectInputSignature({
        ...base,
        paletteSummary: "Second generated summary.",
      }),
    );
  });
});
