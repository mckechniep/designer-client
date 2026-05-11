import type {
  MasterAssetPromptInput,
  StructuredInterpretation,
} from "./types";
import type { GeneratedAssetKind } from "./provider";

export interface AppImageryPromptItem {
  compatibility: string;
  format: string;
  name: string;
  purpose: string;
  style: string;
  subject: string;
}

const LOCKED_CONSTRAINTS = [
  "Keep mobile safe crop zones.",
  "No text, letters, numbers, labels, logos, or readable UI content in model-generated imagery.",
  "Treat exact hex colors and explicit liked colors as strong color constraints unless feedback explicitly changes them.",
  "Keep output static; create background plates, not clickable screens or prototype UI.",
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
    "Create the master source background plate for this static mobile app visual asset system.",
    buildAssetSystemContract(input),
    "Master target: the primary light/source mobile app background plate. It should be strong enough to use directly behind real app UI built in code.",
    "Create polished visual foundation only: no fake app UI, no text, no icons, no charts, no labels, no buttons, no nav bars, no readable marks.",
    "Keep it crop-safe, overlay-safe, and implementation-ready as a textless source background.",
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
    kind === "icon_set_showcase"
      ? [
          `Approved utility icon subjects: ${formatList(input.iconSubjects)}.`,
          "Draw exactly one icon concept for each approved subject before adding any optional supporting detail.",
          "Keep subject meanings recognizable and do not swap in generic placeholder icons.",
    ].join(" ")
      : "",
    target.guardrails,
    "This asset must feel like it belongs in the same generated package as the master background.",
    "Use the same palette, contrast discipline, shape language, material mood, and reference-style direction.",
  ].join("\n");
}

export function buildOptionalIconSetPrompt(input: MasterAssetPromptInput) {
  return [
    "Create an optional post-background utility icon sheet for this mobile app asset system.",
    "The light and dark source background plates have already been generated; use the previous response context as surface context.",
    buildAssetSystemContract(input),
    `Approved utility icon subjects, in exact order: ${formatList(input.iconSubjects)}.`,
    "Create a single finished portrait icon sheet with two labeled panels: Light icons and Dark icons.",
    "Each approved subject must appear exactly once in the Light panel and exactly once in the Dark panel.",
    "The light and dark version of each subject must use the same glyph geometry, silhouette, stroke style, corner logic, and visual metaphor; only contrast treatment may change.",
    "Use the approved light palette tokens for the Light panel and approved dark palette tokens for the Dark panel.",
    "Icons must remain clearly visible against the generated light and dark source background surfaces.",
    "Do not add extra icons, logos, mascots, decorative scenes, random symbols, or unmatched variants.",
    "Keep labels as tiny handoff captions only; do not bake these icons into a fake app screen.",
  ].join("\n");
}

export function buildAdditionalBackgroundPrompt({
  backgroundName,
  input,
  mode,
}: {
  backgroundName: string;
  input: MasterAssetPromptInput;
  mode: "dark" | "light";
}) {
  const target =
    mode === "light"
      ? "light-mode expanded background plate"
      : "dark-mode expanded background plate";
  const modeGuardrails =
    mode === "light"
      ? [
          "Use the approved light palette tokens and preserve contrast for dark real UI placed on top later.",
          "The result should feel like a direct sibling of the approved light source background.",
        ]
      : [
          "Use the approved dark palette tokens and preserve contrast for light real UI placed on top later.",
          "Use the just-generated light variant as composition context where available, but convert it into a real dark-mode plate rather than placing a black haze over it.",
        ];

  return [
    `Create one ${target} for this mobile app area: ${backgroundName}.`,
    buildAssetSystemContract(input),
    "This is a textless app background plate for developers to code real UI on top of.",
    "Do not draw a completed app screen or fake product mockup.",
    "Do not include text, letters, numbers, labels, logos, icons, charts, menus, nav bars, tab bars, buttons, form controls, avatars, badges, or readable placeholder content.",
    "Use subtle empty regions, layered surfaces, depth, texture, atmosphere, and content-safe zones only.",
    "The plate may imply structure for the named app area, but every region must remain empty and overlay-ready.",
    "Keep the same visual system, color discipline, material language, corner rhythm, spatial density, lighting, and crop-safe mobile framing as the approved source backgrounds.",
    ...modeGuardrails,
  ].join("\n");
}

