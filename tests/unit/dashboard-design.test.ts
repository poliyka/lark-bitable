import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const designPath = new URL(
  "../../specs/004-add-dashboard-command/design.md",
  import.meta.url,
);

describe("dashboard design reference", () => {
  it("documents the imported HTML design tokens and visual language", async () => {
    const design = await readFile(designPath, "utf8");

    expect(design).toContain("../Lark Bitable Dashboard.html");
    expect(design).toContain("__bundler/template");
    expect(design).toContain("--bg: #060708");
    expect(design).toContain("--accent: oklch(0.82 0.17 145)");
    expect(design).toContain("IBM Plex Sans");
    expect(design).toContain("IBM Plex Mono");
    expect(design).toContain("sidebar `252px`");
  });

  it("records all dashboard pages and source-data translation boundaries", async () => {
    const design = await readFile(designPath, "utf8");

    for (const page of [
      "overview",
      "config",
      "auth",
      "audit",
      "playground",
      "research",
      "table",
    ]) {
      expect(design).toContain(`data-page="${page}"`);
    }

    expect(design).toContain("lark-bitable.dashboard.lang");
    expect(design).toContain(
      "不翻譯 Lark field/record/audit/research/command output",
    );
  });
});
