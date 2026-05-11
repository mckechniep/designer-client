import { createServiceSupabaseClient } from "@/lib/supabase/server";

export interface DesignDirectionRecord {
  id: string;
  is_selected: boolean;
  project_id: string;
  summary: string;
  title: string;
}

interface ExistingDirectionRecord {
  id: string;
  is_selected: boolean;
}

export function defaultDesignDirectionRows({
  appName,
  projectId,
}: {
  appName: string;
  projectId: string;
}) {
  return [
    {
      project_id: projectId,
      title: "Clean Precision",
      summary: `A restrained mobile visual system for ${appName}, focused on clarity, safe crop zones, and premium spacing.`,
      theme_notes: {
        tone: "minimal, polished, calm",
        assetUse: ["auth backgrounds", "onboarding", "headers"],
      },
      is_selected: true,
    },
    {
      project_id: projectId,
      title: "Atmospheric Depth",
      summary: `A richer visual direction for ${appName}, using depth, glow, and layered composition while preserving overlay readability.`,
      theme_notes: {
        tone: "immersive, premium, dimensional",
        assetUse: ["source backgrounds", "onboarding", "hero crops"],
      },
      is_selected: false,
    },
    {
      project_id: projectId,
      title: "Bold Utility",
      summary: `A stronger product-facing direction for ${appName}, with confident contrast, punchier accents, and implementation-friendly visual surfaces.`,
      theme_notes: {
        tone: "confident, practical, high-contrast",
        assetUse: ["home headers", "empty states", "visual surfaces"],
      },
      is_selected: false,
    },
  ];
}

export async function ensureDefaultDesignDirections({
  appName,
  projectId,
}: {
  appName: string;
  projectId: string;
}) {
  const serviceSupabase = createServiceSupabaseClient();
  const { data: existingDirections, error: existingError } =
    await serviceSupabase
      .from("design_directions")
      .select("id, is_selected")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .returns<ExistingDirectionRecord[]>();

  if (existingError) {
    throw existingError;
  }

  if (existingDirections && existingDirections.length > 0) {
    const hasSelectedDirection = existingDirections.some(
      (direction) => direction.is_selected,
    );

    if (!hasSelectedDirection) {
      const firstDirection = existingDirections[0];

      if (firstDirection) {
        const { error: selectError } = await serviceSupabase
          .from("design_directions")
          .update({ is_selected: true })
          .eq("id", firstDirection.id);

        if (selectError) {
          throw selectError;
        }
      }
    }

    return false;
  }

  const { error: insertError } = await serviceSupabase
    .from("design_directions")
    .insert(defaultDesignDirectionRows({ appName, projectId }));

  if (insertError) {
    throw insertError;
  }

  return true;
}

export async function getSelectedDesignDirection(projectId: string) {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("design_directions")
    .select("id, project_id, title, summary, is_selected")
    .eq("project_id", projectId)
    .eq("is_selected", true)
    .maybeSingle<DesignDirectionRecord>();

  if (error) {
    throw error;
  }

  return data ?? null;
}
