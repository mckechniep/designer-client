"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import { initialMaxGenerationsForEmail } from "@/lib/generation/limits";
import { generatePaletteSystem } from "@/lib/palette/generator";
import {
  normalizePaletteEffectPreference,
  paletteInputSignature,
  type PaletteGenerationInput,
} from "@/lib/palette/input";
import type { PalettePreviewState } from "@/lib/palette/preview-state";
import type { PaletteSystem } from "@/lib/palette/spec";
import { parsePaletteSystemJson } from "@/lib/palette/validation";
import { ensureDefaultDesignDirections } from "@/lib/projects/default-directions";
import {
  analyzeReferenceUrls,
  type ReferenceAnalysisResult,
} from "@/lib/reference-analysis/analyzer";
import type { ReferencePreviewState } from "@/lib/reference-analysis/preview-state";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase/server";

const projectSchema = z.object({
  name: z.string().trim().min(2),
  appCategory: z.string().trim().min(2),
  appName: z.string().trim().min(2),
  audience: z.string().trim().min(2),
  desiredMood: z.string().trim().min(2),
  likedColors: z.string().trim().default(""),
  dislikedColors: z.string().trim().default(""),
  fontPreferences: z.string().trim().default(""),
  referenceLinks: z.string().trim().default(""),
  visualDislikes: z.string().trim().default(""),
  brandNotes: z.string().trim().default(""),
  primaryColor: z.string().trim().default(""),
  usePrimaryColor: z.string().trim().default(""),
  accentColor: z.string().trim().default(""),
  useAccentColor: z.string().trim().default(""),
  displayFont: z.string().trim().default(""),
  bodyFont: z.string().trim().default(""),
  utilityFont: z.string().trim().default(""),
  fontPreset: z.string().trim().default(""),
  effectPreference: z.string().trim().default("auto"),
  approvedPaletteJson: z.string().trim().default(""),
  approvedPaletteSignature: z.string().trim().default(""),
});

interface ProjectForDelete {
  id: string;
  client_profile_id: string;
}

interface DirectionForDelete {
  id: string;
}

interface GenerationForDelete {
  id: string;
}

interface AssetFileForDelete {
  storage_path: string;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const clientProfileId = user.profile.client_profile_id;

  if (!clientProfileId) {
    redirect("/projects/new?error=missing-client-profile");
  }

  const parsedInput = projectSchema.safeParse({
    name: getString(formData, "name"),
    appCategory: getString(formData, "appCategory"),
    appName: getString(formData, "appName"),
    audience: getString(formData, "audience"),
    desiredMood: getString(formData, "desiredMood"),
    likedColors: getString(formData, "likedColors"),
    dislikedColors: getString(formData, "dislikedColors"),
    fontPreferences: getString(formData, "fontPreferences"),
    referenceLinks: getString(formData, "referenceLinks"),
    visualDislikes: getString(formData, "visualDislikes"),
    brandNotes: getString(formData, "brandNotes"),
    primaryColor: getString(formData, "primaryColor"),
    usePrimaryColor: getString(formData, "usePrimaryColor"),
    accentColor: getString(formData, "accentColor"),
    useAccentColor: getString(formData, "useAccentColor"),
    displayFont: getString(formData, "displayFont"),
    bodyFont: getString(formData, "bodyFont"),
    utilityFont: getString(formData, "utilityFont"),
    fontPreset: getString(formData, "fontPreset"),
    effectPreference: getString(formData, "effectPreference"),
    approvedPaletteJson: getString(formData, "approvedPaletteJson"),
    approvedPaletteSignature: getString(formData, "approvedPaletteSignature"),
  });

  if (!parsedInput.success) {
    redirect("/projects/new?error=invalid-brief");
  }

  const input = parsedInput.data;
  const likedColors = [
    ...splitLines(input.likedColors),
    ...exactColorsFromInput(input),
  ];
  const dislikedColors = splitLines(input.dislikedColors);
  const paletteInput = buildPaletteGenerationInput({
    appCategory: input.appCategory,
    appName: input.appName,
    audience: input.audience,
    desiredMood: input.desiredMood,
    dislikedColors,
    effectPreference: input.effectPreference,
    likedColors,
  });
  const fontPreferences = fontPreferencesFromInput(input);
  const supabase = await createServerSupabaseClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      client_profile_id: clientProfileId,
      name: input.name,
      app_category: input.appCategory,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (projectError || !project) {
    redirect("/projects/new?error=create-project-failed");
  }

