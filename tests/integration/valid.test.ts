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
    expect(result.mode).toMatchObject({
      active: "Developer",
      source: "defaulted",
    });
  });

  it("reports write readiness separately from read-only readiness", async () => {
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
      "write",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--skill-dir",
      skillDir,
      "--json",
    ]);

    expect(result.status).toBe("partial");
    expect(result.data).toMatchObject({
      workflow: "write",
      partialIssues: [
        expect.objectContaining({ code: "write-permission-unverified" }),
      ],
      nextSafeCommand: expect.stringContaining("lark-bitable write"),
    });
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

  it("reports explicit QA mode and verify readiness guidance", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "valid-"));
    const authPath = join(cwd, "auth.json");
    const skillDir = join(cwd, "skills");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    const store = new ConfigStore({ cwd });
    store.setSource(fixtureSource);
    store.setActiveMode({ mode: "QA" });
    await installBootstrapSkill({ targetDir: skillDir });

    const result = await ValidCommand.run([
      "--workflow",
      "verify",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--skill-dir",
      skillDir,
      "--json",
    ]);

    expect(result.mode).toMatchObject({
      active: "QA",
      source: "explicit",
    });
    expect(result.status).toBe("partial");
    expect(JSON.stringify(result)).toContain("missing-selection");
    expect(JSON.stringify(result)).toContain("lark-bitable verify <record-id>");
  });

  it("blocks verify in Developer mode and warns when research runs in QA mode", async () => {
    const developerCwd = await mkdtemp(join(tmpdir(), "valid-"));
    const developerAuthPath = join(developerCwd, "auth.json");
    const developerSkillDir = join(developerCwd, "skills");
    await new AuthStore(developerAuthPath).write({
      ...readyAuthSession,
      storagePath: developerAuthPath,
    });
    const developerStore = new ConfigStore({ cwd: developerCwd });
    developerStore.setSource(fixtureSource);
    await installBootstrapSkill({ targetDir: developerSkillDir });

    const developerVerify = await ValidCommand.run([
      "--workflow",
      "verify",
      "--config-cwd",
      developerCwd,
      "--auth-path",
      developerAuthPath,
      "--skill-dir",
      developerSkillDir,
      "--json",
    ]);
    expect(developerVerify.status).toBe("error");
    expect(JSON.stringify(developerVerify)).toContain("wrong-mode");

    const qaCwd = await mkdtemp(join(tmpdir(), "valid-"));
    const qaAuthPath = join(qaCwd, "auth.json");
    const qaSkillDir = join(qaCwd, "skills");
    await new AuthStore(qaAuthPath).write({
      ...readyAuthSession,
      storagePath: qaAuthPath,
    });
    const qaStore = new ConfigStore({ cwd: qaCwd });
    qaStore.setSource(fixtureSource);
    qaStore.setActiveMode({ mode: "QA" });
    await installBootstrapSkill({ targetDir: qaSkillDir });

    const qaResearch = await ValidCommand.run([
      "--workflow",
      "research",
      "--config-cwd",
      qaCwd,
      "--auth-path",
      qaAuthPath,
      "--skill-dir",
      qaSkillDir,
      "--json",
    ]);
    expect(JSON.stringify(qaResearch)).toContain("qa-mode-research");
  });
});
