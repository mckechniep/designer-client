import { describe, expect, it } from "vitest";
import { summarizeReferenceAnalysis } from "@/lib/reference-analysis/analyzer";
import type { UIAnalysisPack } from "@/lib/reference-analysis/analyzer";

describe("reference analysis summary", () => {
  it("creates compact prompt-ready style guidance", () => {
    const analysis: UIAnalysisPack = {
      theme: {
        labels: ["premium", "editorial"],
        summary: "Premium editorial reference.",
      },
      tokens: {
        colors: {
          accent: "#c5a55a",
          bg: "#fbf9f4",
          border: "#e5dfd2",
          mutedText: "#766f64",
          primary: "#1c1a17",
          surface: "#ffffff",
          text: "#1c1a17",
        },
        typography: {
          bodyWeight: 400,
          fontFamilies: [
            {
              confidence: "high",
              evidence: "css",
              family: "Newsreader",
              role: "headline",
              source: "css",
            },
          ],
          headlineWeight: 600,
          style: "mixed",
          tone: "editorial",
        },
        shape: {
          radius: 12,
          strokeWidth: 1.5,
        },
        effects: {
          blur: "none",
          gradients: "subtle",
          shadow: "soft",
        },
        layout: {
          density: "airy",
          grid: "loose",
        },
      },
      illustrationConstraints: {
        doNotUse: ["copied logos", "exact website layouts"],
        gradientRules: ["Use subtle gradients only."],
        lineRules: ["Use clean strokes."],
        paletteRules: ["Use primary as dominant color."],
        shadowRules: ["Use soft shadows."],
      },
      isometricGuidance: {
        disallowedArchetypes: ["literal site copies"],
        evidence: {
          layoutSignals: ["airy"],
          productSignals: ["baby"],
          toneSignals: ["premium"],
        },
        fit: "low",
        motionArchetypeCandidates: [],
        objectArchetypeCandidates: [],
        reason: "Not needed.",
        selectionConfidence: {
          level: "medium",
          notes: "HTML/CSS extraction.",
        },
        subjectSignals: ["baby"],
      },
      confidence: {
        basis: ["url"],
        notes: "HTML/CSS extraction.",
      },
    };

    expect(summarizeReferenceAnalysis(analysis)).toContain("#c5a55a");
    expect(summarizeReferenceAnalysis(analysis)).toContain("Newsreader");
    expect(summarizeReferenceAnalysis(analysis)).toContain("copied logos");
  });
});
