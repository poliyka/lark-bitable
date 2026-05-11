import { mkdtemp, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import LarkCommand from "../../src/cli/commands/lark.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";

describe("lark auth command", () => {
  it("logs in through authorization-code mode under the lark-bitable binary", async () => {
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

  it("prints an SSO authorization URL and exchanges the resulting code", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-sso-"));
    const authPath = join(dir, "auth.json");

    const result = await LarkCommand.run([
      "--login",
      "--auth-mode",
      "sso",
      "--domain",
      "larksuite.com",
      "--app-id",
      "cli-app",
      "--app-secret",
      "cli-secret",
      "--redirect-uri",
      "http://127.0.0.1:14543/callback",
      "--state",
      "state-123",
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

    const serialized = JSON.stringify(result);
    expect(serialized).toContain("single-sign-on");
    expect(serialized).toContain("https://accounts.larksuite.com");
    expect(serialized).toContain("redirect_uri");
    expect(serialized).toContain("state-123");
    expect(JSON.parse(await readFile(authPath, "utf8")).accessToken).toBe(
      "access-secret",
    );
  });

  it("returns the generated SSO authorization URL when callback code is missing", async () => {
    await expect(
      LarkCommand.run([
        "--login",
        "--auth-mode",
        "sso",
        "--domain",
        "larksuite.com",
        "--app-id",
        "cli-app",
        "--app-secret",
        "cli-secret",
        "--redirect-uri",
        "https://example.com/lark/callback",
        "--auth-path",
        join(tmpdir(), "none.json"),
      ]),
    ).rejects.toMatchObject({
      code: "missing-authorization-code",
      remediation: expect.stringContaining(
        "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
      ),
    });
  });

  it("uses configured Lark app credentials and waits for a local SSO callback", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-sso-callback-"));
    const authPath = join(dir, "auth.json");
    new ConfigStore({ cwd: dir }).setLarkApp({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: 0,
      domain: "larksuite.com",
      updatedAt: "2026-05-08T04:00:00.000Z",
    });

    const result = await LarkCommand.run([
      "--login",
      "--auth-mode",
      "sso",
      "--config-cwd",
      dir,
      "--auth-path",
      authPath,
      "--mock-access-token",
      "access-secret",
      "--mock-refresh-token",
      "refresh-secret",
      "--json",
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).toContain("single-sign-on");
    expect(serialized).toContain("local-callback");
    expect(serialized).not.toContain("cli-secret");
    expect(JSON.parse(await readFile(authPath, "utf8")).accessToken).toBe(
      "access-secret",
    );
  });

  it("starts the local callback server when a configured redirect URI matches the callback origin", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-sso-configured-"));
    const authPath = join(dir, "auth.json");
    const port = await getAvailablePort("127.0.0.1");
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    new ConfigStore({ cwd: dir }).setLarkApp({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: port,
      domain: "larksuite.com",
      redirectUri,
      updatedAt: "2026-05-08T04:00:00.000Z",
    });

    const result = await LarkCommand.run([
      "--login",
      "--auth-mode",
      "sso",
      "--config-cwd",
      dir,
      "--auth-path",
      authPath,
      "--mock-access-token",
      "access-secret",
      "--mock-refresh-token",
      "refresh-secret",
      "--json",
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).toContain("local-callback");
    expect(serialized).toContain(encodeURIComponent(redirectUri));
    expect(JSON.parse(await readFile(authPath, "utf8")).accessToken).toBe(
      "access-secret",
    );
  });

  it("preserves localhost in the SSO redirect URI when that is the registered callback host", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-sso-localhost-"));
    const authPath = join(dir, "auth.json");
    const port = await getAvailablePort("localhost");
    const redirectUri = `http://localhost:${port}/callback`;
    new ConfigStore({ cwd: dir }).setLarkApp({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: port,
      domain: "larksuite.com",
      redirectUri,
      updatedAt: "2026-05-08T04:00:00.000Z",
    });

    const result = await LarkCommand.run([
      "--login",
      "--auth-mode",
      "sso",
      "--config-cwd",
      dir,
      "--auth-path",
      authPath,
      "--mock-access-token",
      "access-secret",
      "--mock-refresh-token",
      "refresh-secret",
      "--json",
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).toContain("local-callback");
    expect(serialized).toContain(encodeURIComponent(redirectUri));
  });

  it("logs out through the same lark-bitable lark command", async () => {
    const path = join(
      await mkdtemp(join(tmpdir(), "lark-logout-")),
      "auth.json",
    );
    const store = new AuthStore(path);
    await store.write({ ...readyAuthSession, storagePath: path });

    const result = await LarkCommand.run([
      "--logout",
      "--auth-path",
      path,
      "--yes",
      "--json",
    ]);

    expect(await store.exists()).toBe(false);
    expect(JSON.stringify(result)).toContain("removed");
  });
});

async function getAvailablePort(host: "127.0.0.1" | "localhost") {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}
