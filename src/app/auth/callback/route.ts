import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { ensurePortalProfile } from "@/lib/auth/ensure-portal-profile";
import { env } from "@/lib/env";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const cookiesToSet: CookieToSet[] = [];
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(values) {
            cookiesToSet.push(...values);
          },
        },
      },
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const profileReady = data.user
        ? await ensurePortalProfile(data.user)
        : false;
      const response = NextResponse.redirect(
        new URL(
          profileReady ? next : "/login?error=missing-profile",
          env.NEXT_PUBLIC_SITE_URL,
        ),
      );

      cookiesToSet.forEach(({ name, options, value }) => {
        response.cookies.set(name, value, options);
      });

      return response;
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth-callback-failed", env.NEXT_PUBLIC_SITE_URL),
  );
}
