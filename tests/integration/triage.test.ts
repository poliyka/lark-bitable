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

  it("applies default owner before actionable filtering and post-sort limit", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "triage-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    const store = new ConfigStore({ cwd });
    store.setSource({
      ...fixtureSource,
      fieldAliases: {
        ...fixtureSource.fieldAliases,
        owner: "負責人",
      },
      priorityOrder: ["P0", "P1", "P2"],
    });
    store.setModeDefaultOwner({ mode: "Developer", owner: "openclaw" });
    const records = [
      {
        ...fixtureRecords[0],
        fields: {
          ...fixtureRecords[0].fields,
          負責人: [{ name: "openclaw" }],
        },
      },
      {
        ...fixtureRecords[1],
        fields: {
          ...fixtureRecords[1].fields,
          狀態: "待處理",
          優先級: "P1",
          負責人: [{ name: "other" }],
        },
      },
    ];

    const result = await TriageCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(records),
      "--limit",
      "1",
      "--json",
    ]);

    expect(result.ownerCriteria).toMatchObject({
      applied: true,
      source: "mode-default",
      value: "openclaw",
    });
    expect(result.queryLimit).toMatchObject({
      appliedAfter: ["owner", "actionable-status", "priority-sort"],
      limit: 1,
      returned: 1,
    });
    expect(JSON.stringify(result.data)).toContain("recLogin");
    expect(JSON.stringify(result.data)).not.toContain("recDone");
    expect(new ConfigStore({ cwd }).getSelection()).toMatchObject({
      mode: "Developer",
      selectedRecordId: "recLogin",
      selectionEvidence: {
        ownerCriteria: expect.objectContaining({ value: "openclaw" }),
      },
    });
  });

  it("does not block triage when owner filtering is requested without owner field", async () => {
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
      "--owner",
      "openclaw",
      "--limit",
      "1",
      "--json",
    ]);

    expect(result.ownerCriteria).toMatchObject({
      applied: false,
      notAppliedReason: "missing-owner-field",
      value: "openclaw",
    });
    expect(result.queryLimit).toMatchObject({
      limit: 1,
      returned: 1,
    });
  });
});
