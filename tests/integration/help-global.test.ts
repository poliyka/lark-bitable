import { describe, expect, it } from "vitest";

import HelpCommand, { commandNames } from "../../src/cli/commands/help.js";

describe("global help", () => {
  it("shows recommended workflow and all command names", async () => {
    const result = await HelpCommand.run(["--json"]);
    const serialized = JSON.stringify(result);

    expect(serialized).toContain("doctor");
    expect(serialized).toContain("lark-bitable lark --login");
    expect(serialized).toContain("Workflow modes");
    expect(serialized).toContain("Developer");
    expect(serialized).toContain("QA");
    expect(serialized).toContain("schema --json first");
    expect(serialized).toContain("exact status values");
    expect(serialized).toContain("ownerCriteria.applied=false");
    expect(serialized).toContain("Use --limit");
    expect(serialized).toContain(
      "run get <record-id> before repository research",
    );
    expect(serialized).toContain(
      "download any Lark media through media download",
    );
    expect(serialized).toContain("prefer verify");
    for (const command of commandNames) {
      expect(serialized).toContain(command);
    }
  });
});
