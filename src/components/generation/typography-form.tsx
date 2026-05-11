"use client";

import { updateProjectTypography } from "@/app/projects/[projectId]/generate/actions";
import {
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from "react";
import { useFormStatus } from "react-dom";

type FontRoleName = "bodyFont" | "displayFont" | "utilityFont";
type FontRole = "body" | "display" | "utility";

interface FontPreset {
  aesthetic: string;
  bodyFont: string;
  displayFont: string;
  label: string;
  note: string;
  utilityFont: string;
}

interface TypographyState {
  bodyFont: string;
  displayFont: string;
  fontPreferences: string;
  fontPreset: string;
  utilityFont: string;
}

const fieldClassName =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/30";

const helpClassName = "mt-1 text-xs leading-5 text-zinc-500";

const fontPresets: FontPreset[] = [
  {
    aesthetic: "Product",
    bodyFont: "Inter",
    displayFont: "Instrument Serif",
    label: "Product Editorial",
    note: "Clean SaaS body type, mono data details, and an editorial accent for brand moments.",
    utilityFont: "JetBrains Mono",
  },
  {
    aesthetic: "Product",
    bodyFont: "Geist",
    displayFont: "Instrument Serif",
    label: "Geist Minimal",
    note: "Product polish with a warmer editorial headline accent.",
    utilityFont: "Geist Mono",
  },
  {
    aesthetic: "Product",
    bodyFont: "General Sans",
    displayFont: "Cabinet Grotesk",
    label: "Studio Grotesk",
    note: "Contemporary product sans pairing with a reliable technical mono.",
    utilityFont: "JetBrains Mono",
  },
  {
    aesthetic: "Product",
    bodyFont: "Sohne",
    displayFont: "IBM Plex Serif",
    label: "Plex Technical",
    note: "Crisp product UI with cohesive Plex support for technical and editorial moments.",
    utilityFont: "IBM Plex Mono",
  },
  {
    aesthetic: "Editorial",
    bodyFont: "Inter",
    displayFont: "Instrument Serif",
    label: "Magazine Clean",
    note: "Tasteful editorial display type with a safe UI body and mono metadata.",
    utilityFont: "JetBrains Mono",
  },
  {
    aesthetic: "Editorial",
    bodyFont: "Inter",
    displayFont: "Fraunces",
    label: "Expressive Serif",
    note: "Expressive but readable, with mono support for captions and metadata.",
    utilityFont: "Geist Mono",
  },
  {
    aesthetic: "Editorial",
    bodyFont: "DM Sans",
    displayFont: "DM Serif Display",
    label: "Soft Editorial",
    note: "Same-family warmth, UI clarity, and utility text.",
    utilityFont: "DM Mono",
  },
  {
    aesthetic: "Editorial",
    bodyFont: "Untitled Sans",
    displayFont: "Tiempos Headline",
    label: "Premium Index",
    note: "Premium editorial direction with restrained body type and strong technical contrast.",
    utilityFont: "Berkeley Mono",
  },
  {
    aesthetic: "Retro",
    bodyFont: "Space Grotesk",
    displayFont: "Monoton",
    label: "Retro Signal",
    note: "Retro display energy balanced by a usable body sans and matching mono.",
    utilityFont: "Space Mono",
  },
  {
    aesthetic: "Retro",
    bodyFont: "Space Grotesk",
    displayFont: "Audiowide",
    label: "Synth Interface",
    note: "Sharper high-energy tone with cohesive Space-family support.",
    utilityFont: "Space Mono",
  },
  {
    aesthetic: "Retro",
    bodyFont: "Rajdhani",
    displayFont: "Orbitron",
    label: "HUD System",
    note: "HUD and dashboard cues without forcing everything into display type.",
    utilityFont: "Share Tech Mono",
  },
  {
    aesthetic: "Retro",
    bodyFont: "Inter",
    displayFont: "VT323",
    label: "Pixel Accent",
    note: "Retro voice up front, with Inter carrying readability.",
    utilityFont: "JetBrains Mono",
  },
  {
    aesthetic: "Retro",
    bodyFont: "Inter",
    displayFont: "Press Start 2P",
    label: "Arcade UI",
    note: "Game-like nostalgia in small doses, backed by practical UI fonts.",
    utilityFont: "JetBrains Mono",
  },
  {
    aesthetic: "Retro",
    bodyFont: "Space Grotesk",
    displayFont: "Major Mono Display",
    label: "Mono Poster",
    note: "Mono-forward display tone with a real body sans for readable screens.",
    utilityFont: "Space Mono",
  },
  {
    aesthetic: "Retro",
    bodyFont: "Inter",
    displayFont: "Chakra Petch",
    label: "Cyber Product",
    note: "Cyberpunk dashboard flavor with dependable body and data handling.",
    utilityFont: "JetBrains Mono",
  },
  {
    aesthetic: "Warm",
    bodyFont: "Inter",
    displayFont: "Bricolage Grotesque",
    label: "Friendly Grotesk",
    note: "Friendly brand voice, safe body text, and a softer serif accent.",
    utilityFont: "Fraunces",
  },
  {
    aesthetic: "Warm",
    bodyFont: "Plus Jakarta Sans",
    displayFont: "Lora",
    label: "Warm Service",
    note: "Warm client-facing system with a handwritten accent for human moments.",
    utilityFont: "Caveat",
  },
  {
    aesthetic: "Warm",
    bodyFont: "Inter",
    displayFont: "Outfit",
    label: "Rounded Consumer",
    note: "Rounded approachable headlines, practical UI body, and a warmer serif accent.",
    utilityFont: "Lora",
  },
  {
    aesthetic: "Warm",
    bodyFont: "Inter",
    displayFont: "Recoleta",
    label: "Soft Brand",
    note: "Soft brand personality with technical support when the product needs it.",
    utilityFont: "JetBrains Mono",
  },
  {
    aesthetic: "Bold",
    bodyFont: "Neue Haas Grotesk",
    displayFont: "Migra",
    label: "Fashion Brutalist",
    note: "Premium high-contrast tone with a serious body sans and mono contrast.",
    utilityFont: "Berkeley Mono",
  },
  {
    aesthetic: "Bold",
    bodyFont: "Neue Haas Grotesk",
    displayFont: "PP Editorial New",
    label: "Sharp Editorial",
    note: "High-taste editorial direction with restrained UI text and sharp metadata.",
    utilityFont: "Berkeley Mono",
  },
  {
    aesthetic: "Bold",
    bodyFont: "Sohne",
    displayFont: "Reckless",
    label: "Serious Magazine",
    note: "Bold editorial display with a cohesive product body and mono companion.",
    utilityFont: "Sohne Mono",
  },
  {
    aesthetic: "Bold",
    bodyFont: "Inter",
    displayFont: "Boogy Brown",
    label: "Loud Campaign",
    note: "Loud editorial voice, stable body text, and practical technical contrast.",
    utilityFont: "JetBrains Mono",
  },
];

const fontAesthetics = [
  "Product",
  "Editorial",
  "Retro",
  "Warm",
  "Bold",
];

const displayFontOptions = uniqueOptions([
  "Instrument Serif",
  "Fraunces",
  "Newsreader",
  "Space Grotesk",
  "Sora",
  "Cabinet Grotesk",
  "IBM Plex Serif",
  "DM Serif Display",
  "Tiempos Headline",
  "Monoton",
  "Audiowide",
  "Orbitron",
  "VT323",
  "Press Start 2P",
  "Major Mono Display",
  "Chakra Petch",
  "Bricolage Grotesque",
  "Lora",
  "Outfit",
  "Recoleta",
  "Migra",
  "PP Editorial New",
  "Reckless",
  "Boogy Brown",
  ...fontPresets.map((preset) => preset.displayFont),
]);

const bodyFontOptions = uniqueOptions([
  "Inter",
  "Geist",
  "General Sans",
  "Sohne",
  "Untitled Sans",
  "Neue Haas Grotesk",
  "Space Grotesk",
  "Rajdhani",
  "Chakra Petch",
  "Plus Jakarta Sans",
  "Outfit",
  "Source Sans 3",
  "Manrope",
  "DM Sans",
  "IBM Plex Sans",
  ...fontPresets.map((preset) => preset.bodyFont),
]);

const utilityFontOptions = uniqueOptions([
  "JetBrains Mono",
  "Geist Mono",
  "IBM Plex Mono",
  "DM Mono",
  "Berkeley Mono",
  "Space Mono",
  "Share Tech Mono",
  "Roboto Mono",
  "Sohne Mono",
  "Instrument Serif",
  "Fraunces",
  "Lora",
  "Caveat",
  "Merriweather",
  "Newsreader Italic",
  ...fontPresets.map((preset) => preset.utilityFont),
]);

export function TypographyForm({
  disabled = false,
  disabledReason = "Generate the source background package first.",
  initialFontPreferences,
  projectId,
}: {
  disabled?: boolean;
  disabledReason?: string;
  initialFontPreferences: string;
  projectId: string;
}) {
  const initial = useMemo(
    () => typographyStateFromPreferences(initialFontPreferences),
    [initialFontPreferences],
  );
  const [form, setForm] = useState<TypographyState>(initial);
  const selectedPreset = fontPresets.find(
    (preset) => preset.label === form.fontPreset,
  );

  function updateRole(field: FontRoleName) {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
        fontPreset: "",
      }));
    };
  }

  function updateNotes(event: ChangeEvent<HTMLTextAreaElement>) {
    setForm((current) => ({
      ...current,
      fontPreferences: event.target.value,
    }));
  }

  function selectPreset(preset: FontPreset) {
    setForm((current) => ({
      ...current,
      bodyFont: preset.bodyFont,
      displayFont: preset.displayFont,
      fontPreset: preset.label,
      utilityFont: preset.utilityFont,
    }));
  }

  return (
    <form
      action={updateProjectTypography.bind(null, projectId)}
      className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5"
    >
      <input type="hidden" name="fontPreset" value={form.fontPreset} />

      <div className="grid gap-5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            Current type roles
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Choose display, interface, and utility fonts for the app. This
            saves the font handoff notes without changing generated
            backgrounds or app imagery.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <FontRoleField
            disabled={disabled}
            help="Brand-first headlines, major moments, and personality."
            label="Display role"
            name="displayFont"
            onChange={updateRole("displayFont")}
            options={displayFontOptions}
            role="display"
            value={form.displayFont}
          />
          <FontRoleField
            disabled={disabled}
            help="Paragraphs, labels, navigation, buttons, and forms."
            label="Interface role"
            name="bodyFont"
            onChange={updateRole("bodyFont")}
            options={bodyFontOptions}
            role="body"
            value={form.bodyFont}
          />
          <FontRoleField
            disabled={disabled}
            help="Metadata, timestamps, counters, and supporting details."
            label="Utility role"
            name="utilityFont"
            onChange={updateRole("utilityFont")}
            options={utilityFontOptions}
            role="utility"
            value={form.utilityFont}
          />
        </div>

        <FontPairingLibrary
          onSelect={selectPreset}
          selectedPreset={selectedPreset}
          selectedPresetLabel={form.fontPreset}
        />

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Additional font notes
          </span>
          <textarea
            name="fontPreferences"
            className={`${fieldClassName} mt-2 min-h-24 resize-y`}
            disabled={disabled}
            value={form.fontPreferences}
            onChange={updateNotes}
            placeholder="Client likes rounded letters, dislikes condensed type, needs tabular numbers."
          />
        </label>

        {disabled ? (
          <p className="text-sm leading-6 text-zinc-500">{disabledReason}</p>
        ) : null}

        <TypographySubmitButton disabled={disabled} />
        <TypographyPendingNote />
      </div>
    </form>
  );
}

