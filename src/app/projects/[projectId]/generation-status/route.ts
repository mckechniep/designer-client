import type { GenerationStatusLatest } from "@/lib/generation/status";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type GenerationStatusRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

interface ProjectRecord {
  id: string;
}

interface DirectionRecord {
  id: string;
}

interface GenerationRecord {
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
  id: string;
  model: string;
  provider: string;
  status: string;
}

export async function GET(
  _request: Request,
  { params }: GenerationStatusRouteContext,
) {
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle<ProjectRecord>();

  if (projectError) {
    return Response.json(
      { error: "Could not load project status." },
      { status: 500 },
    );
  }

  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: directions, error: directionsError } = await supabase
    .from("design_directions")
    .select("id")
    .eq("project_id", projectId)
    .returns<DirectionRecord[]>();

  if (directionsError) {
    return Response.json(
      { error: "Could not load design directions." },
      { status: 500 },
    );
  }

  if (!directions || directions.length === 0) {
    return Response.json({
      latest: null,
      polledAt: new Date().toISOString(),
    });
  }

  const { data: generations, error: generationError } = await supabase
    .from("asset_generations")
    .select("id, status, error_message, created_at, completed_at, provider, model")
    .in(
      "design_direction_id",
      directions.map((direction) => direction.id),
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<GenerationRecord[]>();

  if (generationError) {
    return Response.json(
      { error: "Could not load generation status." },
      { status: 500 },
    );
  }

  const generation = generations?.[0];

  if (!generation) {
    return Response.json({
      latest: null,
      polledAt: new Date().toISOString(),
    });
  }

  const { count, error: fileCountError } = await supabase
    .from("asset_files")
    .select("id", { count: "exact", head: true })
    .eq("generation_id", generation.id);

  if (fileCountError) {
    return Response.json(
      { error: "Could not load generated file count." },
      { status: 500 },
    );
  }

  const latest: GenerationStatusLatest = {
    completedAt: generation.completed_at,
    createdAt: generation.created_at,
    errorMessage: generation.error_message,
    fileCount: count ?? 0,
    id: generation.id,
    model: generation.model,
    provider: generation.provider,
    status: generation.status,
  };

  return Response.json({
    latest,
    polledAt: new Date().toISOString(),
  });
}
