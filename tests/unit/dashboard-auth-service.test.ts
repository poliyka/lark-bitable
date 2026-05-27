import { describe, expect, it, vi } from "vitest";

import {
  createDashboardAuthService,
  projectAuthState,
} from "../../src/dashboard/auth-service.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";

async function waitForAuthSession(authStore: AuthStore) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const session = await authStore.read();
    if (session) return session;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return authStore.read();
}

async function waitForMockCall(mock: ReturnType<typeof vi.fn>) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (mock.mock.calls.length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("dashboard auth service", () => {
  it("projects safe auth state without exposing tokens", async () => {
    const paths = await createDashboardTestPaths("dashboard-auth-");
    const authStore = new AuthStore(paths.authPath);
    await authStore.write({ ...readyAuthSession, storagePath: paths.authPath });

    const projected = await projectAuthState(authStore);

    expect(projected.status).toBe("ready");
    expect(JSON.stringify(projected)).not.toContain("access-secret");
    expect(JSON.stringify(projected)).not.toContain("refresh-secret");
  });

  it("starts a login flow and exposes only authorization metadata", async () => {
    const paths = await createDashboardTestPaths("dashboard-auth-");
    const configStore = new ConfigStore({ cwd: paths.configCwd });
    configStore.setLarkApp({
      appId: "cli-app",
      appSecret: "stored-secret",
      callbackPort: 14543,
      domain: "larksuite.com",
      redirectUri: "http://127.0.0.1:14543/callback",
      updatedAt: "2026-05-14T00:00:00.000Z",
    });
    const service = createDashboardAuthService({
      authStore: new AuthStore(paths.authPath),
      configStore,
    });

    const flow = await service.startLogin({
      callbackMode: "manual",
      openBrowser: false,
    });

    expect(flow.authorizationUrl).toContain("client_id=cli-app");
    expect(new URL(flow.authorizationUrl ?? "").searchParams.has("scope")).toBe(
      false,
    );
    expect(flow.status).toBe("waiting");
    expect(JSON.stringify(flow)).not.toContain("stored-secret");
    expect((await service.loginStatus(flow.flowId)).status).toBe("waiting");
  });

  it("stores the requested dashboard login scopes when Lark omits scopes from the token exchange response", async () => {
    const exchangeAuthorizationCode = vi.fn(async () => ({
      accessToken: "access-secret",
      expiresAt: "2099-05-07T12:00:00.000Z",
      refreshToken: "refresh-secret",
    }));
    const paths = await createDashboardTestPaths("dashboard-auth-");
    const configStore = new ConfigStore({ cwd: paths.configCwd });
    configStore.setLarkApp({
      appId: "cli-app",
      appSecret: "stored-secret",
      callbackPort: 0,
      domain: "larksuite.com",
      updatedAt: "2026-05-14T00:00:00.000Z",
    });
    const authStore = new AuthStore(paths.authPath);
    const service = createDashboardAuthService({
      authStore,
      configStore,
      exchangeAuthorizationCode,
    });

    const flow = await service.startLogin({
      callbackMode: "local",
      openBrowser: false,
      scopes: ["bitable:app"],
    });
    const redirectUri = new URL(flow.authorizationUrl ?? "").searchParams.get(
      "redirect_uri",
    );
    expect(redirectUri).toBeTruthy();

    const callbackResponse = await fetch(`${redirectUri}?code=auth-code`, {
      headers: { connection: "close" },
    });
    expect(callbackResponse.status).toBe(200);
    await callbackResponse.text();
    await waitForMockCall(exchangeAuthorizationCode);
    expect(exchangeAuthorizationCode).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "auth-code",
      }),
    );
    const session = await waitForAuthSession(authStore);

    expect(session?.scopes).toEqual(["bitable:app"]);
  });

  it("logs out and reports missing auth state", async () => {
    const paths = await createDashboardTestPaths("dashboard-auth-");
    const authStore = new AuthStore(paths.authPath);
    await authStore.write({ ...readyAuthSession, storagePath: paths.authPath });

    const service = createDashboardAuthService({
      authStore,
      configStore: new ConfigStore({ cwd: paths.configCwd }),
    });

    expect((await service.logout()).auth.status).toBe("missing");
    expect(await authStore.exists()).toBe(false);
  });
});
