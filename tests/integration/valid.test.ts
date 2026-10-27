import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

import ValidCommand from "../../src/cli/commands/valid.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { installBootstrapSkill } from "../../src/bootstrap/installer.js";
import * as larkAuth from "../../src/lark/auth.js";
import { expiredAuthSession, readyAuthSession } from "../fixtures/auth.js";
import { fixtureSource } from "../fixtures/lark.js";

describe("valid command", () => {
  it.each([
    {
      name: "Error.message with known credentials",
      error: new Error(
        "refresh denied: b01-access-sensitive b01-refresh-sensitive b01-app-sensitive",
      ),
      summary: "refresh denied:",
    },
    {
      name: "Lark error code with a sensitive payload",
      error: {
        code: 99991663,
        msg: "b01-access-sensitive b01-refresh-sensitive b01-app-sensitive",
        access_token: "b01-access-sensitive",
      },
      summary: "99991663",
    },
    {
      name: "Error.message containing an unknown 40-character token",
      error: new Error(
        "request failed: 0123456789abcdefghijklmnopqrstuvwxyzABCD",
      ),
      summary: "Error",
    },
    {
      name: "refresh token expired",
      error: new Error("refresh token expired"),
      summary: "Error",
    },
    {
      name: "unknown short credential values in JSON",
      error: new Error(
        'request failed: {"access_token":"unknown-sensitive-access","refresh_token":"unknown-sensitive-refresh","app_secret":"unknown-sensitive-app"}',
      ),
      summary: "Error",
    },
    {
      name: "unknown 31-character refresh token in prose",
      error: new Error(`refresh token value ${"Z".repeat(31)} expired`),
      summary: "Error",
    },
  ])("reports refresh failure safely for $name", async ({ error, summary }) => {
    const cwd = await mkdtemp(join(tmpdir(), "valid-refresh-"));
    const authPath = join(cwd, "auth.json");
    const skillDir = join(cwd, "skills");
    await new AuthStore(authPath).write({
      ...expiredAuthSession,
      storagePath: authPath,
      accessToken: "b01-access-sensitive",
      refreshToken: "b01-refresh-sensitive",
    });
    const store = new ConfigStore({ cwd });
    store.setSource(fixtureSource);
    store.setLarkApp({
      appId: "b01-app",
      appSecret: "b01-app-sensitive",
      callbackPort: 14543,
      domain: "larksuite.com",
      updatedAt: "2026-10-27T00:00:00.000Z",
    });
    await installBootstrapSkill({ targetDir: skillDir });
    const refresh = vi
      .spyOn(larkAuth, "ensureReadyAuthSession")
      .mockRejectedValue(error);
    try {
      const result = await ValidCommand.run([
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--skill-dir",
        skillDir,
        "--json",
      ]);
      expect(result.status).toBe("error");
      expect(result.issues).toEqual([
        expect.objectContaining({
          code: "auth-refresh-failed",
          message: expect.stringContaining(
            `Lark auth refresh failed: ${summary}`,
          ),
          remediation:
            "Retry the command; if it still fails, run lark-bitable lark --login",
        }),
      ]);
      expect(result.data).toMatchObject({
        status: "blocked",
        blockingIssues: [
          expect.objectContaining({ code: "auth-refresh-failed" }),
        ],
      });
      const serialized = JSON.stringify(result);
      for (const secret of [
        "b01-access-sensitive",
        "b01-refresh-sensitive",
        "b01-app-sensitive",
        "unexpected-token",
        "unexpected-refresh",
        "unexpected-secret",
        "0123456789abcdefghijklmnopqrstuvwxyzABCD",
        "unknown-sensitive-access",
        "unknown-sensitive-refresh",
        "unknown-sensitive-app",
        "Z".repeat(31),
      ]) {
        expect(serialized).not.toContain(secret);
      }
      expect(serialized).not.toContain("auth-expired");
      expect(serialized).not.toContain("configure");
    } finally {
      refresh.mockRestore();
    }
  });

  it("keeps configure remediation for expired auth when app credentials are missing", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "valid-expired-"));
    const authPath = join(cwd, "auth.json");
    const skillDir = join(cwd, "skills");
    await new AuthStore(authPath).write({
      ...expiredAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);
    await installBootstrapSkill({ targetDir: skillDir });
    vi.stubEnv("LARK_APP_ID", "");
    vi.stubEnv("LARK_APP_SECRET", "");
    try {
      const result = await ValidCommand.run([
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--skill-dir",
        skillDir,
        "--json",
      ]);
      expect(result.issues).toEqual([
        expect.objectContaining({
          code: "auth-expired",
          remediation: expect.stringContaining("configure"),
        }),
      ]);
      expect(JSON.stringify(result)).not.toContain("auth-refresh-failed");
    } finally {
      vi.unstubAllEnvs();
    }
  });

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
        expect.objectContaining({
          code: "write-permission-not-probed",
          message: expect.stringContaining(
            "does not perform a committed write",
          ),
        }),
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
