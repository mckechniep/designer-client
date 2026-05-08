import type {
  MasterAssetPromptInput,
  StructuredInterpretation,
} from "./types";
import type { GeneratedAssetKind } from "./provider";

const LOCKED_CONSTRAINTS = [
  "Keep mobile safe crop zones.",
  "No critical UI text.",
  "Treat exact hex colors and explicit liked colors as strong color constraints unless feedback explicitly changes them.",
  "Keep output static; do not create clickable screens or prototype UI.",
];

export function buildStructuredInterpretation(
  feedback: string,
): StructuredInterpretation {
  const normalizedFeedback = feedback.toLowerCase();
  const changes: string[] = [];
  const warnings: string[] = [];

  if (normalizedFeedback.includes("futuristic")) {
    changes.push("Increase futuristic visual cues.");
  }

  if (
    normalizedFeedback.includes("less dark") ||
    normalizedFeedback.includes("lighter") ||
    normalizedFeedback.includes("lighten")
  ) {
    changes.push("Lighten the overall image.");
  }

  if (normalizedFeedback.includes("premium")) {
    changes.push("Make the composition feel more premium and restrained.");
  }

  if (normalizedFeedback.includes("minimal")) {
    changes.push("Reduce decorative clutter.");
  }

  if (changes.length === 0 && feedback.trim()) {
    changes.push(
      `Apply this client feedback while preserving the approved design system: ${feedback.trim()}`,
    );
  }

  if (!feedback.trim()) {
    warnings.push(
      "No freeform feedback was provided; generate from the approved brief.",
    );
  }

  return {
    changes,
    locked: LOCKED_CONSTRAINTS,
    warnings,
  };
}

export function buildMasterAssetPrompt(input: MasterAssetPromptInput) {
  return [
    "Create the master background for this static mobile app visual asset system.",
    buildAssetSystemContract(input),
    "Master target: the primary light/source mobile screen visual. It should be strong enough to use directly as the light screen source asset.",
    "Avoid fake clickable UI chrome and tiny unreadable text. Keep it crop-safe, overlay-safe, and implementation-ready as a source screen/background.",
  ].join("\n");
}

export function buildRelatedAssetPrompt({
  input,
  kind,
}: {
  input: MasterAssetPromptInput;
  kind: GeneratedAssetKind;
}) {
  const target = relatedAssetTargets[kind] ?? {
    guardrails:
      "Create one static mobile app visual asset that follows the shared design system.",
    title: "Related asset",
  };

  return [
    `Create this package asset: ${target.title}.`,
    buildAssetSystemContract(input),
    target.guardrails,
    "This asset must feel like it belongs in the same generated package as the master background.",
    "Use the same palette, contrast discipline, shape language, font mood, and reference-style direction.",
  ].join("\n");
}

function buildAssetSystemContract(input: MasterAssetPromptInput) {
  const likedColors = formatList(input.likedColors);
  const dislikedColors = formatList(input.dislikedColors);
  const referenceLinks = formatList(input.referenceLinks);

  return [
    "Shared design-system contract for a static mobile app asset package.",
    "No clickable prototype. No critical UI text baked into background imagery.",
    `App name: ${input.appName}.`,
    `Audience: ${input.audience}.`,
    `Desired mood: ${input.desiredMood}.`,
    `Selected design direction: ${input.selectedDirection.title} - ${input.selectedDirection.summary}.`,
    `Initial liked colors from brief: ${likedColors}.`,
    `Approved palette system: ${input.paletteSystem}.`,
    "Color discipline: use the approved light/dark palette tokens as hard constraints for generated visual assets. Do not invent a competing palette.",
    `Disliked colors to avoid: ${dislikedColors}.`,
    "Disliked colors mean avoid brand, dominant background, decorative, glow, hero, and atmosphere usage. They do not forbid tiny functional semantic UI colors from the approved palette, such as danger, warning, success, info, or care states.",
    "If a disliked color overlaps a semantic convention, keep that semantic token limited, subdued, and functional. For example, red disliked means no red brand look or red-heavy image, but an error/destructive state can still use the approved danger token.",
    `Font preference context: ${input.fontPreferences || "not specified"}.`,
    `Reference websites or assets: ${referenceLinks}.`,
    `Reference UI analysis: ${input.referenceAnalysis || "not available"}.`,
    "Use reference links as style direction supplied by the client. Do not copy exact brand marks, layouts, or copyrighted imagery.",
    `Visual dislikes to avoid: ${input.visualDislikes || "not specified"}.`,
    `Brand notes: ${input.brandNotes || "not specified"}.`,
    "Design for mobile overlay use: readable safe zones near the top and bottom, strong center composition, crop-safe edges, professional UI/UX polish.",
    "All light assets must preserve contrast for dark text, primary buttons, and filled icons. All dark assets must preserve contrast for light text, primary buttons, and line icons.",
    "Buttons, controls, and icons must be visibly usable against their intended surfaces. Do not create a background that makes the approved controls disappear.",
    `Requested changes: ${
      input.feedbackInterpretation.changes.join(" ") ||
      "Generate from the initial brief."
    }`,
    `Locked constraints: ${input.feedbackInterpretation.locked.join(" ")}`,
  ].join("\n");
}

const relatedAssetTargets: Partial<
  Record<GeneratedAssetKind, { guardrails: string; title: string }>
> = {
  icon_set_showcase: {
    title: "app-specific utility icon set",
    guardrails: [
      "Draw a static portrait sheet of small app utility icons, not a logo.",
      "Use the app category to choose useful subjects such as home, profile, calendar, timer, stats, chat, settings, alerts, or category-specific task icons.",
      "Icons must be simple enough to rebuild as SVG or code, consistent in stroke/fill, and visible on both light and dark surfaces.",
      "Show labels only as tiny handoff captions, never as baked-in app UI text.",
    ].join(" "),
  },
  screen_plain_dark: {
    title: "dark mobile source screen",
    guardrails: [
      "Create a dark-theme counterpart to the previous master/source screen.",
      "Use the approved dark palette tokens, not a simple black haze over the light image.",
      "Preserve the same app category, composition logic, depth language, and crop-safe structure while making it feel intentionally designed for dark mode.",
      "Do not draw a full app mockup, fake navigation, or dense UI text.",
    ].join(" "),
  },
};

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "none specified";
}
