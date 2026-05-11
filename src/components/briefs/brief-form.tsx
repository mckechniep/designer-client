"use client";

import {
  useActionState,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import {
  createProject,
  previewProjectPalette,
  previewProjectReferenceAnalysis,
} from "@/app/projects/actions";
import {
  normalizePaletteEffectPreference,
  paletteInputSignature,
} from "@/lib/palette/input";
import type { PalettePreviewState } from "@/lib/palette/preview-state";
import type { PaletteModeSpec, PaletteSystem } from "@/lib/palette/spec";
import type { ReferencePreviewState } from "@/lib/reference-analysis/preview-state";

const fieldClassName =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/30";

const labelClassName = "block text-sm font-medium text-zinc-200";
const helpClassName = "mt-1 text-xs leading-5 text-zinc-500";
const checkboxClassName =
  "h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-zinc-500";
const colorClassName =
  "h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 p-1 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/30";

const initialReferencePreviewState: ReferencePreviewState = {
  sourceUrls: [],
  status: "idle",
};

const initialPalettePreviewState: PalettePreviewState = {
  status: "idle",
};

interface BriefFormState {
  accentColor: string;
  appCategory: string;
  appName: string;
  audience: string;
  brandNotes: string;
  desiredMood: string;
  dislikedColors: string;
  likedColors: string;
  name: string;
  primaryColor: string;
  referenceLinks: string;
  useAccentColor: boolean;
  usePrimaryColor: boolean;
  visualDislikes: string;
  effectPreference: string;
}

type TextFieldName = Exclude<
  keyof BriefFormState,
  "useAccentColor" | "usePrimaryColor"
>;

type FormStep = "palette" | "brief";
type TextInputElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

const initialBriefFormState: BriefFormState = {
  accentColor: "#f97316",
  appCategory: "",
  appName: "",
  audience: "",
  brandNotes: "",
  desiredMood: "",
  dislikedColors: "",
  likedColors: "",
  name: "",
  primaryColor: "#0ea5e9",
  referenceLinks: "",
  useAccentColor: false,
  usePrimaryColor: false,
  visualDislikes: "",
  effectPreference: "auto",
};

export function BriefForm() {
  const [form, setForm] = useState<BriefFormState>(initialBriefFormState);
  const [step, setStep] = useState<FormStep>("palette");
  const [palettePreview, generatePaletteAction, isGeneratingPalette] =
    useActionState(previewProjectPalette, initialPalettePreviewState);
  const [referencePreview, analyzeReferencesAction, isAnalyzingReferences] =
    useActionState(
      previewProjectReferenceAnalysis,
      initialReferencePreviewState,
    );
  const [, startPaletteTransition] = useTransition();
  const [, startReferenceTransition] = useTransition();
  const referenceLinks = splitEntryList(form.referenceLinks);
  const currentPaletteSignature = paletteInputSignature({
    appCategory: form.appCategory,
    appName: form.appName,
    audience: form.audience,
    desiredMood: form.desiredMood,
    dislikedColors: splitEntryList(form.dislikedColors),
    effectPreference: normalizePaletteEffectPreference(form.effectPreference),
    likedColors: likedColorsForPalette(form),
  });
  const generatedPalette =
    palettePreview.status === "generated" &&
    palettePreview.inputSignature === currentPaletteSignature
      ? palettePreview.palette
      : null;
  const hasStalePalette =
    palettePreview.status === "generated" && !generatedPalette;
  const canGeneratePalette =
    form.appName.trim().length >= 2 &&
    form.appCategory.trim().length >= 2 &&
    form.audience.trim().length >= 2 &&
    form.desiredMood.trim().length >= 2;

  function updateTextField(field: TextFieldName) {
    return (event: ChangeEvent<TextInputElement>) => {
      const value = event.target.value;

      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };
  }

  function updateCheckbox(field: "useAccentColor" | "usePrimaryColor") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.checked,
      }));
    };
  }

  function generatePalettePreview() {
    startPaletteTransition(() => {
      generatePaletteAction(formDataFromState(form));
    });
  }

  function analyzeReferencePreview() {
    startReferenceTransition(() => {
      analyzeReferencesAction(formDataFromState(form));
    });
  }

  function removeReferenceLink(indexToRemove: number) {
    setForm((current) => ({
      ...current,
      referenceLinks: splitEntryList(current.referenceLinks)
        .filter((_, index) => index !== indexToRemove)
        .join("\n"),
    }));
  }

  return (
    <form
      action={createProject}
      className="grid gap-6 rounded-md border border-zinc-800 bg-zinc-900/45 p-4 sm:p-6"
    >
      <StepHeader step={step} />
      <input
        type="hidden"
        name="approvedPaletteJson"
        value={generatedPalette ? JSON.stringify(generatedPalette) : ""}
      />
      <input
        type="hidden"
        name="approvedPaletteSignature"
        value={generatedPalette ? currentPaletteSignature : ""}
      />

      <div hidden={step !== "palette"}>
        <section className="grid gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Project name" htmlFor="name" required>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                className={fieldClassName}
                value={form.name}
                onChange={updateTextField("name")}
                placeholder="Spring launch assets"
              />
            </Field>

            <Field label="App name" htmlFor="appName" required>
              <input
                id="appName"
                name="appName"
                required
                minLength={2}
                className={fieldClassName}
                value={form.appName}
                onChange={updateTextField("appName")}
                placeholder="Product name"
              />
            </Field>
          </div>

          <Field label="App category" htmlFor="appCategory" required>
            <input
              id="appCategory"
              name="appCategory"
              required
              minLength={2}
              className={fieldClassName}
              value={form.appCategory}
              onChange={updateTextField("appCategory")}
              placeholder="Fitness, finance, education"
            />
          </Field>

          <Field label="Audience" htmlFor="audience" required>
            <textarea
              id="audience"
              name="audience"
              required
              minLength={2}
              className={`${fieldClassName} min-h-28 resize-y`}
              value={form.audience}
              onChange={updateTextField("audience")}
              placeholder="Who the app serves, what they care about, and where they will see these assets."
            />
          </Field>

          <Field label="Desired mood" htmlFor="desiredMood" required>
            <textarea
              id="desiredMood"
              name="desiredMood"
              required
              minLength={2}
              className={`${fieldClassName} min-h-28 resize-y`}
              value={form.desiredMood}
              onChange={updateTextField("desiredMood")}
              placeholder="Premium, calm, technical, energetic, warm, clinical, neon, soft glow"
            />
          </Field>

          <Field label="Liked colors" htmlFor="likedColors">
            <textarea
              id="likedColors"
              name="likedColors"
              className={`${fieldClassName} min-h-24 resize-y`}
              value={form.likedColors}
              onChange={updateTextField("likedColors")}
              placeholder="Black, electric blue, cool gray"
            />
            <p className={helpClassName}>
              Use this for broad color taste and palette mood. The AI uses
              these as guidance when generating the token palette and image
              direction, but exact anchors below carry more weight. Leave this
              blank if you want the AI to choose colors from the app category,
              audience, and mood.
            </p>
          </Field>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Exact color anchors
              </p>
              <p className={helpClassName}>
                Checked anchors act as strong AI constraints. They pin the
                approved primary and accent tokens first, then generated images
                follow that approved palette as the color contract.
              </p>
            </div>

            <div className="grid gap-5 rounded-md border border-zinc-800 bg-zinc-950/40 p-4 sm:grid-cols-2">
              <Field label="Exact primary color" htmlFor="primaryColor">
                <div className="grid grid-cols-[64px_1fr] gap-3">
                  <input
                    id="primaryColor"
                    name="primaryColor"
                    type="color"
                    className={colorClassName}
                    value={form.primaryColor}
                    onChange={updateTextField("primaryColor")}
                  />
                  <label className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="usePrimaryColor"
                      value="1"
                      className={checkboxClassName}
                      checked={form.usePrimaryColor}
                      onChange={updateCheckbox("usePrimaryColor")}
                    />
                    Use this primary
                  </label>
                </div>
              </Field>

              <Field label="Exact accent color" htmlFor="accentColor">
                <div className="grid grid-cols-[64px_1fr] gap-3">
                  <input
                    id="accentColor"
                    name="accentColor"
                    type="color"
                    className={colorClassName}
                    value={form.accentColor}
                    onChange={updateTextField("accentColor")}
                  />
                  <label className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="useAccentColor"
                      value="1"
                      className={checkboxClassName}
                      checked={form.useAccentColor}
                      onChange={updateCheckbox("useAccentColor")}
                    />
                    Use this accent
                  </label>
                </div>
              </Field>
            </div>
          </div>

          <Field label="Visual effects" htmlFor="effectPreference">
            <select
              id="effectPreference"
              name="effectPreference"
              className={fieldClassName}
              value={form.effectPreference}
              onChange={updateTextField("effectPreference")}
            >
              <option value="auto">
                Auto - decide from app, audience, and mood
              </option>
              <option value="none">None - functional UI colors only</option>
              <option value="subtle">
                Subtle - gentle depth, gradients, or bloom
              </option>
              <option value="expressive">
                Expressive - glow, neon, aura, or cinematic light allowed
              </option>
            </select>
            <p className={helpClassName}>
              Effect tokens are only for generated backgrounds, source plates,
              hero images, and atmosphere.
            </p>
          </Field>

          <Field label="Disliked colors" htmlFor="dislikedColors">
            <textarea
              id="dislikedColors"
              name="dislikedColors"
              className={`${fieldClassName} min-h-24 resize-y`}
              value={form.dislikedColors}
              onChange={updateTextField("dislikedColors")}
              placeholder="Orange, beige, neon green"
            />
            <p className={helpClassName}>
              Avoid these as brand, dominant, decorative, or atmosphere colors.
              Semantic status tokens may still use subdued red, yellow, green,
              or blue when the interface needs danger, warning, success, or
              info states.
            </p>
          </Field>

          <PaletteGenerationControls
            canGeneratePalette={canGeneratePalette}
            errorMessage={palettePreview.errorMessage}
            hasGeneratedPalette={Boolean(generatedPalette)}
            hasStalePalette={hasStalePalette}
            isGeneratingPalette={isGeneratingPalette}
            onContinue={() => setStep("brief")}
            onGenerate={generatePalettePreview}
          />

          <PaletteUsageExamples />

          {generatedPalette ? (
            <PalettePreview palette={generatedPalette} />
          ) : (
            <PalettePendingState hasStalePalette={hasStalePalette} />
          )}
        </section>
      </div>

      <div hidden={step !== "brief"}>
        <section className="grid gap-6">
          <Field label="Reference links" htmlFor="referenceLinks">
            <textarea
              id="referenceLinks"
              name="referenceLinks"
              className={`${fieldClassName} min-h-24 resize-y`}
              value={form.referenceLinks}
              onChange={updateTextField("referenceLinks")}
              placeholder="https://example.com/reference"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className={helpClassName}>
                Separate links with commas or lines. Use full URLs with
                https://.
              </p>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-3.5 py-2 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isAnalyzingReferences}
                onClick={analyzeReferencePreview}
              >
                {isAnalyzingReferences ? "Analyzing..." : "Analyze references"}
              </button>
            </div>
            <ReferenceLinkList
              links={referenceLinks}
              onRemove={removeReferenceLink}
            />
            <ReferencePreviewPanel state={referencePreview} />
          </Field>

          <Field label="Visual dislikes" htmlFor="visualDislikes">
            <textarea
              id="visualDislikes"
              name="visualDislikes"
              className={`${fieldClassName} min-h-24 resize-y`}
              value={form.visualDislikes}
              onChange={updateTextField("visualDislikes")}
              placeholder="Avoid cluttered dashboards, cartoon styling, low contrast, or stock-photo compositions."
            />
          </Field>

          <Field label="Brand personality notes" htmlFor="brandNotes">
            <textarea
              id="brandNotes"
              name="brandNotes"
              className={`${fieldClassName} min-h-28 resize-y`}
              value={form.brandNotes}
              onChange={updateTextField("brandNotes")}
              placeholder="Voice, product positioning, brand traits, and any constraints the visual system must respect."
            />
          </Field>

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              onClick={() => setStep("palette")}
            >
              Back to palette
            </button>
            <button
              type="submit"
              className="rounded-md bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              Create project
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}

