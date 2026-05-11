"use client";

import { generateAppImageryAssets } from "@/app/projects/[projectId]/generate/actions";
import { useState } from "react";
import { useFormStatus } from "react-dom";

interface ImageryItem {
  compatibility: string;
  format: string;
  id: string;
  name: string;
  purpose: string;
  style: string;
  subject: string;
}

const defaultImageryItems: ImageryItem[] = [
  {
    compatibility: "Works on both approved light and dark surfaces",
    format: "Portrait-safe hero source",
    id: "home-hero",
    name: "Home hero image",
    purpose: "Home or onboarding header",
    style: "Style-matched editorial illustration",
    subject:
      "A domain-specific focal visual that expresses the app outcome without showing UI",
  },
  {
    compatibility: "Works on both approved light and dark surfaces",
    format: "Square/card-friendly source",
    id: "feature-image",
    name: "Feature card image",
    purpose: "Feature card or product section visual",
    style: "Abstract product visual",
    subject: "A close-up visual metaphor for the core app feature",
  },
  {
    compatibility: "Works on both approved light and dark surfaces",
    format: "Centered empty-state source",
    id: "empty-state",
    name: "Empty state image",
    purpose: "No data, no results, or setup-required state",
    style: "Soft illustration",
    subject: "A calm empty-state scene with generous blank space and no text",
  },
  {
    compatibility: "Works on both approved light and dark surfaces",
    format: "Centered state image source",
    id: "success-state",
    name: "Success state image",
    purpose: "Completed action, saved item, or progress milestone",
    style: "Restrained celebratory illustration",
    subject: "A polished success visual that feels encouraging without confetti clutter",
  },
];

const styleOptions = [
  "Style-matched editorial illustration",
  "Soft illustration",
  "Soft 3D render",
  "Abstract product visual",
  "Photo-real editorial image",
  "Domain-specific object scene",
];

const formatOptions = [
  "Portrait-safe hero source",
  "Square/card-friendly source",
  "Wide-banner-friendly source",
  "Centered empty-state source",
  "Centered state image source",
  "Isolated cutout-style source",
];

const compatibilityOptions = [
  "Works on both approved light and dark surfaces",
  "Optimized for light surfaces",
  "Optimized for dark surfaces",
];

export function GenerateAppImageryForm({
  disabled = false,
  disabledReason = "Generate and review the source backgrounds first.",
  projectId,
}: {
  disabled?: boolean;
  disabledReason?: string;
  projectId: string;
}) {
  const [items, setItems] = useState(defaultImageryItems);

  function updateItem(
    id: string,
    key: keyof Omit<ImageryItem, "id">,
    value: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        compatibility: compatibilityOptions[0],
        format: "Square/card-friendly source",
        id: `custom-${current.length + 1}-${Date.now()}`,
        name: "Custom app image",
        purpose: "Specific in-app placement",
        style: "Style-matched editorial illustration",
        subject: "Describe the subject, scene, object, or visual metaphor",
      },
    ]);
  }

  return (
    <form
      action={generateAppImageryAssets.bind(null, projectId)}
      className="rounded-md border border-zinc-800 bg-zinc-900/45 p-5"
    >
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">
          In-app image assets
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Generate text-free hero visuals, card images, empty states, success
          states, or other app imagery that sits inside coded screens. These
          are separate from background plates and icon sheets.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {items.map((item, index) => (
          <div
            className="rounded-md border border-zinc-800 bg-zinc-950/70 p-4"
            key={item.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
                  Image {index + 1}
                </p>
                <h4 className="mt-1 text-sm font-semibold text-zinc-100">
                  {item.name || "Untitled app image"}
                </h4>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={disabled || items.length <= 1}
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <LabeledInput
                disabled={disabled}
                label="Asset name"
                name="imageName"
                onChange={(value) => updateItem(item.id, "name", value)}
                value={item.name}
              />
              <LabeledInput
                disabled={disabled}
                label="Where it is used"
                name="imagePurpose"
                onChange={(value) => updateItem(item.id, "purpose", value)}
                value={item.purpose}
              />
              <LabeledSelect
                disabled={disabled}
                label="Visual style"
                name="imageStyle"
                onChange={(value) => updateItem(item.id, "style", value)}
                options={styleOptions}
                value={item.style}
              />
              <LabeledSelect
                disabled={disabled}
                label="Crop guidance"
                name="imageFormat"
                onChange={(value) => updateItem(item.id, "format", value)}
                options={formatOptions}
                value={item.format}
              />
              <div className="lg:col-span-2">
                <LabeledInput
                  disabled={disabled}
                  label="Subject"
                  name="imageSubject"
                  onChange={(value) => updateItem(item.id, "subject", value)}
                  value={item.subject}
                />
              </div>
              <div className="lg:col-span-2">
                <LabeledSelect
                  disabled={disabled}
                  label="Surface compatibility"
                  name="imageCompatibility"
                  onChange={(value) =>
                    updateItem(item.id, "compatibility", value)
                  }
                  options={compatibilityOptions}
                  value={item.compatibility}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={disabled || items.length >= 5}
          onClick={addItem}
        >
          Add image row
        </button>
        <ImagerySubmitButton disabled={disabled || items.length === 0} />
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        The prompt forbids text, fake UI, logos, labels, buttons, nav bars,
        charts, and icons inside these images.
      </p>

      {disabled ? (
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {disabledReason}
        </p>
      ) : null}

      <ImageryPendingNote />
    </form>
  );
}

function LabeledInput({
  disabled,
  label,
  name,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function LabeledSelect({
  disabled,
  label,
  name,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ImagerySubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={disabled || pending}
    >
      {pending ? <Spinner /> : null}
      {pending ? "Generating app imagery..." : "Generate app imagery"}
    </button>
  );
}

function ImageryPendingNote() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <p className="mt-3 max-w-2xl rounded-md border border-cyan-900/70 bg-cyan-950/30 px-3 py-2 text-sm leading-6 text-cyan-100">
      App imagery generation started. Keep this page open while the model
      creates text-free visual assets for use inside the approved background
      system.
    </p>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-950"
    />
  );
}
