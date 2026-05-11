"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import { createAssetPackage } from "@/lib/generation/derivatives";
import { formatFontPreferences } from "@/lib/generation/fonts";
import {
  canGenerate,
  nextUsedGenerationCount,
} from "@/lib/generation/limits";
import { createImageGenerationProvider } from "@/lib/generation/image-provider";
import {
  buildAdditionalBackgroundPrompt,
  buildAppImageryPrompt,
  buildOptionalIconSetPrompt,
  buildRelatedAssetPrompt,
  buildMasterAssetPrompt,
  buildStructuredInterpretation,
  type AppImageryPromptItem,
} from "@/lib/generation/prompt";
import {
  formatPaletteSystemForPrompt,
  type PaletteModeSpec,
  type PaletteSystem,
} from "@/lib/palette/spec";
import {
  ensureDefaultDesignDirections,
  getSelectedDesignDirection,
} from "@/lib/projects/default-directions";
import type {
  GeneratedAssetFile,
  GeneratedAssetKind,
  GeneratedAssetManifestItem,
  GeneratedAssetPackage,
  GeneratedImage,
  ImageGenerationProvider,
} from "@/lib/generation/provider";
import {
  compactReferenceAnalysisForPrompt,
  type UIAnalysisPack,
} from "@/lib/reference-analysis/analyzer";
import { normalizeIconSubjects } from "@/lib/icons/input";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase/server";

interface ProjectRecord {
  id: string;
  app_category: string;
  name: string;
  client_profile_id: string;
}

interface BriefRecord {
  app_name: string;
  audience: string;
  desired_mood: string;
  liked_colors: string[];
  disliked_colors: string[];
  font_preferences: string;
  icon_subjects: string[];
  reference_links: string[];
  visual_dislikes: string;
  brand_notes: string;
}

interface DirectionRecord {
  id: string;
  project_id: string;
  summary: string;
  title: string;
}

interface LimitRecord {
  max_generations: number | null;
  used_generations: number;
}

interface ReferenceAnalysisRecord {
  analysis_json: UIAnalysisPack;
  summary: string;
}

interface PaletteSpecRecord {
  dark_json: PaletteModeSpec;
  light_json: PaletteModeSpec;
  source_json: PaletteSystem["source"];
  summary: string;
}

interface GenerationRecord {
  id: string;
}

interface IconSourceGenerationRecord {
  design_direction_id: string;
  id: string;
  provider_metadata: Record<string, unknown> | null;
  provider_response_id: string | null;
}

interface PreviousProviderContextRecord {
  provider_response_id: string | null;
}

const maxExpandedBackgroundsPerRun = 4;
const maxAppImageryItemsPerRun = 5;

export async function selectDesignDirection(
  projectId: string,
  formData: FormData,
) {
  await requireUser();
  const directionId = getString(formData, "directionId");

  if (!directionId) {
    redirect(`/projects/${projectId}?error=select-direction-first`);
  }

  const supabase = await createServerSupabaseClient();
  const { data: direction } = await supabase
    .from("design_directions")
    .select("id, project_id")
    .eq("id", directionId)
    .eq("project_id", projectId)
    .single<DirectionRecord>();

  if (!direction) {
    redirect(`/projects/${projectId}?error=select-direction-first`);
  }

  const serviceSupabase = createServiceSupabaseClient();
  await serviceSupabase
    .from("design_directions")
    .update({ is_selected: false })
    .eq("project_id", projectId);
  await serviceSupabase
    .from("design_directions")
    .update({ is_selected: true })
    .eq("id", direction.id)
    .eq("project_id", projectId);

  revalidatePath(`/projects/${projectId}`);
}

