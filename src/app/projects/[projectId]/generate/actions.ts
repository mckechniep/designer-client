"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import { createAssetPackage } from "@/lib/generation/derivatives";
import {
  canGenerate,
  nextUsedGenerationCount,
} from "@/lib/generation/limits";
import { createImageGenerationProvider } from "@/lib/generation/image-provider";
import {
  buildRelatedAssetPrompt,
  buildMasterAssetPrompt,
  buildStructuredInterpretation,
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

interface PreviousProviderContextRecord {
  provider_response_id: string | null;
}

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
          "app_name, audience, desired_mood, liked_colors, disliked_colors, font_preferences, reference_links, visual_dislikes, brand_notes",
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
  const promptInput = {
    appName: brief.app_name,
    audience: brief.audience,
    desiredMood: brief.desired_mood,
    likedColors: brief.liked_colors,
    dislikedColors: brief.disliked_colors,
    fontPreferences: brief.font_preferences,
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
      iconSubjects: inferIconSubjects(project.app_category, brief.app_name),
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
        interpretation,
        paletteSystem,
        packageVersion: assetPackage.manifest.version,
      },
      buttons_json: {
        lightSheet: findManifestPath(assetPackage, "buttons_light"),
        darkSheet: findManifestPath(assetPackage, "buttons_dark"),
      },
      readme:
        "Use the master/light source screen and dark screen as source visuals. Keep UI text and interactive controls in code; use the button sheets for state/token handoff.",
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
      targetLabel: "dark mobile source screen",
    },
    {
      fileName: `app-icon-set-${version}.png`,
      kind: "icon_set_showcase",
      responsesAction: "generate",
      targetLabel: "app-specific utility icon set",
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

function findManifestPath(
  assetPackage: GeneratedAssetPackage,
  kind: GeneratedAssetManifestItem["kind"],
) {
  return assetPackage.manifest.files.find((file) => file.kind === kind)?.path;
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

function createAppSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "mobile-app"
  );
}

function inferIconSubjects(appCategory: string, appName: string) {
  const context = `${appCategory} ${appName}`.toLowerCase();

  if (
    context.includes("parent") ||
    context.includes("baby") ||
    context.includes("child") ||
    context.includes("family")
  ) {
    return [
      "home",
      "feeding",
      "sleep",
      "diaper",
      "growth",
      "calendar",
      "timer",
      "checklist",
      "health",
      "chat",
      "profile",
      "settings",
    ];
  }

  if (context.includes("fitness") || context.includes("health")) {
    return [
      "home",
      "workout",
      "timer",
      "progress",
      "heart",
      "meal",
      "calendar",
      "checklist",
      "chat",
      "profile",
      "settings",
      "alert",
    ];
  }

  return [
    "home",
    "profile",
    "calendar",
    "timer",
    "checklist",
    "heart",
    "chat",
    "stats",
    "settings",
    "alert",
    "search",
    "bookmark",
  ];
}
