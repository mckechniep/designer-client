import { signInWithEmail } from "@/app/login/actions";

type LoginSearchParams = Promise<{
  error?: string | string[];
  sent?: string | string[];
}>;

const errorMessages: Record<string, string> = {
  "auth-callback-failed": "We could not finish signing you in. Request a new link.",
  "email-required": "Enter an email address to continue.",
  "missing-profile": "Your account is missing a portal profile.",
  "signin-failed": "We could not send a sign-in link. Try again.",
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage(props: {
  searchParams: LoginSearchParams;
}) {
  const searchParams = await props.searchParams;
  const sent = getParam(searchParams.sent) === "1";
  const error = getParam(searchParams.error);
  const message = error ? errorMessages[error] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/30">
        <div className="mb-8">
          <p className="text-sm font-medium text-zinc-400">Master Asset Studio</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-50">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Enter your email address and we will send a secure sign-in link.
          </p>
        </div>

        {sent ? (
          <div
            className="mb-5 rounded-md border border-emerald-800/80 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-100"
            role="status"
          >
            Check your email for a sign-in link.
          </div>
        ) : null}

        {message ? (
          <div
            className="mb-5 rounded-md border border-red-800/80 bg-red-950/50 px-4 py-3 text-sm text-red-100"
            role="alert"
          >
            {message}
          </div>
        ) : null}

        <form action={signInWithEmail} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-200"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/30"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Send sign-in link
          </button>
        </form>
      </section>
    </main>
  );
}
