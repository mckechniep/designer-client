import { env } from "@/lib/env";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase/server";

type DownloadParams = Promise<{
  projectId: string;
}>;

interface DirectionId {
  id: string;
}

interface GenerationId {
  id: string;
}

interface PackageFile {
  storage_path: string;
  file_name: string;
  mime_type: string;
}

export async function GET(
  _request: Request,
  { params }: { params: DownloadParams },
) {
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single<{ id: string }>();

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const { data: directions } = await supabase
    .from("design_directions")
    .select("id")
    .eq("project_id", projectId)
    .returns<DirectionId[]>();

  if (!directions || directions.length === 0) {
    return new Response("No design directions found", { status: 404 });
  }

  const { data: generations } = await supabase
    .from("asset_generations")
    .select("id")
    .in(
      "design_direction_id",
      directions.map((direction) => direction.id),
    )
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<GenerationId[]>();
  const generation = generations?.[0];

  if (!generation) {
    return new Response("No downloadable generation found", { status: 404 });
  }

  const { data: packageFile } = await supabase
    .from("asset_files")
    .select("storage_path, file_name, mime_type")
    .eq("generation_id", generation.id)
    .eq("kind", "download_package")
    .single<PackageFile>();

  if (!packageFile) {
    return new Response("Download package not found", { status: 404 });
  }

  const serviceSupabase = createServiceSupabaseClient();
  const { data: packageBlob, error: downloadError } =
    await serviceSupabase.storage
      .from(env.ASSET_BUCKET)
      .download(packageFile.storage_path);

  if (downloadError || !packageBlob) {
    return new Response("Stored package not found", { status: 404 });
  }

  await serviceSupabase.from("download_events").insert({
    generation_id: generation.id,
    user_id: user.id,
  });

  return new Response(await packageBlob.arrayBuffer(), {
    headers: {
      "Content-Disposition": `attachment; filename="${safeFileName(
        packageFile.file_name,
      )}"`,
      "Content-Type": packageFile.mime_type,
    },
  });
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}
