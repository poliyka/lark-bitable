import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("bootstrap skill contract", () => {
  it("documents required workflow commands and evidence rules", async () => {
    const skill = await readFile("src/bootstrap/skill/SKILL.md", "utf8");

    for (const command of [
      "doctor",
      "valid",
      "configure",
      "list",
      "get",
      "filter",
      "search",
      "triage",
      "research",
      "lark-bitable lark --login",
    ]) {
      expect(skill).toContain(command);
    }
    expect(skill).toContain("Every factual claim");
    expect(skill).toContain("Stop");
  });
});
