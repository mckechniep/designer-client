import { deleteProject } from "@/app/projects/actions";

export function DeleteProjectForm({ projectId }: { projectId: string }) {
  return (
    <details className="group/delete">
      <summary
        className="flex w-full cursor-pointer list-none items-center justify-center rounded-md border border-red-900/80 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:border-red-700 hover:bg-red-950/40 focus:outline-none focus:ring-2 focus:ring-red-800 group-open/delete:border-red-700 group-open/delete:bg-red-950/40"
        role="button"
        tabIndex={0}
      >
        Delete project
      </summary>
      <div className="rounded-md border border-red-900/80 bg-red-950/25 p-3">
        <p className="text-sm leading-6 text-red-100">
          Delete this project and its generated files?
        </p>
        <div className="mt-3">
          <form action={deleteProject.bind(null, projectId)}>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-red-200 px-3 py-2 text-sm font-semibold text-red-950 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Are you sure?
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}
