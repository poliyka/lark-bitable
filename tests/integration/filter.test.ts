import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import FilterCommand from "../../src/cli/commands/filter.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("filter command", () => {
  it("filters by equals and reports criteria", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "filter-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await FilterCommand.run([
      "--field",
      "狀態",
      "--equals",
      "待處理",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(fixtureRecords),
      "--json",
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).toContain("recLogin");
    expect(serialized).not.toContain("recDone");
    expect(serialized).toContain("criteria");
  });

  it("applies owner criteria before field filtering and then applies limit", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "filter-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource({
      ...fixtureSource,
      fieldAliases: {
        ...fixtureSource.fieldAliases,
        owner: "負責人",
      },
    });
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
          負責人: [{ name: "other" }],
        },
      },
    ];

    const result = await FilterCommand.run([
      "--field",
      "狀態",
      "--equals",
      "待處理",
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

    expect(result.ownerCriteria).toMatchObject({
      applied: true,
      matchedRecords: 1,
      value: "openclaw",
    });
    expect(result.queryLimit).toMatchObject({
      appliedAfter: ["owner", "filter"],
      limit: 1,
      returned: 1,
    });
    expect(JSON.stringify(result.data)).toContain("recLogin");
    expect(JSON.stringify(result.data)).not.toContain("recDone");
  });

  it("keeps filtering when an owner value is provided without a configured owner field", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "filter-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await FilterCommand.run([
      "--field",
      "狀態",
      "--equals",
      "待處理",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(fixtureRecords),
      "--owner",
      "openclaw",
      "--limit",
      "5",
      "--json",
    ]);

    expect(result.ownerCriteria).toMatchObject({
      applied: false,
      notAppliedReason: "missing-owner-field",
    });
    expect(result.queryLimit).toMatchObject({
      limit: 5,
      returned: 1,
    });
  });
});