  const referenceLinks = splitLines(input.referenceLinks);
  const { error: briefError } = await supabase.from("design_briefs").insert({
    project_id: project.id,
    app_name: input.appName,
    audience: input.audience,
    desired_mood: input.desiredMood,
    liked_colors: likedColors,
    disliked_colors: dislikedColors,
    effect_preference: paletteInput.effectPreference,
    font_preferences: fontPreferences,
    reference_links: referenceLinks,
    visual_dislikes: input.visualDislikes,
    brand_notes: input.brandNotes,
  });

  if (briefError) {
    redirect(`/projects/${project.id}?error=create-brief-failed`);
  }

  const serviceSupabase = createServiceSupabaseClient();
  await saveReferenceAnalysis(project.id, referenceLinks);
  const approvedPalette = parseApprovedPalette(
    input.approvedPaletteJson,
    input.approvedPaletteSignature,
    paletteInput,
  );
  let palette: PaletteSystem;

  try {
    palette = approvedPalette ?? (await generatePaletteSystem(paletteInput));
  } catch {
    redirect(`/projects/${project.id}?error=palette-generation-failed`);
  }

  const paletteSaved = await savePaletteSpec({
    createdBy: user.id,
    palette,
    projectId: project.id,
  });

  if (!paletteSaved) {
    redirect(`/projects/${project.id}?error=palette-generation-failed`);
  }

  try {
    await ensureDefaultDesignDirections({
      appName: input.appName,
      projectId: project.id,
    });
  } catch {
    redirect(`/projects/${project.id}?error=create-directions-failed`);
  }

