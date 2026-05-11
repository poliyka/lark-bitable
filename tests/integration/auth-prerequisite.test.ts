import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import ListCommand from "../../src/cli/commands/list.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { checkReadiness } from "../../src/config/readiness.js";
import { ConfigStore } from "../../src/config/store.js";
import { expiredAuthSession } from "../fixtures/auth.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("auth prerequisites", () => {
  it("blocks API workflows when login is missing", async () => {
    const result = await checkReadiness("inspect", {
      bootstrapInstalled: true,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockingIssues.map((issue) => issue.code)).toContain(
      "missing-auth",
    );
    expect(result.remediationSteps).toContain("Run lark-bitable lark --login");
  });

  it("blocks API commands when the stored token is expired", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "auth-expired-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...expiredAuthSession,
      storagePath: authPath,
      status: "ready",
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    await expect(
      ListCommand.run([
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--fixture",
        JSON.stringify(fixtureRecords),
        "--json",
      ]),
    ).rejects.toThrow("Lark auth is expired");
  });
});
