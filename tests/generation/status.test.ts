import { describe, expect, it } from "vitest";
import {
  generationStatusPresentation,
  shouldPollGenerationStatus,
} from "@/lib/generation/status";

describe("generation status presentation", () => {
  it("polls when the form is pending even before a generation row exists", () => {
    expect(
      shouldPollGenerationStatus({ formPending: true, latestStatus: null }),
    ).toBe(true);
    expect(
      generationStatusPresentation({
        fileCount: 0,
        formPending: true,
        latestStatus: null,
      }),
    ).toMatchObject({
      title: "Starting generation",
      tone: "running",
    });
  });

  it("keeps polling while a generation is queued or running", () => {
    expect(
      shouldPollGenerationStatus({ formPending: false, latestStatus: "queued" }),
    ).toBe(true);
    expect(
      shouldPollGenerationStatus({
        formPending: false,
        latestStatus: "running",
      }),
    ).toBe(true);
  });

  it("stops polling once a generation reaches a terminal state", () => {
    expect(
      shouldPollGenerationStatus({
        formPending: false,
        latestStatus: "succeeded",
      }),
    ).toBe(false);
    expect(
      shouldPollGenerationStatus({ formPending: false, latestStatus: "failed" }),
    ).toBe(false);
  });
});