  const { error: limitError } = await serviceSupabase
    .from("generation_limits")
    .upsert(
      {
        client_profile_id: clientProfileId,
        max_generations: initialMaxGenerationsForEmail(user.email),
        used_generations: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_profile_id", ignoreDuplicates: true },
    );

  if (limitError) {
    redirect(`/projects/${project.id}?error=create-generation-limit-failed`);
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function analyzeProjectReferences(projectId: string) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single<{ id: string }>();

  if (!project) {
    redirect("/projects?error=project-not-found");
  }

  const { data: brief } = await supabase
    .from("design_briefs")
    .select("reference_links")
    .eq("project_id", projectId)
    .single<{ reference_links: string[] }>();

  if (!brief) {
    redirect(`/projects/${projectId}?error=missing-brief`);
  }

  await saveReferenceAnalysis(projectId, brief.reference_links);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?references=analyzed`);
}

export async function generateProjectPalette(projectId: string) {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, app_category")
    .eq("id", projectId)
    .single<{ app_category: string; id: string }>();

  if (!project) {
    redirect("/projects?error=project-not-found");
  }

  const { data: brief } = await supabase
    .from("design_briefs")
    .select(
      "app_name, audience, desired_mood, liked_colors, disliked_colors, effect_preference",
    )
    .eq("project_id", projectId)
    .single<{
      app_name: string;
      audience: string;
      desired_mood: string;
      disliked_colors: string[];
      effect_preference: string;
      liked_colors: string[];
    }>();

  if (!brief) {
    redirect(`/projects/${projectId}?error=missing-brief`);
  }

  let palette: PaletteSystem;

  try {
    palette = await generatePaletteSystem({
      appCategory: project.app_category,
      appName: brief.app_name,
      audience: brief.audience,
      desiredMood: brief.desired_mood,
      dislikedColors: brief.disliked_colors,
      effectPreference: normalizePaletteEffectPreference(
        brief.effect_preference,
      ),
      likedColors: brief.liked_colors,
    });
  } catch {
    redirect(`/projects/${projectId}?error=palette-generation-failed`);
  }
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase.from("palette_specs").insert({
    project_id: projectId,
    created_by: user.id,
    status: "approved",
    source_json: palette.source,
    light_json: palette.light,
    dark_json: palette.dark,
    summary: palette.summary,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    redirect(`/projects/${projectId}?error=palette-generation-failed`);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?palette=generated`);
}

export async function previewProjectPalette(
  _state: PalettePreviewState,
  formData: FormData,
): Promise<PalettePreviewState> {
  await requireUser();

  const paletteInput = buildPaletteGenerationInput({
    appCategory: getString(formData, "appCategory"),
    appName: getString(formData, "appName"),
    audience: getString(formData, "audience"),
    desiredMood: getString(formData, "desiredMood"),
    dislikedColors: splitLines(getString(formData, "dislikedColors")),
    effectPreference: getString(formData, "effectPreference"),
    likedColors: [
      ...splitLines(getString(formData, "likedColors")),
      ...exactColorsFromInput({
        accentColor: getString(formData, "accentColor"),
        primaryColor: getString(formData, "primaryColor"),
        useAccentColor: getString(formData, "useAccentColor"),
        usePrimaryColor: getString(formData, "usePrimaryColor"),
      }),
    ],
  });

  if (
    paletteInput.appName.length < 2 ||
    (paletteInput.appCategory?.length ?? 0) < 2 ||
    (paletteInput.audience?.length ?? 0) < 2 ||
    (paletteInput.desiredMood?.length ?? 0) < 2
  ) {
    return {
      errorMessage:
        "Add app name, app category, audience, and desired mood before generating a palette.",
      status: "failed",
    };
  }

  try {
    const palette = await generatePaletteSystem(paletteInput);

    return {
      inputSignature: paletteInputSignature(paletteInput),
      palette,
      status: "generated",
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Palette generation failed. Try again.",
      status: "failed",
    };
  }
}

export async function previewProjectReferenceAnalysis(
  _state: ReferencePreviewState,
  formData: FormData,
): Promise<ReferencePreviewState> {
  await requireUser();

  const referenceLinks = splitLines(getString(formData, "referenceLinks"));

  if (referenceLinks.length === 0) {
    return {
      errorMessage: "Add at least one reference URL before analyzing.",
      sourceUrls: [],
      status: "skipped",
    };
  }

  try {
    const result = await analyzeReferenceUrls(referenceLinks);

    if (result.sourceUrls.length === 0) {
      return {
        errorMessage:
          "Reference links need to be full URLs, like https://example.com.",
        sourceUrls: referenceLinks,
        status: "failed",
      };
    }

    return {
      errorMessage: result.errorMessage,
      sourceUrls: result.sourceUrls,
      status: result.status,
      summary: result.summary,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown reference analysis error.",
      sourceUrls: referenceLinks,
      status: "failed",
      summary: "Reference analysis failed before project creation.",
    };
  }
}

export async function deleteProject(projectId: string) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, client_profile_id")
    .eq("id", projectId)
    .single<ProjectForDelete>();

  if (!project) {
    redirect("/projects?error=project-not-found");
  }

  const serviceSupabase = createServiceSupabaseClient();
  const storagePaths = await listProjectStoragePaths(project.id);

  if (storagePaths.length > 0) {
    const { error: removeError } = await serviceSupabase.storage
      .from(env.ASSET_BUCKET)
      .remove(storagePaths);

    if (removeError) {
      redirect(`/projects/${project.id}?error=delete-storage-failed`);
    }
  }

  const { error: deleteError } = await serviceSupabase
    .from("projects")
    .delete()
    .eq("id", project.id)
    .eq("client_profile_id", project.client_profile_id);

  if (deleteError) {
    redirect(`/projects/${project.id}?error=delete-project-failed`);
  }

  revalidatePath("/projects");
  redirect("/projects?deleted=1");
}

async function listProjectStoragePaths(projectId: string) {
  const serviceSupabase = createServiceSupabaseClient();
  const { data: directions, error: directionsError } = await serviceSupabase
    .from("design_directions")
    .select("id")
    .eq("project_id", projectId)
    .returns<DirectionForDelete[]>();

  if (directionsError || !directions || directions.length === 0) {
    return [];
  }

  const { data: generations, error: generationsError } = await serviceSupabase
    .from("asset_generations")
    .select("id")
    .in(
      "design_direction_id",
      directions.map((direction) => direction.id),
    )
    .returns<GenerationForDelete[]>();

  if (generationsError || !generations || generations.length === 0) {
    return [];
  }

  const { data: files, error: filesError } = await serviceSupabase
    .from("asset_files")
    .select("storage_path")
    .in(
      "generation_id",
      generations.map((generation) => generation.id),
    )
    .returns<AssetFileForDelete[]>();

  if (filesError || !files) {
    return [];
  }

  return [...new Set(files.map((file) => file.storage_path))];
}

