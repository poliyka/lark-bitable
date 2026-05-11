import { describe, expect, it } from "vitest";

import HelpCommand, { commandNames } from "../../src/cli/commands/help.js";

describe("global help", () => {
  it("shows recommended workflow and all command names", async () => {
    const result = await HelpCommand.run(["--json"]);
    const serialized = JSON.stringify(result);

    expect(serialized).toContain("doctor");
    expect(serialized).toContain("lark-bitable lark --login");
    for (const command of commandNames) {
      expect(serialized).toContain(command);
    }
  });
});
