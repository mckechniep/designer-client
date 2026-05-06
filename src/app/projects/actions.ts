"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { initialMaxGenerationsForEmail } from "@/lib/generation/limits";
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
});

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
  });

  if (!parsedInput.success) {
    redirect("/projects/new?error=invalid-brief");
  }

  const input = parsedInput.data;
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

  const { error: briefError } = await supabase.from("design_briefs").insert({
    project_id: project.id,
    app_name: input.appName,
    audience: input.audience,
    desired_mood: input.desiredMood,
    liked_colors: splitLines(input.likedColors),
    disliked_colors: splitLines(input.dislikedColors),
    font_preferences: input.fontPreferences,
    reference_links: splitLines(input.referenceLinks),
    visual_dislikes: input.visualDislikes,
    brand_notes: input.brandNotes,
  });

  if (briefError) {
    redirect(`/projects/${project.id}?error=create-brief-failed`);
  }

  const serviceSupabase = createServiceSupabaseClient();
  const { error: directionsError } = await serviceSupabase
    .from("design_directions")
    .insert([
      {
        project_id: project.id,
        title: "Clean Precision",
        summary: `A restrained mobile visual system for ${input.appName}, focused on clarity, safe crop zones, and premium spacing.`,
        theme_notes: {
          tone: "minimal, polished, calm",
          assetUse: ["auth backgrounds", "onboarding", "headers"],
        },
        is_selected: true,
      },
      {
        project_id: project.id,
        title: "Atmospheric Depth",
        summary: `A richer visual direction for ${input.appName}, using depth, glow, and layered composition while preserving overlay readability.`,
        theme_notes: {
          tone: "immersive, premium, dimensional",
          assetUse: ["splash", "onboarding", "hero crops"],
        },
        is_selected: false,
      },
      {
        project_id: project.id,
        title: "Bold Utility",
        summary: `A stronger product-facing direction for ${input.appName}, with confident contrast, punchier accents, and implementation-friendly button states.`,
        theme_notes: {
          tone: "confident, practical, high-contrast",
          assetUse: ["home headers", "empty states", "button systems"],
        },
        is_selected: false,
      },
    ]);

  if (directionsError) {
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
