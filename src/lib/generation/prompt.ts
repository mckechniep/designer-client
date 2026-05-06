import type {
  MasterAssetPromptInput,
  StructuredInterpretation,
} from "./types";

const LOCKED_CONSTRAINTS = [
  "Keep mobile safe crop zones.",
  "No critical UI text.",
  "Keep the selected color family unless feedback explicitly changes it.",
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
  const likedColors = formatList(input.likedColors);
  const dislikedColors = formatList(input.dislikedColors);

  return [
    "Create a static portrait master source image for a mobile app visual asset system.",
    "No clickable prototype. No complete app screen mockup. No critical UI text baked into the image.",
    `App name: ${input.appName}.`,
    `Audience: ${input.audience}.`,
    `Desired mood: ${input.desiredMood}.`,
    `Liked colors: ${likedColors}.`,
    `Disliked colors to avoid: ${dislikedColors}.`,
    `Font preference context: ${input.fontPreferences || "not specified"}.`,
    `Brand notes: ${input.brandNotes || "not specified"}.`,
    "Design for mobile overlay use: readable safe zones near the top and bottom, strong center composition, crop-safe edges, professional UI/UX polish.",
    "The image should work as a source for splash screens, onboarding backgrounds, auth backgrounds, empty states, home headers, and hero crops.",
    `Requested changes: ${
      input.feedbackInterpretation.changes.join(" ") ||
      "Generate from the initial brief."
    }`,
    `Locked constraints: ${input.feedbackInterpretation.locked.join(" ")}`,
  ].join("\n");
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "none specified";
}