function StepHeader({ step }: { step: FormStep }) {
  return (
    <div className="grid gap-3 border-b border-zinc-800 pb-5 lg:grid-cols-2">
      <div
        className={`rounded-md border p-4 ${
          step === "palette"
            ? "border-zinc-500 bg-zinc-950"
            : "border-zinc-800 bg-zinc-950/40"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Step 1
        </p>
        <h2 className="mt-1 text-base font-semibold text-zinc-50">
          Establish palette
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Lock the light and dark color system before anything else gets
          generated.
        </p>
      </div>
      <div
        className={`rounded-md border p-4 ${
          step === "brief"
            ? "border-zinc-500 bg-zinc-950"
            : "border-zinc-800 bg-zinc-950/40"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Step 2
        </p>
        <h2 className="mt-1 text-base font-semibold text-zinc-50">
          Background brief
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Add references and constraints for the generated source backgrounds.
        </p>
      </div>
    </div>
  );
}

function PalettePreview({ palette }: { palette: PaletteSystem }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/50 p-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">
          Generated palette
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This exact token set will be saved with the project and used as the
          color contract for generated assets.
        </p>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <PaletteModePreview label="Light" mode={palette.light} />
        <PaletteModePreview label="Dark" mode={palette.dark} />
      </div>
    </section>
  );
}

function PaletteGenerationControls({
  canGeneratePalette,
  errorMessage,
  hasGeneratedPalette,
  hasStalePalette,
  isGeneratingPalette,
  onContinue,
  onGenerate,
}: {
  canGeneratePalette: boolean;
  errorMessage?: string;
  hasGeneratedPalette: boolean;
  hasStalePalette: boolean;
  isGeneratingPalette: boolean;
  onContinue: () => void;
  onGenerate: () => void;
}) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">
            Generate palette
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Generate the light and dark token set from the selected colors,
            then approve it before moving on to the rest of the brief.
          </p>
          {!canGeneratePalette ? (
            <p className="mt-2 text-xs leading-5 text-amber-200">
              Add app name, app category, audience, and desired mood first.
            </p>
          ) : null}
          {hasStalePalette ? (
            <p className="mt-2 text-xs leading-5 text-amber-200">
              Palette inputs changed. Regenerate before continuing.
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-2 text-xs leading-5 text-red-200">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canGeneratePalette || isGeneratingPalette}
            onClick={onGenerate}
          >
            {isGeneratingPalette
              ? "Generating..."
              : hasGeneratedPalette
                ? "Regenerate palette"
                : "Generate palette"}
          </button>
          {hasGeneratedPalette ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              onClick={onContinue}
            >
              Continue to step 2
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PalettePendingState({
  hasStalePalette,
}: {
  hasStalePalette: boolean;
}) {
  return (
    <section className="rounded-md border border-dashed border-zinc-800 bg-zinc-950/30 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">
        {hasStalePalette ? "Palette needs regeneration" : "No palette generated yet"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {hasStalePalette
          ? "The palette inputs changed after the last generation. Regenerate to approve the new token set."
          : "Choose colors, generate the palette, then review the light and dark token sheets before continuing."}
      </p>
    </section>
  );
}

function PaletteUsageExamples() {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">
          Mobile usage examples
        </h3>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          This is the reference explainer image used to show clients how the
          palette tokens map into real mobile UI elements.
        </p>
      </div>
      <div className="mt-4 grid gap-3">
        <TokenExplainerAccordion
          alt="Mobile app base, text, and border token usage explainer"
          src="/mobile-app-explained-1.png"
          title="Screen 1 - Base, Text & Borders"
        />
        <TokenExplainerAccordion
          alt="Mobile app primary and semantic status token usage explainer"
          src="/mobile-token-screen-2-centered.png"
          title="Screen 2 - Primary & Semantic / Status"
        />
      </div>
    </div>
  );
}

function TokenExplainerAccordion({
  alt,
  src,
  title,
}: {
  alt: string;
  src: string;
  title: string;
}) {
  return (
    <details className="group rounded-md border border-zinc-800 bg-zinc-100">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-zinc-950 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded border border-zinc-300 bg-white text-lg leading-none text-zinc-700">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:block">-</span>
        </span>
      </summary>
      <div className="border-t border-zinc-200 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={alt}
          className="mx-auto h-auto max-w-full rounded"
          height={1024}
          src={src}
          width={810}
        />
      </div>
    </details>
  );
}

function PaletteModePreview({
  label,
  mode,
}: {
  label: "Dark" | "Light";
  mode: PaletteModeSpec;
}) {
  const primary = findPaletteToken(mode, "primary") ?? mode.background;

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/80 p-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">{label}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Primary {primary}
        </p>
      </div>
      <div className="mt-4 space-y-4">
        {mode.groups.map((group) => (
          <div key={group.name}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {group.name}
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {group.tokens.map((token) => (
                <div
                  key={token.name}
                  className="rounded-md border border-zinc-800 bg-zinc-950 p-2"
                >
                  <div
                    className="h-9 rounded border border-zinc-700"
                    style={{ background: token.value }}
                  />
                  <p className="mt-2 truncate text-xs font-semibold text-zinc-200">
                    --{token.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {token.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferenceLinkList({
  links,
  onRemove,
}: {
  links: string[];
  onRemove: (index: number) => void;
}) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link, index) => (
        <span
          key={`${link}-${index}`}
          className="inline-flex max-w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300"
        >
          <span className="max-w-72 truncate">{link}</span>
          <button
            type="button"
            className="rounded border border-zinc-700 px-1.5 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            onClick={() => onRemove(index)}
          >
            Remove
          </button>
        </span>
      ))}
    </div>
  );
}

function ReferencePreviewPanel({ state }: { state: ReferencePreviewState }) {
  if (state.status === "idle") {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-100">
          Reference analysis preview
        </p>
        <p className="text-xs uppercase tracking-wide text-zinc-600">
          {state.status}
        </p>
      </div>

      {state.sourceUrls.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs leading-5 text-zinc-500">
          {state.sourceUrls.map((url) => (
            <li key={url} className="truncate">
              {url}
            </li>
          ))}
        </ul>
      ) : null}

      {state.summary ? (
        <pre className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
          {state.summary}
        </pre>
      ) : null}

      {state.errorMessage ? (
        <p className="mt-3 text-sm leading-6 text-red-200">
          {state.errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function likedColorsForPalette(form: BriefFormState) {
  return [
    ...splitEntryList(form.likedColors),
    form.usePrimaryColor ? `Primary anchor ${form.primaryColor}` : "",
    form.useAccentColor ? `Accent anchor ${form.accentColor}` : "",
  ].filter(Boolean);
}

function formDataFromState(form: BriefFormState) {
  const formData = new FormData();

  Object.entries(form).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      formData.set(key, value ? "1" : "");
      return;
    }

    formData.set(key, value);
  });

  return formData;
}

function findPaletteToken(mode: PaletteModeSpec, tokenName: string) {
  for (const group of mode.groups) {
    const token = group.tokens.find((item) => item.name === tokenName);

    if (token) {
      return token.value;
    }
  }

  return null;
}

function splitEntryList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({
  children,
  htmlFor,
  label,
  required = false,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClassName}>
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-1 text-red-400">
              *
            </span>
            <span className="sr-only"> required</span>
          </>
        ) : null}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