async function saveReferenceAnalysis(projectId: string, urls: string[]) {
  const serviceSupabase = createServiceSupabaseClient();
  let result: ReferenceAnalysisResult;

  try {
    result = await analyzeReferenceUrls(urls);
  } catch (error) {
    result = await analyzeReferenceUrls([]);
    result = {
      ...result,
      errorMessage:
        error instanceof Error ? error.message : "Unknown reference analysis error",
      sourceUrls: urls,
      status: "failed",
    };
  }

  await serviceSupabase.from("reference_analyses").insert({
    project_id: projectId,
    source_urls: result.sourceUrls,
    status: result.status,
    analysis_json: result.analysis,
    summary: result.summary,
    error_message: result.errorMessage ?? null,
  });
}

async function savePaletteSpec({
  createdBy,
  palette,
  projectId,
}: {
  createdBy: string;
  palette: PaletteSystem;
  projectId: string;
}) {
  const serviceSupabase = createServiceSupabaseClient();

  const { error } = await serviceSupabase.from("palette_specs").insert({
    project_id: projectId,
    created_by: createdBy,
    status: "approved",
    source_json: palette.source,
    light_json: palette.light,
    dark_json: palette.dark,
    summary: palette.summary,
    updated_at: new Date().toISOString(),
  });

  return !error;
}

function buildPaletteGenerationInput(input: {
  appCategory: string;
  appName: string;
  audience: string;
  desiredMood: string;
  dislikedColors: string[];
  effectPreference: string;
  likedColors: string[];
}): PaletteGenerationInput {
  return {
    appCategory: input.appCategory.trim(),
    appName: input.appName.trim(),
    audience: input.audience.trim(),
    desiredMood: input.desiredMood.trim(),
    dislikedColors: input.dislikedColors,
    effectPreference: normalizePaletteEffectPreference(input.effectPreference),
    likedColors: input.likedColors,
  };
}

function parseApprovedPalette(
  approvedPaletteJson: string,
  approvedPaletteSignature: string,
  paletteInput: PaletteGenerationInput,
) {
  if (approvedPaletteSignature !== paletteInputSignature(paletteInput)) {
    return null;
  }

  return parsePaletteSystemJson(approvedPaletteJson);
}

function exactColorsFromInput(input: {
  accentColor: string;
  primaryColor: string;
  useAccentColor: string;
  usePrimaryColor: string;
}) {
  return [
    input.usePrimaryColor && isHexColor(input.primaryColor)
      ? `Primary anchor ${input.primaryColor}`
      : "",
    input.useAccentColor && isHexColor(input.accentColor)
      ? `Accent anchor ${input.accentColor}`
      : "",
  ].filter(Boolean);
}

function fontPreferencesFromInput(input: {
  bodyFont: string;
  displayFont: string;
  fontPreferences: string;
  fontPreset: string;
  utilityFont: string;
}) {
  return [
    input.fontPreset ? `Suggested font pairing: ${input.fontPreset}.` : "",
    input.displayFont
      ? `Display / Voice font: ${input.displayFont}. Use for brand-first large titles, hero moments, logos, pull quotes, and identity-heavy text. Keep it expressive but limited to roughly 5% of the interface.`
      : "",
    input.bodyFont
      ? `Body / Workhorse font: ${input.bodyFont}. Use for paragraphs, UI labels, navigation, buttons, forms, and most client-facing text. It should do roughly 80% of the typography work.`
      : "",
    input.utilityFont
      ? `Utility / Accent font: ${input.utilityFont}. Use sparingly for data, timestamps, IDs, tabular details, technical metadata, pull quotes, or specialty accent moments. Keep it to roughly 15% or less.`
      : "",
    "Typography hierarchy rule: body/workhorse carries readability; display and utility should support hierarchy without taking over dense UI surfaces.",
    input.fontPreferences
      ? `Additional client font notes: ${input.fontPreferences}`
      : "",
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n");
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
