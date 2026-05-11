export interface UIAnalysisPack {
  theme: {
    labels: string[];
    summary: string;
  };
  tokens: {
    colors: {
      accent: string;
      bg: string;
      border: string;
      mutedText: string;
      primary: string;
      surface: string;
      text: string;
    };
    typography: {
      bodyWeight: number;
      fontFamilies: Array<{
        confidence: "high" | "medium" | "low";
        evidence: string;
        family: string;
        role: "headline" | "body" | "ui" | "display" | "mono" | "unknown";
        source: "css" | "html_link" | "user_description";
        stack?: string;
      }>;
      headlineWeight: number;
      style: "serif" | "sans" | "mono" | "mixed";
      tone: "editorial" | "tech" | "corporate" | "retro" | "minimal";
    };
    shape: {
      radius: number;
      strokeWidth: number;
    };
    effects: {
      blur: "none" | "subtle";
      gradients: "none" | "subtle" | "allowed";
      shadow: "none" | "soft" | "medium";
    };
    layout: {
      density: "tight" | "balanced" | "airy";
      grid: "strict" | "loose" | "none";
    };
  };
  illustrationConstraints: {
    doNotUse: string[];
    gradientRules: string[];
    lineRules: string[];
    paletteRules: string[];
    shadowRules: string[];
  };
  isometricGuidance: {
    disallowedArchetypes: string[];
    evidence: {
      layoutSignals: string[];
      productSignals: string[];
      toneSignals: string[];
    };
    fit: "high" | "medium" | "low" | "not_recommended";
    motionArchetypeCandidates: Array<{
      fit: "high" | "medium" | "low" | "fallback";
      name: string;
      reason: string;
    }>;
    objectArchetypeCandidates: Array<{
      fit: "high" | "medium" | "low";
      name: string;
      reason: string;
    }>;
    reason: string;
    selectionConfidence: {
      level: "high" | "medium" | "low";
      notes: string;
    };
    subjectSignals: string[];
  };
  confidence: {
    basis: string[];
    notes: string;
  };
}

export interface ReferenceAnalysisResult {
  analysis: UIAnalysisPack;
  errorMessage?: string;
  sourceUrls: string[];
  status: "skipped" | "succeeded" | "failed";
  summary: string;
}

interface FetchedReference {
  body: string;
  url: string;
}

const fallbackColors = {
  accent: "#7de7ff",
  bg: "#06121f",
  border: "#244255",
  mutedText: "#9fb2bf",
  primary: "#0b7a88",
  surface: "#0b1b2b",
  text: "#eef8fb",
};

