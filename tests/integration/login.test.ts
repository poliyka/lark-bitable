import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import LarkCommand from "../../src/cli/commands/lark.js";
import { readAuditEntries } from "../fixtures/audit.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("login command", () => {
  it("writes redacted auth state from a mock authorization code exchange", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-login-"));
    const authPath = join(dir, "auth.json");
    const auditPath = join(dir, "logs", "audit.json");

    const result = await LarkCommand.run([
      "--login",
      "--auth-mode",
      "code",
      "--domain",
      "larksuite.com",
      "--account",
      "qa-user@example.com",
      "--app-id",
      "cli-app",
      "--app-secret",
      "cli-secret",
      "--code",
      "mock-code",
      "--mock-access-token",
      "access-secret",
      "--mock-refresh-token",
      "refresh-secret",
      "--auth-path",
      authPath,
      "--audit-path",
      auditPath,
      "--json",
    ]);

    const raw = await readFile(authPath, "utf8");
    const auditEntries = await readAuditEntries(auditPath);
    const output = JSON.stringify(result);

    expect(JSON.parse(raw).accessToken).toBe("access-secret");
    expect(output).not.toContain("access-secret");
    expect(output).not.toContain("refresh-secret");
    expect(output).toContain("ready");
    expect(output).toContain("authorization-code");
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({
      command: "lark",
      status: "ok",
      auth: {
        status: "ready",
      },
    });
    expect(JSON.stringify(auditEntries)).not.toContain("mock-code");
    expect(JSON.stringify(auditEntries)).not.toContain("access-secret");
    expect(JSON.stringify(auditEntries)).not.toContain("refresh-secret");
  });

  it("records failed login attempts without exposing authorization secrets", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-login-error-"));
    const auditPath = join(dir, "logs", "audit.json");

    await expect(
      LarkCommand.run([
        "--login",
        "--cancel",
        "--auth-path",
        join(dir, "auth.json"),
        "--audit-path",
        auditPath,
        "--code",
        "secret-code",
      ]),
    ).rejects.toThrow("Login was canceled");

    const auditEntries = await readAuditEntries(auditPath);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({
      command: "larkcommand",
      status: "error",
      issues: [expect.objectContaining({ code: "login-canceled" })],
    });
    expect(JSON.stringify(auditEntries)).not.toContain("secret-code");
  });

  it("fails closed when the interactive flow is canceled", async () => {
    await expect(
      LarkCommand.run([
        "--login",
        "--cancel",
        "--auth-path",
        join(tmpdir(), "none.json"),
      ]),
    ).rejects.toThrow("Login was canceled");
  });

  it("fails closed without an authorization code in non-interactive mode", async () => {
    await expect(
      LarkCommand.run([
        "--login",
        "--auth-mode",
        "code",
        "--app-id",
        "cli-app",
        "--app-secret",
        "cli-secret",
        "--auth-path",
        join(tmpdir(), "none.json"),
      ]),
    ).rejects.toThrow("No Lark authorization code was provided");
  });

  it("fails closed when live exchange credentials are missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-login-missing-creds-"));

    vi.stubEnv("LARK_APP_ID", "");
    vi.stubEnv("LARK_APP_SECRET", "");

    await expect(
      LarkCommand.run([
        "--login",
        "--auth-mode",
        "code",
        "--domain",
        "larksuite.com",
        "--account",
        "qa-user@example.com",
        "--code",
        "mock-code",
        "--config-cwd",
        dir,
        "--auth-path",
        join(tmpdir(), "none.json"),
      ]),
    ).rejects.toThrow("Lark app credentials are required for live login");
  });

  it("can exchange with app credentials when live authorization is available", async () => {
    const appSecret = process.env.LARK_TEST_APP_SECRET;
    const authCode = process.env.LARK_TEST_AUTH_CODE;
    if (!appSecret || !authCode) return;

    const dir = await mkdtemp(join(tmpdir(), "lark-login-live-"));
    const authPath = join(dir, "auth.json");
    const result = await LarkCommand.run([
      "--login",
      "--auth-mode",
      "code",
      "--domain",
      "larksuite.com",
      "--account",
      "qa-user@example.com",
      "--app-id",
      process.env.LARK_TEST_APP_ID ?? "cli-app",
      "--app-secret",
      appSecret,
      "--code",
      authCode,
      "--auth-path",
      authPath,
      "--json",
    ]);

    const raw = await readFile(authPath, "utf8");
    const output = JSON.stringify(result);
    const stored = JSON.parse(raw) as { accessToken: string };

    expect(stored.accessToken).toBeTruthy();
    expect(output).not.toContain(stored.accessToken);
    expect(output).toContain("ready");
  });
});
