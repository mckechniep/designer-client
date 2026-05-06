import { redirect } from "next/navigation";
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

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, client_profile_id, role, email, created_at")
    .eq("id", user.id)
    .single<UserProfile>();

  if (error || !profile) {
    redirect("/login?error=missing-profile");
  }

  return {
    id: user.id,
    email: user.email,
    profile,
  };
}
