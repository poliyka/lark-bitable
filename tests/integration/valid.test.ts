import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import ValidCommand from "../../src/cli/commands/valid.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { installBootstrapSkill } from "../../src/bootstrap/installer.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureSource } from "../fixtures/lark.js";

describe("valid command", () => {
  it("reports missing login and source with remediation", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "valid-"));
    const authPath = join(cwd, "auth.json");
    const skillDir = join(cwd, "skills");

    const result = await ValidCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--skill-dir",
      skillDir,
      "--json",
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).toContain("blocked");
    expect(serialized).toContain("missing-bootstrap");
    expect(serialized).toContain("Run lark-bitable lark --login");
    expect(serialized).toContain("configure");
  });

  it("reports ready for inspect when auth and source are configured", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "valid-"));
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
      "--json",
    ]);

    expect(JSON.stringify(result)).toContain("ready");
    expect(JSON.stringify(result)).toContain("lark-bitable list");
  });

  it("blocks on missing bootstrap skill even when auth and source are configured", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "valid-"));
    const authPath = join(cwd, "auth.json");
    const skillDir = join(cwd, "skills");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await ValidCommand.run([
      "--workflow",
      "inspect",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--skill-dir",
      skillDir,
      "--json",
    ]);

    expect(JSON.stringify(result)).toContain("blocked");
    expect(JSON.stringify(result)).toContain("missing-bootstrap");
  });
});
