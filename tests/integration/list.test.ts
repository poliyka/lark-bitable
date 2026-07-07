import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import ListCommand from "../../src/cli/commands/list.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("list command", () => {
  it("returns records with source metadata and selected fields", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "list-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await ListCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(fixtureRecords),
      "--field",
      "標題",
      "--limit",
      "1",
      "--json",
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).toContain("recLogin");
    expect(serialized).toContain("TypDbjKBfaJcaSsoEI1lZjHsgIY");
    expect(serialized).not.toContain("優先級");
  });

  it("applies command owner and limit metadata without stored owner defaults", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "list-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    const store = new ConfigStore({ cwd });
    store.setSource(fixtureSource);
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
          負責人: [{ name: "other" }],
        },
      },
    ];

    const commandOwnerResult = await ListCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(records),
      "--owner",
      "openclaw",
      "--limit",
      "1",
      "--json",
    ]);
    expect(commandOwnerResult.ownerCriteria).toMatchObject({
      applied: true,
      matchedRecords: 1,
      source: "command",
      value: "openclaw",
    });
    expect(commandOwnerResult.queryLimit).toMatchObject({
      hasMore: false,
      limit: 1,
      returned: 1,
      source: "command",
    });

    const unownedResult = await ListCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(records),
      "--json",
    ]);
    expect(unownedResult.ownerCriteria).toMatchObject({
      applied: false,
      source: "none",
    });
    expect(JSON.stringify(unownedResult.data)).toContain("recDone");
  });

  it("does not block list when an owner value is provided but no owner field is configured", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "list-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await ListCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(fixtureRecords),
      "--owner",
      "openclaw",
      "--json",
    ]);

    expect(result.ownerCriteria).toMatchObject({
      applied: false,
      notAppliedReason: "missing-owner-field",
      value: "openclaw",
    });
    expect(JSON.stringify(result.data)).toContain("recDone");
  });
});
