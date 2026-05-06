import { BriefForm } from "@/components/briefs/brief-form";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/require-user";

type NewProjectSearchParams = Promise<{
  error?: string | string[] | undefined;
}>;

const errorMessages: Record<string, string> = {
  "create-generation-limit-failed":
    "The project was created, but we could not set the generation limit.",
  "create-project-failed": "We could not create the project. Try again.",
  "invalid-brief": "Complete the required brief fields before creating a project.",
  "missing-client-profile": "Your account is missing a client profile.",
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewProjectPage(props: {
  searchParams: NewProjectSearchParams;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const error = getParam(searchParams.error);
  const message = error ? errorMessages[error] : undefined;

  return (
    <AppShell user={user}>
      <div className="max-w-3xl">
        <div>
          <p className="text-sm font-medium text-zinc-500">Projects</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-50">
            New mobile asset project
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Capture the visual brief needed to create static master assets,
            default design directions, and generation limits for this client.
          </p>
        </div>

        {message ? (
          <div
            className="mt-6 rounded-md border border-red-800/80 bg-red-950/50 px-4 py-3 text-sm text-red-100"
            role="alert"
          >
            {message}
          </div>
        ) : null}

        <div className="mt-8">
          <BriefForm />
        </div>
      </div>
    </AppShell>
  );
}
