"use client";

import { useState } from "react";
import { GenerateAppImageryForm } from "./generate-app-imagery-form";
import { GenerateBackgroundsForm } from "./generate-backgrounds-form";
import { GenerateIconsForm } from "./generate-icons-form";
import { TypographyForm } from "./typography-form";

type WorkflowStepId = "backgrounds" | "imagery" | "typography" | "icons";

interface WorkflowStep {
  description: string;
  id: WorkflowStepId;
  title: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    id: "backgrounds",
    title: "Expand backgrounds",
    description:
      "Create more textless light/dark background plates for specific app areas.",
  },
  {
    id: "imagery",
    title: "App imagery",
    description:
      "Create hero visuals, card art, empty states, and success imagery for use inside coded screens.",
  },
  {
    id: "typography",
    title: "Fonts",
    description:
      "Choose display, interface, and utility fonts for implementation handoff.",
  },
  {
    id: "icons",
    title: "Optional icons",
    description:
      "Generate a controlled utility icon sheet after the visual system is settled.",
  },
];

export function PostBackgroundWorkflow({
  disabled = false,
  disabledReason,
  hasAppImagery,
  hasExpandedBackgrounds,
  hasIcons,
  hasTypography,
  initialFontPreferences,
  initialIconSubjects,
  projectId,
}: {
  disabled?: boolean;
  disabledReason: string;
  hasAppImagery: boolean;
  hasExpandedBackgrounds: boolean;
  hasIcons: boolean;
  hasTypography: boolean;
  initialFontPreferences: string;
  initialIconSubjects: string[];
  projectId: string;
}) {
  const status = {
    disabled,
    hasAppImagery,
    hasExpandedBackgrounds,
    hasIcons,
    hasTypography,
  };
  const [activeStep, setActiveStep] = useState<WorkflowStepId>(() =>
    initialActiveStep({
      disabled,
      hasAppImagery,
      hasExpandedBackgrounds,
      hasIcons,
      hasTypography,
    }),
  );
  const activeStepDetails =
    workflowSteps.find((step) => step.id === activeStep) ?? workflowSteps[0];

  return (
    <div>
      <div
        aria-label="Post-background asset workflow"
        className="grid gap-2 lg:grid-cols-4"
        role="tablist"
      >
        {workflowSteps.map((step, index) => {
          const isActive = step.id === activeStep;

          return (
            <button
              aria-controls={`workflow-panel-${step.id}`}
              aria-selected={isActive}
              className={`rounded-md border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-zinc-500 ${
                isActive
                  ? "border-zinc-300 bg-zinc-50 text-zinc-950"
                  : "border-zinc-800 bg-zinc-950/40 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-900/70"
              }`}
              id={`workflow-tab-${step.id}`}
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              role="tab"
              type="button"
            >
              <span
                className={`block text-[11px] font-semibold uppercase tracking-wide ${
                  isActive ? "text-zinc-500" : "text-zinc-600"
                }`}
              >
                Step {index + 1}
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {step.title}
              </span>
              <span
                className={`mt-2 inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${
                  isActive
                    ? "border-zinc-300 bg-white text-zinc-700"
                    : "border-zinc-800 bg-zinc-950 text-zinc-500"
                }`}
              >
                {stepStatusLabel(step.id, {
                  disabled,
                  hasAppImagery,
                  hasExpandedBackgrounds,
                  hasIcons,
                  hasTypography,
                })}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-50">
            {activeStepDetails.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            {activeStepDetails.description}
          </p>
        </div>

        <div
          aria-labelledby={`workflow-tab-${activeStep}`}
          id={`workflow-panel-${activeStep}`}
          role="tabpanel"
        >
          {activeStep === "backgrounds" ? (
            <GenerateBackgroundsForm
              disabled={stepDisabled("backgrounds", status)}
              disabledReason={stepDisabledReason(
                "backgrounds",
                status,
                disabledReason,
              )}
              projectId={projectId}
            />
          ) : null}

          {activeStep === "imagery" ? (
            <GenerateAppImageryForm
              disabled={stepDisabled("imagery", status)}
              disabledReason={stepDisabledReason(
                "imagery",
                status,
                disabledReason,
              )}
              projectId={projectId}
            />
          ) : null}

          {activeStep === "typography" ? (
            <TypographyForm
              disabled={stepDisabled("typography", status)}
              disabledReason={stepDisabledReason(
                "typography",
                status,
                disabledReason,
              )}
              initialFontPreferences={initialFontPreferences}
              projectId={projectId}
            />
          ) : null}

          {activeStep === "icons" ? (
            <GenerateIconsForm
              disabled={stepDisabled("icons", status)}
              disabledReason={stepDisabledReason(
                "icons",
                status,
                disabledReason,
              )}
              initialSubjects={initialIconSubjects}
              projectId={projectId}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function initialActiveStep({
  disabled,
  hasAppImagery,
  hasExpandedBackgrounds,
  hasIcons,
  hasTypography,
}: {
  disabled: boolean;
  hasAppImagery: boolean;
  hasExpandedBackgrounds: boolean;
  hasIcons: boolean;
  hasTypography: boolean;
}): WorkflowStepId {
  if (disabled || !hasExpandedBackgrounds) {
    return "backgrounds";
  }

  if (!hasAppImagery) {
    return "imagery";
  }

  if (!hasTypography) {
    return "typography";
  }

  if (!hasIcons) {
    return "icons";
  }

  return "backgrounds";
}

function stepStatusLabel(
  step: WorkflowStepId,
  status: {
    disabled: boolean;
    hasAppImagery: boolean;
    hasExpandedBackgrounds: boolean;
    hasIcons: boolean;
    hasTypography: boolean;
  },
) {
  if (status.disabled) {
    return "Locked";
  }

  if (step === "backgrounds") {
    return status.hasExpandedBackgrounds ? "Done" : "Ready";
  }

  if (step === "imagery") {
    if (!status.hasExpandedBackgrounds) {
      return "Locked";
    }

    return status.hasAppImagery ? "Done" : "Ready";
  }

  if (step === "typography") {
    if (!status.hasAppImagery) {
      return "Locked";
    }

    return status.hasTypography ? "Done" : "Ready";
  }

  if (!status.hasTypography) {
    return "Locked";
  }

  return status.hasIcons ? "Done" : "Optional";
}

function stepDisabled(
  step: WorkflowStepId,
  status: {
    disabled: boolean;
    hasAppImagery: boolean;
    hasExpandedBackgrounds: boolean;
    hasTypography: boolean;
  },
) {
  if (status.disabled) {
    return true;
  }

  if (step === "imagery") {
    return !status.hasExpandedBackgrounds;
  }

  if (step === "typography") {
    return !status.hasAppImagery;
  }

  if (step === "icons") {
    return !status.hasTypography;
  }

  return false;
}

function stepDisabledReason(
  step: WorkflowStepId,
  status: {
    disabled: boolean;
    hasAppImagery: boolean;
    hasExpandedBackgrounds: boolean;
    hasTypography: boolean;
  },
  fallbackReason: string,
) {
  if (status.disabled) {
    return fallbackReason;
  }

  if (step === "imagery" && !status.hasExpandedBackgrounds) {
    return "Generate expanded backgrounds first, then create app imagery.";
  }

  if (step === "typography" && !status.hasAppImagery) {
    return "Generate app imagery first, then choose fonts.";
  }

  if (step === "icons" && !status.hasTypography) {
    return "Save the font system first; optional icons come after fonts.";
  }

  return fallbackReason;
}
