import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import LarkCommand from "../../src/cli/commands/lark.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("login command", () => {
  it("writes redacted auth state from a mock authorization code exchange", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-login-"));
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
      "--json",
    ]);

    const raw = await readFile(authPath, "utf8");
    const output = JSON.stringify(result);

    expect(JSON.parse(raw).accessToken).toBe("access-secret");
    expect(output).not.toContain("access-secret");
    expect(output).not.toContain("refresh-secret");
    expect(output).toContain("ready");
    expect(output).toContain("authorization-code");
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
