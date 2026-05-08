import Link from "next/link";
import { AssetGallery } from "@/components/assets/asset-gallery";
import { AssetPreview } from "@/components/assets/asset-preview";
import { DirectionPicker } from "@/components/generation/direction-picker";
import { FeedbackForm } from "@/components/generation/feedback-form";
import { GeneratePackageForm } from "@/components/generation/generate-package-form";
import { GenerationCounter } from "@/components/generation/generation-counter";
import { AppShell } from "@/components/layout/app-shell";
import { DeleteProjectForm } from "@/components/projects/delete-project-form";
import { PaletteSystemPanel } from "@/components/projects/palette-system-panel";
import { ReferenceAnalysisPanel } from "@/components/projects/reference-analysis-panel";
import { requireUser } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import type { GenerationStatusSnapshot } from "@/lib/generation/status";
import type {
  PaletteModeSpec,
  PaletteSystem,
} from "@/lib/palette/spec";
import { ensureDefaultDesignDirections } from "@/lib/projects/default-directions";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase/server";

type ProjectDetailParams = Promise<{
  projectId: string;
}>;

type ProjectDetailSearchParams = Promise<{
  error?: string | string[] | undefined;
  generated?: string | string[] | undefined;
  palette?: string | string[] | undefined;
  references?: string | string[] | undefined;
}>;

interface ProjectDetail {
  id: string;
  name: string;
  app_category: string;
  client_profile_id: string;
}

interface BriefSummary {
  app_name: string;
  audience: string;
  desired_mood: string;
  reference_links: string[];
}

interface DirectionSummary {
  id: string;
  title: string;
  summary: string;
  is_selected: boolean;
}

interface LimitSummary {
  max_generations: number | null;
  used_generations: number;
}

