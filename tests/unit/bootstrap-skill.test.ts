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
      "schema",
      "filter",
      "search",
      "triage",
      "research",
      "media download",
      "lark-bitable lark --login",
    ]) {
      expect(skill).toContain(command);
    }
    expect(skill).toContain("/open-apis/drive/v1/medias/:file_token/download");
    expect(skill).toContain("lark-bitable schema --json");
    expect(skill).toContain("Do not guess field names");
    expect(skill).toContain("Developer");
    expect(skill).toContain("QA");
    expect(skill).toContain("Owner filtering is optional");
    expect(skill).toContain(
      "Query commands support `--limit <positive-integer>`",
    );
    expect(skill).toContain("refresh before starting a browser login");
    expect(skill).toContain("Inspect the stored scopes");
    expect(skill).toContain('lark-bitable lark --login --scope="<scope>"');
    expect(skill).toContain("run `lark-bitable get <record-id>`");
    expect(skill).toContain("media download <file-token>");
    expect(skill).toContain("not as anonymous public URLs");
    expect(skill).toContain("representative QA snapshot photos");
    expect(skill).toContain("not limited to one photo");
    expect(skill).toContain("Preserve existing attachments");
    expect(skill).toContain("A list result is only a candidate summary");
    expect(skill).toContain("Every factual claim");
    expect(skill).toContain("Stop");
  });
});