export async function generateAssetPackage(
  projectId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, app_category, client_profile_id")
    .eq("id", projectId)
    .single<ProjectRecord>();

  if (!project) {
    redirect("/projects?error=project-not-found");
  }

  const [
    { data: brief },
    { data: direction },
    { data: limit },
    { data: referenceAnalyses },
    { data: paletteSpecs },
  ] =
    await Promise.all([
      supabase
        .from("design_briefs")
        .select(
          "app_name, audience, desired_mood, liked_colors, disliked_colors, font_preferences, icon_subjects, reference_links, visual_dislikes, brand_notes",
        )
        .eq("project_id", projectId)
        .single<BriefRecord>(),
      supabase
        .from("design_directions")
        .select("id, project_id, title, summary")
        .eq("project_id", projectId)
        .eq("is_selected", true)
        .single<DirectionRecord>(),
      supabase
        .from("generation_limits")
        .select("max_generations, used_generations")
        .eq("client_profile_id", project.client_profile_id)
        .single<LimitRecord>(),
      supabase
        .from("reference_analyses")
        .select("analysis_json, summary")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<ReferenceAnalysisRecord[]>(),
      supabase
        .from("palette_specs")
        .select("light_json, dark_json, source_json, summary")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<PaletteSpecRecord[]>(),
    ]);

  if (!brief) {
    redirect(`/projects/${projectId}?error=missing-brief`);
  }

  let selectedDirection = direction;

  if (!selectedDirection) {
    try {
      await ensureDefaultDesignDirections({
        appName: brief.app_name,
        projectId,
      });
      selectedDirection = await getSelectedDesignDirection(projectId);
    } catch {
      redirect(`/projects/${projectId}?error=create-directions-failed`);
    }
  }

  if (!selectedDirection) {
    redirect(`/projects/${projectId}?error=select-direction-first`);
  }

  const paletteRecord = paletteSpecs?.[0];

  if (!paletteRecord) {
    redirect(`/projects/${projectId}?error=missing-palette`);
  }

  const paletteSystem: PaletteSystem = {
    dark: paletteRecord.dark_json,
    light: paletteRecord.light_json,
    source: paletteRecord.source_json,
    summary: paletteRecord.summary,
  };

  const currentLimit: LimitRecord = limit ?? {
    max_generations: 50,
    used_generations: 0,
  };
  const nextGenerationNumber = currentLimit.used_generations + 1;
  const decision = canGenerate({
    maxGenerations: currentLimit.max_generations,
    usedGenerations: currentLimit.used_generations,
  });

  if (!decision.allowed) {
    redirect(`/projects/${projectId}?error=generation-limit`);
  }

  const feedback = getString(formData, "feedback");
  const interpretation = buildStructuredInterpretation(feedback);
  const referenceAnalysis = referenceAnalyses?.[0];
  const iconSubjects = normalizeIconSubjects(brief.icon_subjects, {
    appCategory: project.app_category,
    appName: brief.app_name,
  });
  const promptInput = {
    appName: brief.app_name,
    audience: brief.audience,
    desiredMood: brief.desired_mood,
    likedColors: brief.liked_colors,
    dislikedColors: brief.disliked_colors,
    fontPreferences: brief.font_preferences,
    iconSubjects,
    paletteSystem: formatPaletteSystemForPrompt(paletteSystem),
    referenceAnalysis:
      referenceAnalysis?.summary ??
      compactReferenceAnalysisForPrompt(referenceAnalysis?.analysis_json),
    referenceLinks: brief.reference_links,
    selectedDirection: {
      summary: selectedDirection.summary,
      title: selectedDirection.title,
    },
    visualDislikes: brief.visual_dislikes,
    brandNotes: brief.brand_notes,
    feedbackInterpretation: interpretation,
  };
  const prompt = buildMasterAssetPrompt(promptInput);
  const provider = createImageGenerationProvider();
  const previousProviderContext =
    feedback && provider.name === "openai-responses"
      ? await getPreviousProviderContext(selectedDirection.id)
      : null;
  const { data: generation, error: generationError } = await serviceSupabase
    .from("asset_generations")
    .insert({
      design_direction_id: selectedDirection.id,
      requested_by: user.id,
      status: "running",
      freeform_feedback: feedback,
      structured_interpretation: interpretation,
      prompt,
      provider: provider.name,
      model: provider.model,
    })
    .select("id")
    .single<GenerationRecord>();

  if (generationError || !generation) {
    redirect(`/projects/${projectId}?error=generation-record-failed`);
  }

  try {
    const packageVersion = `v${nextGenerationNumber}`;
    const master = await provider.generateMasterAsset({
      prompt,
      aspect: "portrait",
      previousResponseId:
        previousProviderContext?.provider_response_id ?? undefined,
      quality: "final",
    });
    const generatedAssets = await generateRelatedPackageAssets({
      masterResponseId: master.providerResponseId,
      packageVersion,
      promptInput,
      provider,
    });
    const assetPackage = await createAssetPackage(master, {
      appSlug: createAppSlug(brief.app_name),
      fontPreferences: brief.font_preferences,
      generatedAssets,
      iconSubjects,
      paletteSystem,
      version: packageVersion,
    });

    await uploadAssetPackage({
      assetPackage,
      clientProfileId: project.client_profile_id,
      generationId: generation.id,
      projectId,
    });

    await serviceSupabase
      .from("asset_generations")
      .update({
        status: "succeeded",
        counted_against_limit: true,
        completed_at: new Date().toISOString(),
        provider_image_id: master.providerImageId ?? null,
        provider_metadata: {
          master: master.providerMetadata ?? {},
          relatedAssets: generatedAssets.map((asset) => ({
            fileName: asset.fileName,
            kind: asset.kind,
            providerImageId: asset.providerImageId ?? null,
            providerMetadata: asset.providerMetadata ?? {},
            providerResponseId: asset.providerResponseId ?? null,
          })),
        },
        provider_response_id: master.providerResponseId ?? null,
      })
      .eq("id", generation.id);

    await serviceSupabase.from("style_specs").insert({
      generation_id: generation.id,
      theme_json: {
        appName: brief.app_name,
        iconSubjects,
        interpretation,
        paletteSystem,
        packageVersion: assetPackage.manifest.version,
      },
      buttons_json: {},
      readme:
        "Use the master/light source background and dark source background as textless visual foundations. Keep UI text, controls, and interactive components in code.",
    });

    await serviceSupabase.from("generation_limits").upsert({
      client_profile_id: project.client_profile_id,
      max_generations: currentLimit.max_generations,
      used_generations: nextUsedGenerationCount({
        usedGenerations: currentLimit.used_generations,
        producedUsableAssets: true,
      }),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    await serviceSupabase
      .from("asset_generations")
      .update({
        status: "failed",
        error_message:
          error instanceof Error ? error.message : "Unknown generation error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    redirect(`/projects/${projectId}?error=generation-failed`);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?generated=1`);
}

export async function generateOptionalIconAssets(
  projectId: string,
  formData: FormData,
) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, app_category, client_profile_id")
    .eq("id", projectId)
    .single<ProjectRecord>();

  if (!project) {
    redirect("/projects?error=project-not-found");
  }

  const [
    { data: brief },
    { data: directions },
    { data: referenceAnalyses },
    { data: paletteSpecs },
  ] = await Promise.all([
    supabase
      .from("design_briefs")
      .select(
        "app_name, audience, desired_mood, liked_colors, disliked_colors, font_preferences, icon_subjects, reference_links, visual_dislikes, brand_notes",
      )
      .eq("project_id", projectId)
      .single<BriefRecord>(),
    supabase
      .from("design_directions")
      .select("id, project_id, title, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .returns<DirectionRecord[]>(),
    supabase
      .from("reference_analyses")
      .select("analysis_json, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<ReferenceAnalysisRecord[]>(),
    supabase
      .from("palette_specs")
      .select("light_json, dark_json, source_json, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<PaletteSpecRecord[]>(),
  ]);

  if (!brief) {
    redirect(`/projects/${projectId}?error=missing-brief`);
  }

  const directionRows = directions ?? [];

  if (directionRows.length === 0) {
    redirect(`/projects/${projectId}?error=select-direction-first`);
  }

  const { data: generations } = await serviceSupabase
    .from("asset_generations")
    .select(
      "id, design_direction_id, provider_response_id, provider_metadata",
    )
    .in(
      "design_direction_id",
      directionRows.map((direction) => direction.id),
    )
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<IconSourceGenerationRecord[]>();
  const sourceGeneration = generations?.[0];

  if (!sourceGeneration) {
    redirect(`/projects/${projectId}?error=missing-screen-generation`);
  }

  const { data: screenFiles } = await serviceSupabase
    .from("asset_files")
    .select("kind")
    .eq("generation_id", sourceGeneration.id)
    .in("kind", ["screen_plain_light", "screen_plain_dark"])
    .returns<Array<{ kind: string }>>();
  const hasSourceBackgrounds =
    screenFiles?.some((file) => file.kind === "screen_plain_light") &&
    screenFiles.some((file) => file.kind === "screen_plain_dark");

  if (!hasSourceBackgrounds) {
    redirect(`/projects/${projectId}?error=missing-screen-generation`);
  }

  const sourceDirection =
    directionRows.find(
      (direction) => direction.id === sourceGeneration.design_direction_id,
    ) ?? directionRows[0];
  const paletteRecord = paletteSpecs?.[0];

  if (!paletteRecord) {
    redirect(`/projects/${projectId}?error=missing-palette`);
  }

  const paletteSystem: PaletteSystem = {
    dark: paletteRecord.dark_json,
    light: paletteRecord.light_json,
    source: paletteRecord.source_json,
    summary: paletteRecord.summary,
  };
  const iconSubjects = normalizeIconSubjects(
    splitLines(getString(formData, "iconSubjects")),
    {
      appCategory: project.app_category,
      appName: brief.app_name,
    },
  );
  const referenceAnalysis = referenceAnalyses?.[0];
  const promptInput = {
    appName: brief.app_name,
    audience: brief.audience,
    desiredMood: brief.desired_mood,
    likedColors: brief.liked_colors,
    dislikedColors: brief.disliked_colors,
    fontPreferences: brief.font_preferences,
    iconSubjects,
    paletteSystem: formatPaletteSystemForPrompt(paletteSystem),
    referenceAnalysis:
      referenceAnalysis?.summary ??
      compactReferenceAnalysisForPrompt(referenceAnalysis?.analysis_json),
    referenceLinks: brief.reference_links,
    selectedDirection: {
      summary: sourceDirection.summary,
      title: sourceDirection.title,
    },
    visualDislikes: brief.visual_dislikes,
    brandNotes: brief.brand_notes,
    feedbackInterpretation: buildStructuredInterpretation(""),
  };
  const provider = createImageGenerationProvider();
  const screenContextResponseId =
    provider.name === "openai-responses"
      ? relatedProviderResponseId(
          sourceGeneration.provider_metadata,
          "screen_plain_dark",
        ) ?? sourceGeneration.provider_response_id ?? undefined
      : undefined;

  let iconAsset: GeneratedImage;

  try {
    iconAsset = await provider.generateAsset({
      aspect: "portrait",
      fileName: `app-icon-set-${iconVersion()}.png`,
      kind: "icon_set_showcase",
      previousResponseId: screenContextResponseId,
      prompt: buildOptionalIconSetPrompt(promptInput),
      quality: "final",
      responsesAction: "generate",
      targetLabel: "paired light and dark app utility icon sheet",
    });
  } catch {
    redirect(`/projects/${projectId}?error=icon-generation-failed`);
  }

  try {
    await serviceSupabase
      .from("design_briefs")
      .update({ icon_subjects: iconSubjects })
      .eq("project_id", projectId);

    await uploadGeneratedAsset({
      asset: iconAsset,
      clientProfileId: project.client_profile_id,
      generationId: sourceGeneration.id,
      projectId,
    });
  } catch {
    redirect(`/projects/${projectId}?error=icon-generation-failed`);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?icons=generated`);
}

export async function generateAdditionalBackgroundAssets(
  projectId: string,
  formData: FormData,
) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, app_category, client_profile_id")
    .eq("id", projectId)
    .single<ProjectRecord>();

  if (!project) {
    redirect("/projects?error=project-not-found");
  }

  const backgroundNames = normalizeBackgroundNames(
    splitLines(getString(formData, "backgroundSubjects")),
  );

  if (backgroundNames.length === 0) {
    redirect(`/projects/${projectId}?error=missing-background-subjects`);
  }

  const [
    { data: brief },
    { data: directions },
    { data: referenceAnalyses },
    { data: paletteSpecs },
  ] = await Promise.all([
    supabase
      .from("design_briefs")
      .select(
        "app_name, audience, desired_mood, liked_colors, disliked_colors, font_preferences, icon_subjects, reference_links, visual_dislikes, brand_notes",
      )
      .eq("project_id", projectId)
      .single<BriefRecord>(),
    supabase
      .from("design_directions")
      .select("id, project_id, title, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .returns<DirectionRecord[]>(),
    supabase
      .from("reference_analyses")
      .select("analysis_json, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<ReferenceAnalysisRecord[]>(),
    supabase
      .from("palette_specs")
      .select("light_json, dark_json, source_json, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<PaletteSpecRecord[]>(),
  ]);

  if (!brief) {
    redirect(`/projects/${projectId}?error=missing-brief`);
  }

  const directionRows = directions ?? [];

  if (directionRows.length === 0) {
    redirect(`/projects/${projectId}?error=select-direction-first`);
  }

  const { data: generations } = await serviceSupabase
    .from("asset_generations")
    .select(
      "id, design_direction_id, provider_response_id, provider_metadata",
    )
    .in(
      "design_direction_id",
      directionRows.map((direction) => direction.id),
    )
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<IconSourceGenerationRecord[]>();
  const sourceGeneration = generations?.[0];

  if (!sourceGeneration) {
    redirect(`/projects/${projectId}?error=missing-source-backgrounds`);
  }

  const { data: sourceFiles } = await serviceSupabase
    .from("asset_files")
    .select("kind")
    .eq("generation_id", sourceGeneration.id)
    .in("kind", ["screen_plain_light", "screen_plain_dark"])
    .returns<Array<{ kind: string }>>();
  const hasSourceBackgrounds =
    sourceFiles?.some((file) => file.kind === "screen_plain_light") &&
    sourceFiles.some((file) => file.kind === "screen_plain_dark");

  if (!hasSourceBackgrounds) {
    redirect(`/projects/${projectId}?error=missing-source-backgrounds`);
  }

  const sourceDirection =
    directionRows.find(
      (direction) => direction.id === sourceGeneration.design_direction_id,
    ) ?? directionRows[0];
  const paletteRecord = paletteSpecs?.[0];

  if (!paletteRecord) {
    redirect(`/projects/${projectId}?error=missing-palette`);
  }

  const paletteSystem: PaletteSystem = {
    dark: paletteRecord.dark_json,
    light: paletteRecord.light_json,
    source: paletteRecord.source_json,
    summary: paletteRecord.summary,
  };
  const referenceAnalysis = referenceAnalyses?.[0];
  const promptInput = {
    appName: brief.app_name,
    audience: brief.audience,
    desiredMood: brief.desired_mood,
    likedColors: brief.liked_colors,
    dislikedColors: brief.disliked_colors,
    fontPreferences: brief.font_preferences,
    iconSubjects: normalizeIconSubjects(brief.icon_subjects, {
      appCategory: project.app_category,
      appName: brief.app_name,
    }),
    paletteSystem: formatPaletteSystemForPrompt(paletteSystem),
    referenceAnalysis:
      referenceAnalysis?.summary ??
      compactReferenceAnalysisForPrompt(referenceAnalysis?.analysis_json),
    referenceLinks: brief.reference_links,
    selectedDirection: {
      summary: sourceDirection.summary,
      title: sourceDirection.title,
    },
    visualDislikes: brief.visual_dislikes,
    brandNotes: brief.brand_notes,
    feedbackInterpretation: buildStructuredInterpretation(""),
  };
  const provider = createImageGenerationProvider();
  const sourceLightContextResponseId =
    provider.name === "openai-responses"
      ? sourceGeneration.provider_response_id ?? undefined
      : undefined;
  const sourceDarkContextResponseId =
    provider.name === "openai-responses"
      ? relatedProviderResponseId(
          sourceGeneration.provider_metadata,
          "screen_plain_dark",
        ) ?? sourceGeneration.provider_response_id ?? undefined
      : undefined;
  const generatedAssets: GeneratedImage[] = [];
  const version = iconVersion();

  try {
    for (const backgroundName of backgroundNames) {
      const slug = createBackgroundSlug(backgroundName);
      const lightAsset = await provider.generateAsset({
        aspect: "portrait",
        fileName: `background-${slug}-light-${version}.png`,
        kind: "background_plate_light",
        previousResponseId: sourceLightContextResponseId,
        prompt: buildAdditionalBackgroundPrompt({
          backgroundName,
          input: promptInput,
          mode: "light",
        }),
        quality: "final",
        responsesAction: "generate",
        targetLabel: `${backgroundName} light mobile app background plate`,
      });
      generatedAssets.push(lightAsset);

      generatedAssets.push(
        await provider.generateAsset({
          aspect: "portrait",
          fileName: `background-${slug}-dark-${version}.png`,
          kind: "background_plate_dark",
          previousResponseId:
            provider.name === "openai-responses"
              ? lightAsset.providerResponseId ?? sourceDarkContextResponseId
              : undefined,
          prompt: buildAdditionalBackgroundPrompt({
            backgroundName,
            input: promptInput,
            mode: "dark",
          }),
          quality: "final",
          responsesAction: "generate",
          targetLabel: `${backgroundName} dark mobile app background plate`,
        }),
      );
    }
  } catch {
    redirect(`/projects/${projectId}?error=background-generation-failed`);
  }

  try {
    for (const asset of generatedAssets) {
      await uploadGeneratedAsset({
        asset,
        clientProfileId: project.client_profile_id,
        generationId: sourceGeneration.id,
        projectId,
      });
    }
  } catch {
    redirect(`/projects/${projectId}?error=background-generation-failed`);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?backgrounds=generated`);
}

export async function generateAppImageryAssets(
  projectId: string,
  formData: FormData,
) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, app_category, client_profile_id")
    .eq("id", projectId)
    .single<ProjectRecord>();

  if (!project) {
    redirect("/projects?error=project-not-found");
  }

  const imageryItems = normalizeAppImageryItems(formData);

  if (imageryItems.length === 0) {
    redirect(`/projects/${projectId}?error=missing-app-imagery-items`);
  }

  const [
    { data: brief },
    { data: directions },
    { data: referenceAnalyses },
    { data: paletteSpecs },
  ] = await Promise.all([
    supabase
      .from("design_briefs")
      .select(
        "app_name, audience, desired_mood, liked_colors, disliked_colors, font_preferences, icon_subjects, reference_links, visual_dislikes, brand_notes",
      )
      .eq("project_id", projectId)
      .single<BriefRecord>(),
    supabase
      .from("design_directions")
      .select("id, project_id, title, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .returns<DirectionRecord[]>(),
    supabase
      .from("reference_analyses")
      .select("analysis_json, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<ReferenceAnalysisRecord[]>(),
    supabase
      .from("palette_specs")
      .select("light_json, dark_json, source_json, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<PaletteSpecRecord[]>(),
  ]);

  if (!brief) {
    redirect(`/projects/${projectId}?error=missing-brief`);
  }

  const directionRows = directions ?? [];

  if (directionRows.length === 0) {
    redirect(`/projects/${projectId}?error=select-direction-first`);
  }

  const { data: generations } = await serviceSupabase
    .from("asset_generations")
    .select(
      "id, design_direction_id, provider_response_id, provider_metadata",
    )
    .in(
      "design_direction_id",
      directionRows.map((direction) => direction.id),
    )
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<IconSourceGenerationRecord[]>();
  const sourceGeneration = generations?.[0];

  if (!sourceGeneration) {
    redirect(`/projects/${projectId}?error=missing-source-backgrounds`);
  }

  const { data: sourceFiles } = await serviceSupabase
    .from("asset_files")
    .select("kind")
    .eq("generation_id", sourceGeneration.id)
    .in("kind", ["screen_plain_light", "screen_plain_dark"])
    .returns<Array<{ kind: string }>>();
  const hasSourceBackgrounds =
    sourceFiles?.some((file) => file.kind === "screen_plain_light") &&
    sourceFiles.some((file) => file.kind === "screen_plain_dark");

  if (!hasSourceBackgrounds) {
    redirect(`/projects/${projectId}?error=missing-source-backgrounds`);
  }

  const sourceDirection =
    directionRows.find(
      (direction) => direction.id === sourceGeneration.design_direction_id,
    ) ?? directionRows[0];
  const paletteRecord = paletteSpecs?.[0];

  if (!paletteRecord) {
    redirect(`/projects/${projectId}?error=missing-palette`);
  }

  const paletteSystem: PaletteSystem = {
    dark: paletteRecord.dark_json,
    light: paletteRecord.light_json,
    source: paletteRecord.source_json,
    summary: paletteRecord.summary,
  };
  const referenceAnalysis = referenceAnalyses?.[0];
  const promptInput = {
    appName: brief.app_name,
    audience: brief.audience,
    desiredMood: brief.desired_mood,
    likedColors: brief.liked_colors,
    dislikedColors: brief.disliked_colors,
    fontPreferences: brief.font_preferences,
    iconSubjects: normalizeIconSubjects(brief.icon_subjects, {
      appCategory: project.app_category,
      appName: brief.app_name,
    }),
    paletteSystem: formatPaletteSystemForPrompt(paletteSystem),
    referenceAnalysis:
      referenceAnalysis?.summary ??
      compactReferenceAnalysisForPrompt(referenceAnalysis?.analysis_json),
    referenceLinks: brief.reference_links,
    selectedDirection: {
      summary: sourceDirection.summary,
      title: sourceDirection.title,
    },
    visualDislikes: brief.visual_dislikes,
    brandNotes: brief.brand_notes,
    feedbackInterpretation: buildStructuredInterpretation(""),
  };
  const provider = createImageGenerationProvider();
  const imageContextResponseId =
    provider.name === "openai-responses"
      ? relatedProviderResponseId(
          sourceGeneration.provider_metadata,
          "screen_plain_dark",
        ) ?? sourceGeneration.provider_response_id ?? undefined
      : undefined;
  const generatedAssets: GeneratedImage[] = [];
  const version = iconVersion();

  try {
    for (const image of imageryItems) {
      generatedAssets.push(
        await provider.generateAsset({
          aspect: "portrait",
          fileName: `app-image-${createBackgroundSlug(image.name)}-${version}.png`,
          kind: "app_image",
          previousResponseId: imageContextResponseId,
          prompt: buildAppImageryPrompt({
            image,
            input: promptInput,
          }),
          quality: "final",
          responsesAction: "generate",
          targetLabel: `${image.name} in-app image asset`,
        }),
      );
    }
  } catch {
    redirect(`/projects/${projectId}?error=app-imagery-generation-failed`);
  }

  try {
    for (const asset of generatedAssets) {
      await uploadGeneratedAsset({
        asset,
        clientProfileId: project.client_profile_id,
        generationId: sourceGeneration.id,
        projectId,
      });
    }
  } catch {
    redirect(`/projects/${projectId}?error=app-imagery-generation-failed`);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?imagery=generated`);
}

export async function updateProjectTypography(
  projectId: string,
  formData: FormData,
) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, client_profile_id")
    .eq("id", projectId)
    .single<Pick<ProjectRecord, "client_profile_id" | "id">>();

  if (!project) {
    redirect("/projects?error=project-not-found");
  }

  const fontPreferences = formatFontPreferences({
    bodyFont: getString(formData, "bodyFont"),
    displayFont: getString(formData, "displayFont"),
    fontPreferences: getString(formData, "fontPreferences"),
    fontPreset: getString(formData, "fontPreset"),
    utilityFont: getString(formData, "utilityFont"),
  });

  if (!fontPreferences) {
    redirect(`/projects/${projectId}?error=typography-save-failed`);
  }

  const { error: updateError } = await serviceSupabase
    .from("design_briefs")
    .update({ font_preferences: fontPreferences })
    .eq("project_id", projectId);

  if (updateError) {
    redirect(`/projects/${projectId}?error=typography-save-failed`);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?typography=saved`);
}

async function getPreviousProviderContext(designDirectionId: string) {
  const serviceSupabase = createServiceSupabaseClient();
  const { data } = await serviceSupabase
    .from("asset_generations")
    .select("provider_response_id")
    .eq("design_direction_id", designDirectionId)
    .eq("provider", "openai-responses")
    .eq("status", "succeeded")
    .not("provider_response_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<PreviousProviderContextRecord[]>();

  return data?.[0] ?? null;
}

async function generateRelatedPackageAssets({
  masterResponseId,
  packageVersion,
  promptInput,
  provider,
}: {
  masterResponseId?: string;
  packageVersion: string;
  promptInput: Parameters<typeof buildMasterAssetPrompt>[0];
  provider: ImageGenerationProvider;
}): Promise<GeneratedImage[]> {
  const assets: GeneratedImage[] = [];

  for (const spec of relatedPackageAssetSpecs(packageVersion)) {
    assets.push(
      await provider.generateAsset({
        aspect: "portrait",
        fileName: spec.fileName,
        kind: spec.kind,
        previousResponseId: masterResponseId,
        prompt: buildRelatedAssetPrompt({
          input: promptInput,
          kind: spec.kind,
        }),
        quality: "final",
        responsesAction: spec.responsesAction,
        targetLabel: spec.targetLabel,
      }),
    );
  }

  return assets;
}

function relatedPackageAssetSpecs(version: string): Array<{
  fileName: string;
  kind: GeneratedAssetKind;
  responsesAction: "edit" | "generate";
  targetLabel: string;
}> {
  return [
    {
      fileName: `dark-screen-${version}.png`,
      kind: "screen_plain_dark",
      responsesAction: "edit",
      targetLabel: "dark mobile source background",
    },
  ];
}

async function uploadAssetPackage({
  assetPackage,
  clientProfileId,
  generationId,
  projectId,
}: {
  assetPackage: GeneratedAssetPackage;
  clientProfileId: string;
  generationId: string;
  projectId: string;
}) {
  const serviceSupabase = createServiceSupabaseClient();
  const manifestItems = new Map(
    assetPackage.manifest.files.map((item) => [manifestKey(item), item]),
  );
  const files: Array<GeneratedAssetFile & { packagePath: string }> = [
    ...assetPackage.files.map((file) => {
      const manifestItem = manifestItems.get(fileKey(file));

      return {
        ...file,
        packagePath: manifestItem?.path ?? file.fileName,
      };
    }),
    {
      ...assetPackage.downloadPackage,
      packagePath: assetPackage.downloadPackage.fileName,
    },
  ];

  for (const file of files) {
    const storagePath = [
      clientProfileId,
      projectId,
      generationId,
      file.packagePath,
    ].join("/");
    const { error: uploadError } = await serviceSupabase.storage
      .from(env.ASSET_BUCKET)
      .upload(storagePath, file.bytes, {
        cacheControl: "3600",
        contentType: file.mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: fileError } = await serviceSupabase.from("asset_files").insert({
      generation_id: generationId,
      kind: file.kind,
      storage_path: storagePath,
      file_name: file.fileName,
      mime_type: file.mimeType,
      width: file.width ?? null,
      height: file.height ?? null,
      byte_size: file.bytes.byteLength,
    });

    if (fileError) {
      throw fileError;
    }
  }
}

async function uploadGeneratedAsset({
  asset,
  clientProfileId,
  generationId,
  projectId,
}: {
  asset: GeneratedImage;
  clientProfileId: string;
  generationId: string;
  projectId: string;
}) {
  const serviceSupabase = createServiceSupabaseClient();
  const storagePath = [
    clientProfileId,
    projectId,
    generationId,
    "mobile-assets",
    asset.fileName,
  ].join("/");

  const { error: uploadError } = await serviceSupabase.storage
    .from(env.ASSET_BUCKET)
    .upload(storagePath, asset.bytes, {
      cacheControl: "3600",
      contentType: asset.mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: fileError } = await serviceSupabase.from("asset_files").insert({
    generation_id: generationId,
    kind: asset.kind,
    storage_path: storagePath,
    file_name: asset.fileName,
    mime_type: asset.mimeType,
    width: asset.width,
    height: asset.height,
    byte_size: asset.bytes.byteLength,
  });

  if (fileError) {
    throw fileError;
  }
}

function fileKey(file: Pick<GeneratedAssetFile, "fileName" | "kind">) {
  return `${file.kind}:${file.fileName}`;
}

function manifestKey(
  item: Pick<GeneratedAssetManifestItem, "fileName" | "kind">,
) {
  return `${item.kind}:${item.fileName}`;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBackgroundNames(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const name = value.replace(/\s+/g, " ").trim();
    const key = name.toLowerCase();

    if (!name || name.length > 64 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(name);

    if (normalized.length >= maxExpandedBackgroundsPerRun) {
      break;
    }
  }

  return normalized;
}

function normalizeAppImageryItems(formData: FormData): AppImageryPromptItem[] {
  const names = getStringValues(formData, "imageName");
  const purposes = getStringValues(formData, "imagePurpose");
  const subjects = getStringValues(formData, "imageSubject");
  const styles = getStringValues(formData, "imageStyle");
  const formats = getStringValues(formData, "imageFormat");
  const compatibilities = getStringValues(formData, "imageCompatibility");
  const seen = new Set<string>();
  const normalized: AppImageryPromptItem[] = [];

  for (let index = 0; index < names.length; index += 1) {
    const name = normalizePromptField(names[index], 80);

    if (!name) {
      continue;
    }

    const purpose = normalizePromptField(purposes[index] ?? "", 140);
    const subject = normalizePromptField(subjects[index] ?? "", 180);
    const style = normalizePromptField(styles[index] ?? "", 140);
    const format = normalizePromptField(formats[index] ?? "", 120);
    const compatibility = normalizePromptField(
      compatibilities[index] ?? "",
      140,
    );
    const key = `${name}:${purpose}:${subject}`.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      compatibility,
      format,
      name,
      purpose,
      style,
      subject,
    });

    if (normalized.length >= maxAppImageryItemsPerRun) {
      break;
    }
  }

  return normalized;
}

function normalizePromptField(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function createAppSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "mobile-app"
  );
}

function createBackgroundSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "background"
  );
}

function iconVersion() {
  return new Date()
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d+Z$/, "Z")
    .replace("T", "-")
    .toLowerCase();
}

function relatedProviderResponseId(
  metadata: Record<string, unknown> | null,
  kind: GeneratedAssetKind,
) {
  const relatedAssets = Array.isArray(metadata?.relatedAssets)
    ? metadata.relatedAssets
    : [];

  for (const asset of relatedAssets) {
    if (!asset || typeof asset !== "object") {
      continue;
    }

    const candidate = asset as {
      kind?: unknown;
      providerResponseId?: unknown;
    };

    if (
      candidate.kind === kind &&
      typeof candidate.providerResponseId === "string"
    ) {
      return candidate.providerResponseId;
    }
  }

  return null;
}
