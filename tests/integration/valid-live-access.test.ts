import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import ValidCommand from "../../src/cli/commands/valid.js";
import { installBootstrapSkill } from "../../src/bootstrap/installer.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureSource } from "../fixtures/lark.js";

describe("valid live access uncertainty", () => {
  it("reports partial instead of ready when live access is inconclusive", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "valid-live-"));
    const authPath = join(cwd, "auth.json");
    const skillDir = join(cwd, "skills");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);
    await installBootstrapSkill({ targetDir: skillDir });

    const result = await ValidCommand.run([
      "--workflow",
      "inspect",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--skill-dir",
      skillDir,
      "--live-access",
      "partial",
      "--json",
    ]);

    expect(JSON.stringify(result)).toContain("partial");
    expect(JSON.stringify(result)).toContain("live-access-inconclusive");
  });
});