export function buildAppImageryPrompt({
  image,
  input,
}: {
  image: AppImageryPromptItem;
  input: MasterAssetPromptInput;
}) {
  return [
    `Create one text-free in-app image asset: ${image.name}.`,
    buildAssetSystemContract(input),
    "This is a standalone visual asset to place inside real coded mobile UI. It is not a background plate, not an icon sheet, not a logo, not an app screen mockup, and not a phone-frame presentation.",
    `Intended app use: ${image.purpose || "in-app visual content"}.`,
    `Subject/content: ${image.subject || image.name}.`,
    `Visual treatment: ${image.style || "match the approved app visual system"}.`,
    `Crop/format guidance: ${image.format || "portrait-safe PNG source image"}.`,
    `Light/dark surface compatibility: ${
      image.compatibility ||
      "must remain usable on both approved light and dark background systems"
    }.`,
    "Generate one polished asset only, with a clear focal subject, generous safe padding, and enough clean edge space for developers to crop or mask in code.",
    "Do not include text, letters, numbers, labels, captions, logos, watermarks, fake UI, buttons, nav bars, status bars, charts, forms, menus, or icons.",
    "If the asset is a hero, banner, card image, empty state, success state, or feature illustration, keep it visually specific to the app category without making a completed interface screen.",
    "Use the approved palette, design direction, reference analysis, material language, lighting, depth, and mood as stronger constraints than generic stock imagery.",
  ].join("\n");
}

function buildAssetSystemContract(input: MasterAssetPromptInput) {
  const likedColors = formatList(input.likedColors);
  const dislikedColors = formatList(input.dislikedColors);

  return [
    "Shared design-system contract for a static mobile app asset package.",
    "No clickable prototype. No text, letters, numbers, labels, logos, or readable UI content baked into model-generated imagery.",
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
    "Do not render text, type specimens, or font samples inside model-generated imagery. Typography is handled by the separate Fonts step and deterministic handoff sheets.",
    `Reference UI analysis: ${input.referenceAnalysis || "not available"}.`,
    "Use reference analysis as style direction supplied by the client. Do not copy exact brand marks, layouts, or copyrighted imagery.",
    `Visual dislikes to avoid: ${input.visualDislikes || "not specified"}.`,
    `Brand notes: ${input.brandNotes || "not specified"}.`,
    "Design for mobile overlay use: readable safe zones near the top and bottom, strong center composition, crop-safe edges, professional UI/UX polish.",
    "All light assets must preserve contrast for dark coded UI text and overlays. All dark assets must preserve contrast for light coded UI text and overlays.",
    "Do not create imagery that makes future coded controls or icons disappear against their intended surfaces.",
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
      "Draw one consistent concept set only; do not split the canvas into separate light and dark variants.",
      "Icons must be simple enough to rebuild as SVG or code, consistent in stroke/fill, and suitable for later light and dark token rendering.",
      "Show labels only as tiny handoff captions, never as baked-in app UI text.",
    ].join(" "),
  },
  screen_plain_dark: {
    title: "dark mobile source background plate",
    guardrails: [
      "Create a dark-theme counterpart to the previous master/source background plate.",
      "Use the approved dark palette tokens, not a simple black haze over the light image.",
      "Preserve the same app category, composition logic, depth language, and crop-safe structure while making it feel intentionally designed for dark mode.",
      "Do not draw a full app mockup, fake navigation, icons, controls, charts, labels, or UI text.",
    ].join(" "),
  },
};

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "none specified";
}
