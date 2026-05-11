import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CliError } from "../../src/cli/errors.js";
import HelpCommand, { commandNames } from "../../src/cli/commands/help.js";

describe("command-specific help", () => {
  it("covers every command module with human-readable command help", async () => {
    const commandFiles = readdirSync(
      new URL("../../src/cli/commands/", import.meta.url),
    )
      .filter((file) => file.endsWith(".ts"))
      .map((file) => file.replace(/\.ts$/, ""))
      .sort();

    expect([...commandNames].sort()).toEqual(commandFiles);

    for (const command of commandFiles) {
      const result = await HelpCommand.run([command, "--json"]);
      const rendered = result.data?.rendered;

      expect(rendered).toContain("For humans:");
      expect(rendered).toContain("For AI agents:");
      expect(rendered).toContain("Inputs:");
      expect(rendered).toContain("Outputs:");
      expect(rendered).toContain("Common failures:");
      expect(rendered).toContain("Next steps:");
      expect(rendered).toContain("Examples:");
    }
  });

  it("describes each supported command with purpose, inputs, outputs, examples, and common failures", async () => {
    for (const command of commandNames) {
      const result = await HelpCommand.run([command, "--json"]);
      const serialized = JSON.stringify(result);

      expect(serialized).toContain(command);
      expect(serialized).toContain("purpose");
      expect(serialized).toContain("inputs");
      expect(serialized).toContain("outputs");
      expect(serialized).toContain("examples");
      expect(serialized).toContain("commonFailures");
    }
  });

  it("renders command help in human-readable sections by default", async () => {
    const result = await HelpCommand.run(["configure"]);
    const serialized = JSON.stringify(result);

    expect(serialized).toContain("Configure Lark Bitable");
    expect(serialized).toContain("For humans");
    expect(serialized).toContain("For AI agents");
    expect(serialized).toContain("Common failures");
  });

  it("rejects unknown command-specific help with available command names", async () => {
    await expect(
      HelpCommand.run(["missing-command", "--json"]),
    ).rejects.toThrow(CliError);

    try {
      await HelpCommand.run(["missing-command", "--json"]);
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).code).toBe("unknown-help-command");
      expect((error as CliError).remediation).toContain(
        "lark-bitable help configure",
      );
      expect((error as CliError).remediation).toContain("help");
    }
  });
});
