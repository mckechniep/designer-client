import { createProject } from "@/app/projects/actions";

const fieldClassName =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/30";

const labelClassName = "block text-sm font-medium text-zinc-200";
const helpClassName = "mt-1 text-xs leading-5 text-zinc-500";

export function BriefForm() {
  return (
    <form
      action={createProject}
      className="grid gap-6 rounded-md border border-zinc-800 bg-zinc-900/45 p-4 sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Project name" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            minLength={2}
            className={fieldClassName}
            placeholder="Spring launch assets"
          />
        </Field>

        <Field label="App category" htmlFor="appCategory">
          <input
            id="appCategory"
            name="appCategory"
            required
            minLength={2}
            className={fieldClassName}
            placeholder="Fitness, finance, education"
          />
        </Field>

        <Field label="App name" htmlFor="appName">
          <input
            id="appName"
            name="appName"
            required
            minLength={2}
            className={fieldClassName}
            placeholder="Product name"
          />
        </Field>

        <Field label="Font preferences" htmlFor="fontPreferences">
          <textarea
            id="fontPreferences"
            name="fontPreferences"
            className={`${fieldClassName} min-h-24 resize-y`}
            placeholder="Modern sans serif, editorial serif, system UI"
          />
        </Field>
      </div>

      <Field label="Audience" htmlFor="audience">
        <textarea
          id="audience"
          name="audience"
          required
          minLength={2}
          className={`${fieldClassName} min-h-28 resize-y`}
          placeholder="Who the app serves, what they care about, and where they will see these assets."
        />
      </Field>

      <Field label="Desired mood" htmlFor="desiredMood">
        <textarea
          id="desiredMood"
          name="desiredMood"
          required
          minLength={2}
          className={`${fieldClassName} min-h-28 resize-y`}
          placeholder="Premium, calm, technical, energetic, warm, clinical"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Liked colors" htmlFor="likedColors">
          <textarea
            id="likedColors"
            name="likedColors"
            className={`${fieldClassName} min-h-24 resize-y`}
            placeholder="Black, electric blue, cool gray"
          />
          <p className={helpClassName}>Separate colors with commas or lines.</p>
        </Field>

        <Field label="Disliked colors" htmlFor="dislikedColors">
          <textarea
            id="dislikedColors"
            name="dislikedColors"
            className={`${fieldClassName} min-h-24 resize-y`}
            placeholder="Orange, beige, neon green"
          />
          <p className={helpClassName}>Separate colors with commas or lines.</p>
        </Field>
      </div>

      <Field label="Reference links" htmlFor="referenceLinks">
        <textarea
          id="referenceLinks"
          name="referenceLinks"
          className={`${fieldClassName} min-h-24 resize-y`}
          placeholder="https://example.com/reference"
        />
        <p className={helpClassName}>Separate links with commas or lines.</p>
      </Field>

      <Field label="Visual dislikes" htmlFor="visualDislikes">
        <textarea
          id="visualDislikes"
          name="visualDislikes"
          className={`${fieldClassName} min-h-24 resize-y`}
          placeholder="Avoid cluttered dashboards, cartoon styling, low contrast, or stock-photo compositions."
        />
      </Field>

      <Field label="Brand personality notes" htmlFor="brandNotes">
        <textarea
          id="brandNotes"
          name="brandNotes"
          className={`${fieldClassName} min-h-28 resize-y`}
          placeholder="Voice, product positioning, brand traits, and any constraints the visual system must respect."
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="submit"
          className="rounded-md bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          Create project
        </button>
      </div>
    </form>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClassName}>
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
