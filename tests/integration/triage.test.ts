import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import TriageCommand from "../../src/cli/commands/triage.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("triage command", () => {
  it("returns sorted actionable candidates in JSON mode", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "triage-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource({
      ...fixtureSource,
      priorityOrder: ["P0", "P1", "P2"],
    });

    const result = await TriageCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(fixtureRecords),
      "--select",
      "0",
      "--json",
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).toContain("recLogin");
    expect(serialized).not.toContain("recDone");
    expect(new ConfigStore({ cwd }).getSelection()?.selectedRecordId).toBe(
      "recLogin",
    );
  });

  it("reports no actionable records explicitly", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "triage-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await TriageCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify([fixtureRecords[1]]),
      "--json",
    ]);

    expect(JSON.stringify(result)).toContain("no-actionable-records");
  });
});