export async function analyzeReferenceUrls(
  urls: string[],
): Promise<ReferenceAnalysisResult> {
  const sourceUrls = normalizeUrls(urls);

  if (sourceUrls.length === 0) {
    const analysis = createFallbackAnalysis(
      "No reference URLs were provided.",
      [],
      "skipped",
    );

    return {
      analysis,
      sourceUrls,
      status: "skipped",
      summary:
        "No reference websites were supplied. Use the saved brief, approved palette system, selected design direction, font system, visual dislikes, and brand notes as the style contract.",
    };
  }

  const fetched = await Promise.all(sourceUrls.map(fetchReference));
  const successful = fetched.filter(
    (result): result is FetchedReference => result !== null,
  );

  if (successful.length === 0) {
    const analysis = createFallbackAnalysis(
      "Reference URLs were provided, but none could be fetched by the server.",
      sourceUrls,
      "failed",
    );

    return {
      analysis,
      errorMessage: "No reference URLs could be fetched.",
      sourceUrls,
      status: "failed",
      summary:
        "Reference websites were supplied, but none could be fetched. Do not infer style from those URLs; use the saved brief, approved palette system, selected design direction, font system, visual dislikes, and brand notes as the style contract.",
    };
  }

  const combinedBody = successful.map((item) => item.body).join("\n");
  const colors = extractColors(combinedBody);
  const fonts = extractFonts(combinedBody);
  const text = stripHtml(combinedBody);
  const hasGradients = /gradient\(/i.test(combinedBody);
  const hasShadow = /box-shadow|shadow-/i.test(combinedBody);
  const hasBlur = /backdrop-filter|blur\(/i.test(combinedBody);
  const radius = extractRadius(combinedBody);
  const density = inferDensity(text);
  const tone = inferTone(text, fonts);
  const labels = inferLabels(text, tone);
  const analysis: UIAnalysisPack = {
    theme: {
      labels,
      summary: `${labels.join(" + ")} reference style with ${
        colors.primary
      } primary color cues and ${density} layout density.`,
    },
    tokens: {
      colors,
      typography: {
        bodyWeight: 400,
        fontFamilies: fonts,
        headlineWeight: inferHeadlineWeight(combinedBody),
        style: inferTypeStyle(fonts),
        tone,
      },
      shape: {
        radius,
        strokeWidth: 1.5,
      },
      effects: {
        blur: hasBlur ? "subtle" : "none",
        gradients: hasGradients ? "subtle" : "none",
        shadow: hasShadow ? "soft" : "none",
      },
      layout: {
        density,
        grid: /grid-template|display:\s*grid|grid-cols/i.test(combinedBody)
          ? "strict"
          : "loose",
      },
    },
    illustrationConstraints: {
      paletteRules: [
        `Use ${colors.bg} and ${colors.surface} for large fills.`,
        `Use ${colors.primary} as the dominant brand color.`,
        `Use ${colors.accent} only for emphasis and important highlights.`,
      ],
      lineRules: ["Use clean, consistent strokes.", "Avoid sketchy linework."],
      shadowRules: [
        hasShadow
          ? "Use soft shadows sparingly."
          : "Avoid heavy drop shadows.",
      ],
      gradientRules: [
        hasGradients
          ? "Subtle gradients are acceptable."
          : "Avoid decorative gradients unless explicitly requested.",
      ],
      doNotUse: [
        "copied logos",
        "exact website layouts",
        "copyrighted imagery",
        "decorative clutter",
      ],
    },
    isometricGuidance: {
      fit: "low",
      reason:
        "Reference analysis is being used for mobile asset styling, not isometric illustration.",
      subjectSignals: extractSubjectSignals(text),
      objectArchetypeCandidates: [
        {
          fit: "medium",
          name: "mobile_asset_system",
          reason:
            "The downstream target is app background and asset generation.",
        },
      ],
      motionArchetypeCandidates: [
        {
          fit: "fallback",
          name: "signal_pulse",
          reason: "Subtle motion language can translate to soft visual emphasis.",
        },
      ],
      disallowedArchetypes: ["unrelated mascot scenes", "literal site copies"],
      evidence: {
        productSignals: extractSubjectSignals(text),
        layoutSignals: [density, hasGradients ? "gradient cues" : "flat cues"],
        toneSignals: labels,
      },
      selectionConfidence: {
        level: "medium",
        notes:
          "Derived from fetched HTML/CSS text. Screenshots and computed styles are not yet captured.",
      },
    },
    confidence: {
      basis: ["url"],
      notes:
        "Server-side URL analysis used HTML/CSS text extraction. It does not yet include browser screenshots or computed styles.",
    },
  };

  return {
    analysis,
    sourceUrls,
    status: "succeeded",
    summary: summarizeReferenceAnalysis(analysis),
  };
}

export function summarizeReferenceAnalysis(analysis: UIAnalysisPack) {
  const colors = analysis.tokens.colors;
  const fonts = analysis.tokens.typography.fontFamilies
    .slice(0, 3)
    .map((font) => `${font.family} (${font.role})`)
    .join(", ");

  return [
    `Theme: ${analysis.theme.labels.join(", ")}.`,
    `Colors: bg ${colors.bg}, surface ${colors.surface}, text ${colors.text}, primary ${colors.primary}, accent ${colors.accent}.`,
    `Typography: ${analysis.tokens.typography.style}/${analysis.tokens.typography.tone}${
      fonts ? `; ${fonts}` : ""
    }.`,
    `Shape/effects: ${analysis.tokens.shape.radius}px radius, ${analysis.tokens.effects.shadow} shadow, ${analysis.tokens.effects.gradients} gradients.`,
    `Constraints: ${analysis.illustrationConstraints.doNotUse.join(", ")}.`,
  ].join("\n");
}

export function compactReferenceAnalysisForPrompt(
  analysis: UIAnalysisPack | null | undefined,
) {
  if (!analysis) {
    return "No reference analysis available.";
  }

  return summarizeReferenceAnalysis(analysis);
}

async function fetchReference(url: string): Promise<FetchedReference | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "MasterAssetStudio/0.1 reference-analysis",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return {
      body: (await response.text()).slice(0, 250_000),
      url,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUrls(urls: string[]) {
  return urls
    .map((url) => {
      try {
        return new URL(url).toString();
      } catch {
        return null;
      }
    })
    .filter((url): url is string => Boolean(url))
    .slice(0, 3);
}

function createFallbackAnalysis(
  notes: string,
  urls: string[],
  status: "skipped" | "failed",
): UIAnalysisPack {
  return {
    theme: {
      labels: ["client_brief"],
      summary: "No fetched reference style was available.",
    },
    tokens: {
      colors: fallbackColors,
      typography: {
        bodyWeight: 400,
        fontFamilies: [],
        headlineWeight: 600,
        style: "sans",
        tone: "minimal",
      },
      shape: {
        radius: 12,
        strokeWidth: 1.5,
      },
      effects: {
        blur: "none",
        gradients: "none",
        shadow: "none",
      },
      layout: {
        density: "balanced",
        grid: "loose",
      },
    },
    illustrationConstraints: {
      paletteRules: ["Use client-selected colors as stronger guidance."],
      lineRules: ["Use clean, consistent strokes."],
      shadowRules: ["Avoid heavy shadows."],
      gradientRules: ["Avoid decorative gradients unless requested."],
      doNotUse: ["copied logos", "exact website layouts", "copyrighted imagery"],
    },
    isometricGuidance: {
      fit: "low",
      reason: "No reference evidence was available.",
      subjectSignals: [],
      objectArchetypeCandidates: [],
      motionArchetypeCandidates: [],
      disallowedArchetypes: ["literal site copies"],
      evidence: {
        layoutSignals: [],
        productSignals: [],
        toneSignals: [],
      },
      selectionConfidence: {
        level: status === "failed" && urls.length > 0 ? "low" : "medium",
        notes,
      },
    },
    confidence: {
      basis: urls.length > 0 ? ["url"] : ["user_description"],
      notes,
    },
  };
}

function extractColors(body: string) {
  const matches = [
    ...body.matchAll(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g),
  ]
    .map((match) => normalizeHex(match[0]))
    .filter(Boolean) as string[];
  const ranked = rankColors(matches);

  return {
    bg: ranked[0] ?? fallbackColors.bg,
    surface: ranked[1] ?? fallbackColors.surface,
    text: ranked[2] ?? fallbackColors.text,
    mutedText: ranked[3] ?? fallbackColors.mutedText,
    primary: ranked[4] ?? ranked[0] ?? fallbackColors.primary,
    accent: ranked[5] ?? ranked[1] ?? fallbackColors.accent,
    border: ranked[6] ?? fallbackColors.border,
  };
}

function rankColors(colors: string[]) {
  const counts = new Map<string, number>();

  colors.forEach((color) => {
    counts.set(color, (counts.get(color) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([color]) => !["#000000", "#ffffff"].includes(color))
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color)
    .slice(0, 8);
}

function normalizeHex(value: string) {
  if (value.length === 4) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return value.toLowerCase();
}

function extractFonts(body: string): UIAnalysisPack["tokens"]["typography"]["fontFamilies"] {
  const fontMatches = [
    ...body.matchAll(/font-family\s*:\s*([^;}"']+)/gi),
  ].map((match) => match[1]?.trim()).filter(Boolean) as string[];
  const googleFontMatches = [
    ...body.matchAll(/family=([^:&"']+)/gi),
  ].map((match) => decodeURIComponent(match[1] ?? "").replaceAll("+", " "));
  const stacks = [...fontMatches, ...googleFontMatches]
    .map((font) => font.replaceAll("&display=swap", "").trim())
    .filter(Boolean);
  const families = new Map<string, string>();

  stacks.forEach((stack) => {
    const family = stack
      .split(",")[0]
      ?.replaceAll("\"", "")
      .replaceAll("'", "")
      .trim();

    if (family && !isGenericFontFamily(family)) {
      families.set(family, stack);
    }
  });

  return [...families.entries()].slice(0, 6).map(([family, stack], index) => ({
    confidence: "medium",
    evidence: index === 0 ? "reference css/html font evidence" : "reference css",
    family,
    role: index === 0 ? "headline" : "body",
    source: stack.includes("family=") ? "html_link" : "css",
    stack,
  }));
}

function isGenericFontFamily(family: string) {
  return /^(serif|sans-serif|monospace|system-ui|inherit|initial|ui-sans-serif|ui-serif)$/i.test(
    family,
  );
}

function inferHeadlineWeight(body: string) {
  const weights = [...body.matchAll(/font-weight\s*:\s*(\d{3})/gi)]
    .map((match) => Number(match[1]))
    .filter((weight) => weight >= 500);

  return weights[0] ?? 600;
}

function extractRadius(body: string) {
  const radii = [...body.matchAll(/border-radius\s*:\s*(\d+(?:\.\d+)?)px/gi)]
    .map((match) => Number(match[1]))
    .filter((radius) => radius > 0 && radius < 80);

  return Math.round(radii[0] ?? 12);
}

function inferDensity(text: string): "tight" | "balanced" | "airy" {
  const normalized = text.toLowerCase();

  if (/spacious|airy|breath|calm|minimal/.test(normalized)) return "airy";
  if (/dashboard|data|dense|table|admin/.test(normalized)) return "tight";

  return "balanced";
}

function inferTone(
  text: string,
  fonts: UIAnalysisPack["tokens"]["typography"]["fontFamilies"],
): UIAnalysisPack["tokens"]["typography"]["tone"] {
  const normalized = text.toLowerCase();

  if (fonts.some((font) => /serif/i.test(font.stack ?? font.family))) {
    return "editorial";
  }
  if (/api|ai|developer|platform|automation|technical/.test(normalized)) {
    return "tech";
  }
  if (/enterprise|business|finance|compliance|operations/.test(normalized)) {
    return "corporate";
  }

  return "minimal";
}

function inferTypeStyle(
  fonts: UIAnalysisPack["tokens"]["typography"]["fontFamilies"],
): UIAnalysisPack["tokens"]["typography"]["style"] {
  const hasSerif = fonts.some((font) => /serif/i.test(font.stack ?? font.family));
  const hasSans = fonts.some((font) => /sans|inter|manrope|geist|arial/i.test(font.stack ?? font.family));

  if (hasSerif && hasSans) return "mixed";
  if (hasSerif) return "serif";

  return "sans";
}

function inferLabels(
  text: string,
  tone: UIAnalysisPack["tokens"]["typography"]["tone"],
) {
  const normalized = text.toLowerCase();

  if (/premium|luxury|editorial/.test(normalized) || tone === "editorial") {
    return ["premium", "editorial"];
  }
  if (/ai|platform|developer|automation/.test(normalized)) {
    return ["technical", "polished"];
  }
  if (/baby|parent|family|care|health/.test(normalized)) {
    return ["warm", "calm"];
  }

  return ["clean", "modern"];
}

function extractSubjectSignals(text: string) {
  return [...new Set(
    text
      .toLowerCase()
      .match(/\b(ai|baby|parent|health|fitness|finance|education|calendar|chat|tracking|dashboard|automation)\b/g) ??
      [],
  )].slice(0, 8);
}

function stripHtml(body: string) {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 50_000);
}
