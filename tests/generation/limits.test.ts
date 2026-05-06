import { describe, expect, it } from "vitest";
import {
  canGenerate,
  initialMaxGenerationsForEmail,
  nextUsedGenerationCount,
} from "@/lib/generation/limits";

describe("generation limits", () => {
  it("allows unlimited accounts", () => {
    expect(canGenerate({ maxGenerations: null, usedGenerations: 500 })).toEqual({
      allowed: true,
      remaining: null,
    });
  });

  it("allows clients below the cap", () => {
    expect(canGenerate({ maxGenerations: 50, usedGenerations: 49 })).toEqual({
      allowed: true,
      remaining: 1,
    });
  });

  it("blocks clients at the cap", () => {
    expect(canGenerate({ maxGenerations: 50, usedGenerations: 50 })).toEqual({
      allowed: false,
      remaining: 0,
    });
  });

  it("increments only after a usable asset is produced", () => {
    expect(
      nextUsedGenerationCount({
        usedGenerations: 10,
        producedUsableAssets: true,
      }),
    ).toBe(11);
    expect(
      nextUsedGenerationCount({
        usedGenerations: 10,
        producedUsableAssets: false,
      }),
    ).toBe(10);
  });

  it("marks configured internal emails as unlimited", () => {
    expect(
      initialMaxGenerationsForEmail(
        "owner@example.com",
        "owner@example.com,test@example.com",
      ),
    ).toBeNull();
    expect(
      initialMaxGenerationsForEmail(
        "client@example.com",
        "owner@example.com,test@example.com",
      ),
    ).toBe(50);
  });
});
