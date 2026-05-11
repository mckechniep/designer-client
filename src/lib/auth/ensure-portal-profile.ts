import type { User } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { initialMaxGenerationsForEmail } from "@/lib/generation/limits";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

interface UserProfileLookup {
  id: string;
  client_profile_id: string | null;
}

interface ClientProfileLookup {
  id: string;
}

export async function ensurePortalProfile(user: User) {
  if (!user.email) {
    return false;
  }

  const serviceSupabase = createServiceSupabaseClient();
  const { data: existingProfile, error: existingProfileError } =
    await serviceSupabase
      .from("user_profiles")
      .select("id, client_profile_id")
      .eq("id", user.id)
      .maybeSingle<UserProfileLookup>();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (existingProfile?.client_profile_id) {
    await ensureGenerationLimit(existingProfile.client_profile_id, user.email);
    return true;
  }

  if (!shouldAutoProvisionClients(env.AUTH_AUTO_PROVISION_CLIENTS)) {
    return false;
  }

  const clientProfileId =
    existingProfile?.client_profile_id ??
    (await createClientProfile(defaultClientNameForEmail(user.email)));

  if (existingProfile) {
    const { error: updateProfileError } = await serviceSupabase
      .from("user_profiles")
      .update({
        client_profile_id: clientProfileId,
        email: user.email,
      })
      .eq("id", user.id);

    if (updateProfileError) {
      throw updateProfileError;
    }
  } else {
    const { error: insertProfileError } = await serviceSupabase
      .from("user_profiles")
      .insert({
        id: user.id,
        client_profile_id: clientProfileId,
        role: "client",
        email: user.email,
      });

    if (insertProfileError) {
      throw insertProfileError;
    }
  }

  await ensureGenerationLimit(clientProfileId, user.email);
  return true;
}

export function shouldAutoProvisionClients(value: string) {
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function defaultClientNameForEmail(email: string) {
  return email.split("@")[0]?.trim() || "Client";
}

async function createClientProfile(name: string) {
  const serviceSupabase = createServiceSupabaseClient();
  const { data: clientProfile, error: clientProfileError } =
    await serviceSupabase
      .from("client_profiles")
      .insert({ name })
      .select("id")
      .single<ClientProfileLookup>();

  if (clientProfileError || !clientProfile) {
    throw clientProfileError ?? new Error("Client profile was not created");
  }

  return clientProfile.id;
}

async function ensureGenerationLimit(clientProfileId: string, email: string) {
  const serviceSupabase = createServiceSupabaseClient();
  const { error: limitError } = await serviceSupabase
    .from("generation_limits")
    .upsert(
      {
        client_profile_id: clientProfileId,
        max_generations: initialMaxGenerationsForEmail(email),
        used_generations: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_profile_id", ignoreDuplicates: true },
    );

  if (limitError) {
    throw limitError;
  }
}
