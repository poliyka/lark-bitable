import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import GetCommand from "../../src/cli/commands/get.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("get command", () => {
  it("returns one record by stable record id", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "get-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await GetCommand.run([
      "recLogin",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(fixtureRecords),
      "--json",
    ]);

    expect(JSON.stringify(result)).toContain("Login error");
  });

  it("fails when the record is unknown", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "get-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    await expect(
      GetCommand.run([
        "missing",
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--fixture",
        JSON.stringify(fixtureRecords),
      ]),
    ).rejects.toThrow("Record not found");
  });
});
