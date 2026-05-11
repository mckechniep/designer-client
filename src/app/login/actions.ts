"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email");
  const trimmedEmail = typeof email === "string" ? email.trim() : "";

  if (!trimmedEmail) {
    redirect("/login?error=email-required");
  }

  const supabase = await createServerSupabaseClient();
  const callbackUrl = new URL("/auth/callback", env.NEXT_PUBLIC_SITE_URL);
  callbackUrl.searchParams.set("next", "/projects");

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    redirect("/login?error=signin-failed");
  }

  redirect("/login?sent=1");
}