interface GenerationSummary {
  id: string;
  status: string;
  provider: string;
  model: string;
  freeform_feedback: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface AssetFileSummary {
  kind: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  byte_size: number | null;
}

interface SignedAsset {
  byteSize: number | null;
  fileName: string;
  height: number | null;
  kind: string;
  mimeType: string;
  src: string;
  width: number | null;
}

interface ReferenceAnalysisSummary {
  created_at: string;
  error_message: string | null;
  source_urls: string[];
  status: string;
  summary: string;
}

interface PaletteSpecSummary {
  dark_json: PaletteModeSpec;
  light_json: PaletteModeSpec;
  source_json: PaletteSystem["source"];
  summary: string;
}

const errorMessages: Record<string, string> = {
  "create-brief-failed":
    "The project was created, but we could not save the design brief.",
  "create-directions-failed":
    "The project was created, but we could not create the default design directions.",
  "create-generation-limit-failed":
    "The project was created, but we could not set the generation limit.",
  "generation-failed":
    "The generation failed before a usable package was created.",
  "generation-limit": "This client has reached the generation limit.",
  "generation-record-failed":
    "We could not create the generation record before starting.",
  "missing-brief": "This project needs a saved brief before generation.",
  "missing-palette":
    "Generate the light and dark palette system before creating assets.",
  "palette-generation-failed": "We could not generate the palette system.",
  "select-direction-first": "Select a design direction before generation.",
  "delete-project-failed": "We could not delete this project.",
  "delete-storage-failed":
    "We could not remove this project's generated files from storage.",
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: ProjectDetailParams;
  searchParams: ProjectDetailSearchParams;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const error = getParam(resolvedSearchParams.error);
  const generated = getParam(resolvedSearchParams.generated);
  const paletteGenerated = getParam(resolvedSearchParams.palette);
  const references = getParam(resolvedSearchParams.references);
  const message = error ? errorMessages[error] : undefined;
  const supabase = await createServerSupabaseClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, app_category, client_profile_id")
    .eq("id", projectId)
    .single<ProjectDetail>();

  if (!project) {
    return (
      <AppShell user={user}>
        <div className="max-w-2xl rounded-md border border-zinc-800 bg-zinc-900/40 p-6">
          <h1 className="text-2xl font-semibold text-zinc-50">
            Project not found
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            This project is unavailable or you do not have access to it.
          </p>
          <Link
            href="/projects"
            className="mt-5 inline-flex rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Back to projects
          </Link>
        </div>
      </AppShell>
    );
  }

  const [
    { data: brief },
    { data: directions },
    { data: limit },
    { data: referenceAnalyses },
    { data: paletteSpecs },
  ] =
    await Promise.all([
      supabase
        .from("design_briefs")
        .select("app_name, audience, desired_mood, reference_links")
        .eq("project_id", projectId)
        .single<BriefSummary>(),
      supabase
        .from("design_directions")
        .select("id, title, summary, is_selected")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .returns<DirectionSummary[]>(),
      supabase
        .from("generation_limits")
        .select("max_generations, used_generations")
        .eq("client_profile_id", project.client_profile_id)
        .single<LimitSummary>(),
      supabase
        .from("reference_analyses")
        .select("created_at, source_urls, status, summary, error_message")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<ReferenceAnalysisSummary[]>(),
      supabase
        .from("palette_specs")
        .select("light_json, dark_json, source_json, summary")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<PaletteSpecSummary[]>(),
    ]);
  let directionRows = directions ?? [];

  if (brief && directionRows.length === 0) {
    try {
      await ensureDefaultDesignDirections({
        appName: brief.app_name,
        projectId,
      });
      const { data: restoredDirections } = await supabase
        .from("design_directions")
        .select("id, title, summary, is_selected")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .returns<DirectionSummary[]>();

      directionRows = restoredDirections ?? [];
    } catch {
      directionRows = [];
    }
  }

  const sortedDirections = sortDirections(directionRows);
  const referenceAnalysis = referenceAnalyses?.[0];
  const paletteSpec = paletteSpecs?.[0];
  const paletteSystem: PaletteSystem | null = paletteSpec
    ? {
        dark: paletteSpec.dark_json,
        light: paletteSpec.light_json,
        source: paletteSpec.source_json,
        summary: paletteSpec.summary,
      }
    : null;
  let latestGeneration: GenerationSummary | undefined;
  let assetFiles: AssetFileSummary[] = [];
  let previewUrl: string | null = null;
  let previewFileName: string | null = null;
  let galleryAssets: SignedAsset[] = [];

  if (sortedDirections.length > 0) {
    const { data: generations } = await supabase
      .from("asset_generations")
      .select(
        "id, status, provider, model, freeform_feedback, error_message, created_at, completed_at",
      )
      .in(
        "design_direction_id",
        sortedDirections.map((direction) => direction.id),
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<GenerationSummary[]>();

    latestGeneration = generations?.[0];
  }

  if (latestGeneration) {
    const { data: files } = await supabase
      .from("asset_files")
      .select(
        "kind, storage_path, file_name, mime_type, width, height, byte_size",
      )
      .eq("generation_id", latestGeneration.id)
      .order("created_at", { ascending: true })
      .returns<AssetFileSummary[]>();

    assetFiles = files ?? [];
    const serviceSupabase = createServiceSupabaseClient();
    const imageFiles = assetFiles
      .filter(
        (file) =>
          file.mime_type.startsWith("image/") &&
          !deprecatedGalleryAssetKinds.has(file.kind),
      )
      .sort(compareAssetFiles);
    const previewFile =
      imageFiles.find((file) => file.kind === "thumbnail") ??
      imageFiles.find((file) => file.kind === "screen_plain_dark") ??
      imageFiles.find((file) => file.kind === "master_background");

    galleryAssets = (
      await Promise.all(
        imageFiles.map(async (file) => {
          const { data: signedAsset } = await serviceSupabase.storage
            .from(env.ASSET_BUCKET)
            .createSignedUrl(file.storage_path, 60 * 10);

          if (!signedAsset?.signedUrl) {
            return null;
          }

          return {
            byteSize: file.byte_size,
            fileName: file.file_name,
            height: file.height,
            kind: file.kind,
            mimeType: file.mime_type,
            src: signedAsset.signedUrl,
            width: file.width,
          };
        }),
      )
    ).filter((asset): asset is SignedAsset => Boolean(asset));

    if (previewFile) {
      previewFileName = previewFile.file_name;
      previewUrl =
        galleryAssets.find((asset) => asset.fileName === previewFile.file_name)
          ?.src ?? null;
    }
  }

  const packageFile = assetFiles.find(
    (file) => file.kind === "download_package",
  );
  const generationStatusSnapshot: GenerationStatusSnapshot = {
    latest: latestGeneration
      ? {
          completedAt: latestGeneration.completed_at,
          createdAt: latestGeneration.created_at,
          errorMessage: latestGeneration.error_message,
          fileCount: assetFiles.length,
          id: latestGeneration.id,
          model: latestGeneration.model,
          provider: latestGeneration.provider,
          status: latestGeneration.status,
        }
      : null,
    polledAt: new Date().toISOString(),
  };

  return (
    <AppShell user={user}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <Link
            href="/projects"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-300"
          >
            Projects
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">
            {project.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            {project.app_category} asset project for static mobile backgrounds,
            source screens, and implementation-ready visual direction.
          </p>

          {message ? (
            <div
              className="mt-6 rounded-md border border-red-800/80 bg-red-950/50 px-4 py-3 text-sm text-red-100"
              role="alert"
            >
              {message}
            </div>
          ) : null}

          {generated ? (
            <div
              className="mt-6 rounded-md border border-cyan-900/80 bg-cyan-950/35 px-4 py-3 text-sm text-cyan-100"
              role="status"
            >
              Asset package generated and saved.
            </div>
          ) : null}

          {references === "analyzed" ? (
            <div
              className="mt-6 rounded-md border border-cyan-900/80 bg-cyan-950/35 px-4 py-3 text-sm text-cyan-100"
              role="status"
            >
              Reference analysis updated.
            </div>
          ) : null}

          {paletteGenerated === "generated" ? (
            <div
              className="mt-6 rounded-md border border-cyan-900/80 bg-cyan-950/35 px-4 py-3 text-sm text-cyan-100"
              role="status"
            >
              Palette system generated.
            </div>
          ) : null}

          <div className="mt-8">
            <PaletteSystemPanel
              palette={paletteSystem}
              projectId={projectId}
            />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-50">
              Design direction
            </h2>
            <div className="mt-4">
              <DirectionPicker
                directions={sortedDirections}
                projectId={projectId}
              />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-50">
              Generate package
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Create the first static mobile package from the selected
              direction and saved brief.
            </p>
            <div className="mt-4">
              <GeneratePackageForm
                disabled={!paletteSystem || sortedDirections.length === 0}
                disabledReason={
                  !paletteSystem
                    ? "Generate the palette system first."
                    : "Design directions are being restored. Refresh this project before generating."
                }
                initialStatus={generationStatusSnapshot}
                projectId={projectId}
              />
            </div>
          </div>

          <div className="mt-8">
            <ReferenceAnalysisPanel
              errorMessage={referenceAnalysis?.error_message}
              projectId={projectId}
              sourceUrls={
                referenceAnalysis?.source_urls ?? brief?.reference_links ?? []
              }
              status={referenceAnalysis?.status}
              summary={referenceAnalysis?.summary}
            />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-50">
              Freeform feedback
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Use this after reviewing a generated package to create a new
              iteration.
            </p>
            <div className="mt-4">
              <FeedbackForm
                initialStatus={generationStatusSnapshot}
                projectId={projectId}
              />
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-50">
                  Generated assets
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Latest package files with signed previews for image assets.
                </p>
              </div>
              {packageFile ? (
                <Link
                  href={`/projects/${projectId}/download`}
                  className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                >
                  Download zip
                </Link>
              ) : null}
            </div>
            <div className="mt-4">
              <AssetGallery assets={galleryAssets} />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <GenerationCounter
            max={limit?.max_generations ?? 50}
            used={limit?.used_generations ?? 0}
          />

          <AssetPreview fileName={previewFileName} src={previewUrl} />

          {latestGeneration ? (
            <div className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5">
              <h2 className="text-sm font-semibold text-zinc-100">
                Latest generation
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="mt-1 text-zinc-200">
                    {latestGeneration.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Provider</dt>
                  <dd className="mt-1 text-zinc-200">
                    {latestGeneration.provider} / {latestGeneration.model}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Files</dt>
                  <dd className="mt-1 text-zinc-200">{assetFiles.length}</dd>
                </div>
              </dl>
              {packageFile ? (
                <Link
                  href={`/projects/${projectId}/download`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-zinc-950"
                >
                  Download package
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5">
            <h2 className="text-sm font-semibold text-zinc-100">Brief</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-zinc-500">App name</dt>
                <dd className="mt-1 text-zinc-200">
                  {brief?.app_name ?? "Not saved yet"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Audience</dt>
                <dd className="mt-1 leading-6 text-zinc-300">
                  {brief?.audience ?? "Not saved yet"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Mood</dt>
                <dd className="mt-1 leading-6 text-zinc-300">
                  {brief?.desired_mood ?? "Not saved yet"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-red-950 bg-red-950/10 p-5">
            <h2 className="text-sm font-semibold text-red-100">
              Delete project
            </h2>
            <p className="mt-3 text-sm leading-6 text-red-200/75">
              Removes this project, its generated records, and stored files.
            </p>
            <div className="mt-4">
              <DeleteProjectForm projectId={projectId} />
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

const directionTitleOrder = [
  "Clean Precision",
  "Atmospheric Depth",
  "Bold Utility",
];

function sortDirections(directions: DirectionSummary[]) {
  return [...directions].sort((a, b) => {
    const orderA = directionTitleOrder.indexOf(a.title);
    const orderB = directionTitleOrder.indexOf(b.title);
    const normalizedOrderA =
      orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
    const normalizedOrderB =
      orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;

    if (normalizedOrderA !== normalizedOrderB) {
      return normalizedOrderA - normalizedOrderB;
    }

    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}

const assetKindOrder = [
  "thumbnail",
  "master_background",
  "screen_plain_light",
  "screen_plain_dark",
  "palette_light",
  "palette_dark",
  "buttons_light",
  "buttons_dark",
  "icon_set_showcase",
  "icon_mark_light",
  "icon_mark_dark",
];

const deprecatedGalleryAssetKinds = new Set([
  "controls_showcase",
  "icon_set_light",
  "icon_set_dark",
  "screen_examples_light",
  "screen_examples_dark",
  "splash",
]);

function compareAssetFiles(a: AssetFileSummary, b: AssetFileSummary) {
  const orderA = assetKindOrder.indexOf(a.kind);
  const orderB = assetKindOrder.indexOf(b.kind);
  const normalizedOrderA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
  const normalizedOrderB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;

  if (normalizedOrderA !== normalizedOrderB) {
    return normalizedOrderA - normalizedOrderB;
  }

  return a.file_name.localeCompare(b.file_name);
}