function FontRoleField({
  help,
  disabled,
  label,
  name,
  onChange,
  options,
  role,
  value,
}: {
  disabled: boolean;
  help: string;
  label: string;
  name: FontRoleName;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  role: FontRole;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      <div className="mt-2 grid gap-3 rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Font preview
          </p>
          <p
            className="mt-2 truncate text-3xl leading-none text-zinc-50"
            style={fontPreviewStyle(value, role)}
          >
            {role === "utility" ? "TOKEN_128" : "Aa Sample"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Font name
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-200">
            {value}
          </p>
        </div>
        <select
          id={name}
          name={name}
          required
          className={fieldClassName}
          disabled={disabled}
          value={value}
          onChange={onChange}
        >
          {options.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>
      <p className={helpClassName}>{help}</p>
    </label>
  );
}

function FontPairingLibrary({
  onSelect,
  selectedPreset,
  selectedPresetLabel,
}: {
  onSelect: (preset: FontPreset) => void;
  selectedPreset?: FontPreset;
  selectedPresetLabel: string;
}) {
  const [openAesthetics, setOpenAesthetics] = useState<string[]>([
    selectedPreset?.aesthetic ?? "Product",
  ]);

  function toggleAesthetic(label: string) {
    setOpenAesthetics((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  }

  return (
    <section className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
      <div>
        <p className="text-sm font-medium text-zinc-200">
          Recommended pairings
        </p>
        <p className={helpClassName}>
          Pairing cards describe the system. Font names and rendered samples are
          separated inside each role.
        </p>
      </div>

      <div className="grid gap-3">
        {fontAesthetics.map((aesthetic) => {
          const presets = fontPresets.filter(
            (preset) => preset.aesthetic === aesthetic,
          );
          const isOpen = openAesthetics.includes(aesthetic);

          return (
            <div
              key={aesthetic}
              className="rounded-md border border-zinc-800 bg-zinc-950/70"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-500"
                onClick={() => toggleAesthetic(aesthetic)}
              >
                <span className="text-sm font-semibold text-zinc-100">
                  {aesthetic}
                </span>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {isOpen ? "Close" : "Open"}
                </span>
              </button>

              {isOpen ? (
                <div className="grid gap-3 border-t border-zinc-800 p-3">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={preset.label === selectedPresetLabel}
                      className={`rounded-md border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-zinc-500 ${
                        preset.label === selectedPresetLabel
                          ? "border-zinc-300 bg-zinc-50 text-zinc-950"
                          : "border-zinc-800 bg-zinc-950 text-zinc-100 hover:border-zinc-600"
                      }`}
                      onClick={() => onSelect(preset)}
                    >
                      <span className="block text-sm font-semibold">
                        {preset.label}
                      </span>
                      <span
                        className={`mt-1 block text-sm leading-6 ${
                          preset.label === selectedPresetLabel
                            ? "text-zinc-700"
                            : "text-zinc-400"
                        }`}
                      >
                        {preset.note}
                      </span>
                      <span className="mt-4 grid gap-3 lg:grid-cols-3">
                        <PairingRolePreview
                          fontName={preset.displayFont}
                          label="Display"
                          role="display"
                          selected={preset.label === selectedPresetLabel}
                        />
                        <PairingRolePreview
                          fontName={preset.bodyFont}
                          label="Interface"
                          role="body"
                          selected={preset.label === selectedPresetLabel}
                        />
                        <PairingRolePreview
                          fontName={preset.utilityFont}
                          label="Utility"
                          role="utility"
                          selected={preset.label === selectedPresetLabel}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PairingRolePreview({
  fontName,
  label,
  role,
  selected,
}: {
  fontName: string;
  label: string;
  role: FontRole;
  selected: boolean;
}) {
  return (
    <span
      className={`block rounded border p-3 ${
        selected
          ? "border-zinc-300 bg-white"
          : "border-zinc-800 bg-zinc-900/70"
      }`}
    >
      <span
        className={`block text-[11px] font-semibold uppercase tracking-wide ${
          selected ? "text-zinc-500" : "text-zinc-600"
        }`}
      >
        {label}
      </span>
      <span
        className={`mt-2 block truncate text-2xl leading-none ${
          selected ? "text-zinc-950" : "text-zinc-50"
        }`}
        style={fontPreviewStyle(fontName, role)}
      >
        {role === "utility" ? "09:42" : "Aa"}
      </span>
      <span
        className={`mt-2 block truncate text-xs font-semibold ${
          selected ? "text-zinc-700" : "text-zinc-400"
        }`}
      >
        {fontName}
      </span>
    </span>
  );
}

function TypographySubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={disabled || pending}
    >
      {pending ? <Spinner /> : null}
      {pending ? "Saving fonts..." : "Save font system"}
    </button>
  );
}

function TypographyPendingNote() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <p className="max-w-2xl rounded-md border border-cyan-900/70 bg-cyan-950/30 px-3 py-2 text-sm leading-6 text-cyan-100">
      Font roles are being saved with the selected handoff notes.
    </p>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100"
    />
  );
}

function typographyStateFromPreferences(value: string): TypographyState {
  return {
    bodyFont:
      extractFont(value, /Body\s*\/\s*Workhorse font:\s*([^.\n]+)/i) ??
      "Inter",
    displayFont:
      extractFont(value, /Display\s*\/\s*Voice font:\s*([^.\n]+)/i) ??
      "Instrument Serif",
    fontPreferences:
      value.match(/Additional client font notes:\s*([\s\S]+)/i)?.[1]?.trim() ??
      "",
    fontPreset:
      extractFont(value, /Suggested font pairing:\s*([^.\n]+)/i) ?? "",
    utilityFont:
      extractFont(value, /Utility\s*\/\s*Accent font:\s*([^.\n]+)/i) ??
      "JetBrains Mono",
  };
}

function extractFont(input: string, pattern: RegExp) {
  return input.match(pattern)?.[1]?.trim() ?? null;
}

function fontPreviewStyle(fontName: string, role: FontRole): CSSProperties {
  return {
    fontFamily: fontPreviewStack(fontName, role),
  };
}

function fontPreviewStack(fontName: string, role: FontRole) {
  const normalized = fontName.toLowerCase();

  if (normalized === "inter") {
    return 'var(--font-preview-inter), "Inter", Arial, sans-serif';
  }

  if (normalized === "instrument serif") {
    return 'var(--font-preview-instrument-serif), "Instrument Serif", Georgia, serif';
  }

  if (normalized === "jetbrains mono") {
    return 'var(--font-preview-jetbrains-mono), "JetBrains Mono", ui-monospace, monospace';
  }

  if (normalized === "geist") {
    return 'var(--font-geist-sans), "Geist", Arial, sans-serif';
  }

  if (normalized === "geist mono") {
    return 'var(--font-geist-mono), "Geist Mono", ui-monospace, monospace';
  }

  const fallback =
    role === "utility"
      ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      : serifLikeFont(fontName)
        ? "Georgia, Times New Roman, serif"
        : "Arial, Helvetica, sans-serif";

  return `"${fontName.replaceAll('"', '\\"')}", ${fallback}`;
}

function serifLikeFont(fontName: string) {
  const value = fontName.toLowerCase();

  return (
    value.includes("serif") ||
    value.includes("lora") ||
    value.includes("fraunces") ||
    value.includes("tiempos") ||
    value.includes("recoleta") ||
    value.includes("reckless") ||
    value.includes("migra") ||
    value.includes("editorial") ||
    value.includes("boogy")
  );
}

function uniqueOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}
