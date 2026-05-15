import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { BaseCommand } from "../../src/cli/base-command.js";
import type { CommandOutput } from "../../src/cli/output.js";
import { readAuditEntries } from "../fixtures/audit.js";

class SlowAuditCommand extends BaseCommand {
  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(SlowAuditCommand);
    await new Promise((resolve) => setTimeout(resolve, 25));
    return this.emit(
      {
        command: "slow-audit",
        status: "ok",
      },
      Boolean(flags.json),
    );
  }
}

describe("BaseCommand audit timing", () => {
  it("records duration from command start through audit write", async () => {
    const dir = await mkdtemp(join(tmpdir(), "base-command-audit-"));
    const auditPath = join(dir, "logs", "audit.json");

    await SlowAuditCommand.run(["--json", "--audit-path", auditPath]);

    const entries = await readAuditEntries(auditPath);
    expect(entries[0]).toMatchObject({
      command: "slow-audit",
    });
    expect(entries[0]?.durationMs).toBeGreaterThan(0);
    expect(Date.parse(entries[0]?.finishedAt ?? "")).toBeGreaterThan(
      Date.parse(entries[0]?.startedAt ?? ""),
    );
  });
});
