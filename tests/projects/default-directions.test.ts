import { describe, expect, it } from "vitest";
import { defaultDesignDirectionRows } from "@/lib/projects/default-directions";

describe("default design directions", () => {
  it("creates one selected default direction and two alternatives", () => {
    const rows = defaultDesignDirectionRows({
      appName: "Laitly",
      projectId: "project-123",
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.title)).toEqual([
      "Clean Precision",
      "Atmospheric Depth",
      "Bold Utility",
    ]);
    expect(rows.filter((row) => row.is_selected)).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      is_selected: true,
      project_id: "project-123",
    });
    expect(rows[0]?.summary).toContain("Laitly");
  });
});
