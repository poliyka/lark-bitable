import { readdirSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { CliError } from "../../src/cli/errors.js";
import HelpCommand, { commandNames } from "../../src/cli/commands/help.js";
import { readAuditEntries } from "../fixtures/audit.js";

async function createAuditPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "help-audit-"));
  return join(dir, "logs", "audit.json");
}

function normalizeCommandNames(names: string[]): string[] {
  return names.map((name) => name.replace(/\.ts$/, "")).sort();
}

describe("command-specific help", () => {
  it("covers every command module with human-readable command help", async () => {
    const auditPath = await createAuditPath();
    const commandFiles = readdirSync(
      new URL("../../src/cli/commands/", import.meta.url),
    )
      .filter((file) => file.endsWith(".ts"))
      .map((file) => file.replace(/\.ts$/, ""));

    expect(normalizeCommandNames([...commandNames])).toEqual(
      normalizeCommandNames([...commandFiles, "media download"]),
    );

    for (const command of commandFiles) {
      const result = await HelpCommand.run([
        command,
        "--json",
        "--audit-path",
        auditPath,
      ]);
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
    const auditPath = await createAuditPath();

    for (const command of commandNames) {
      const result = await HelpCommand.run([
        command,
        "--json",
        "--audit-path",
        auditPath,
      ]);
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
    const auditPath = await createAuditPath();
    const result = await HelpCommand.run([
      "configure",
      "--audit-path",
      auditPath,
    ]);
    const serialized = JSON.stringify(result);

    expect(serialized).toContain("Configure Lark Bitable");
    expect(serialized).toContain("For humans");
    expect(serialized).toContain("For AI agents");
    expect(serialized).toContain("Common failures");

    const entries = await readAuditEntries(auditPath);
    expect(entries).toEqual([
      expect.objectContaining({
        command: "help",
        status: "ok",
      }),
    ]);
  });

  it("supports topic command help with separate human arguments", async () => {
    const auditPath = await createAuditPath();
    const result = await HelpCommand.run([
      "media",
      "download",
      "--json",
      "--audit-path",
      auditPath,
    ]);

    expect(result.data?.command).toBe("media download");
    expect(result.data?.rendered).toContain("Download Lark Media");
  });

  it("rejects unknown command-specific help with available command names", async () => {
    const auditPath = await createAuditPath();

    await expect(
      HelpCommand.run(["missing-command", "--json", "--audit-path", auditPath]),
    ).rejects.toThrow(CliError);

    try {
      await HelpCommand.run([
        "missing-command",
        "--json",
        "--audit-path",
        auditPath,
      ]);
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
