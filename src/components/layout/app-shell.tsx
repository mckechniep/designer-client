import Link from "next/link";
import type { ReactNode } from "react";
import type { RequiredUser } from "@/lib/auth/require-user";

interface AppShellProps {
  user: RequiredUser;
  children: ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const isAdmin = user.profile.role === "admin";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/95">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-4 sm:min-h-16 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <Link
            href="/projects"
            className="text-sm font-semibold text-zinc-50 transition hover:text-white"
          >
            Master Asset Studio
          </Link>

          <nav
            className="flex flex-wrap items-center gap-1 text-sm text-zinc-300"
            aria-label="Primary navigation"
          >
            <Link
              href="/projects"
              className="rounded-md px-3 py-2 transition hover:bg-zinc-900 hover:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              Projects
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-md px-3 py-2 transition hover:bg-zinc-900 hover:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                Admin
              </Link>
            ) : null}
            <form action="/logout" method="post">
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
