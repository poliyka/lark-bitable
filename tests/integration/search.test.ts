import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import SearchCommand from "../../src/cli/commands/search.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("search command", () => {
  it("searches visible text fields and reports matched field names", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "search-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await SearchCommand.run([
      "login",
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
    expect(serialized).toContain("matchedFields");
    expect(serialized).toContain("標題");
  });

  it("applies owner criteria before search and then applies limit", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "search-"));
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
          標題: "Login issue owned by other",
          負責人: [{ name: "other" }],
        },
      },
    ];

    const result = await SearchCommand.run([
      "login",
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
      appliedAfter: ["owner", "search"],
      limit: 1,
      returned: 1,
    });
    expect(JSON.stringify(result.data)).toContain("recLogin");
    expect(JSON.stringify(result.data)).not.toContain("recDone");
  });

  it("keeps searching when owner filtering cannot be applied", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "search-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await SearchCommand.run([
      "bug",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(fixtureRecords),
      "--owner",
      "openclaw",
      "--limit",
      "2",
      "--json",
    ]);

    expect(result.ownerCriteria).toMatchObject({
      applied: false,
      notAppliedReason: "missing-owner-field",
    });
    expect(result.queryLimit).toMatchObject({
      limit: 2,
      returned: 1,
    });
  });
});
