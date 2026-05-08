import { redirect } from "next/navigation";
import { ensurePortalProfile } from "@/lib/auth/ensure-portal-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/supabase/types";

export interface RequiredUser {
  id: string;
  email: string;
  profile: UserProfile;
}

export async function requireUser(): Promise<RequiredUser> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  let { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, client_profile_id, role, email, created_at")
    .eq("id", user.id)
    .single<UserProfile>();

  if (error || !profile) {
    const profileReady = await ensurePortalProfile(user);

    if (profileReady) {
      const profileResult = await supabase
        .from("user_profiles")
        .select("id, client_profile_id, role, email, created_at")
        .eq("id", user.id)
        .single<UserProfile>();

      profile = profileResult.data;
      error = profileResult.error;
    }
  }

  if (error || !profile) {
    redirect("/login?error=missing-profile");
  }

  return {
    id: user.id,
    email: user.email,
    profile,
  };
}
