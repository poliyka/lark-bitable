import { describe, expect, it } from "vitest";

import {
  exchangeAuthorizationCode,
  refreshAuthorizationToken,
} from "../../src/lark/auth.js";

describe("Lark auth adapter", () => {
  it("exchanges a Lark authorization code through the official SDK", async () => {
    const calls: unknown[] = [];
    const sdk = {
      authen: {
        accessToken: {
          async create(payload: unknown) {
            calls.push(payload);
            return {
              code: 0,
              data: {
                access_token: "live-access",
                refresh_token: "live-refresh",
                expires_in: 7200,
                refresh_expires_in: 604800,
                email: "qa-user@example.com",
              },
            };
          },
        },
      },
    };

    const result = await exchangeAuthorizationCode({
      code: "auth-code",
      sdk,
    });

    expect(result.accessToken).toBe("live-access");
    expect(result.refreshToken).toBe("live-refresh");
    expect(result.expiresAt).toBeDefined();
    expect(result.accountLabel).toBe("qa-user@example.com");
    expect(JSON.stringify(calls)).toContain("authorization_code");
    expect(JSON.stringify(calls)).toContain("auth-code");
  });

  it("refreshes a stored user token through the official SDK", async () => {
    const sdk = {
      authen: {
        refreshAccessToken: {
          async create() {
            return {
              code: 0,
              data: {
                access_token: "new-access",
                refresh_token: "new-refresh",
                expires_in: 3600,
              },
            };
          },
        },
      },
    };

    const result = await refreshAuthorizationToken({
      refreshToken: "old-refresh",
      sdk,
    });

    expect(result.accessToken).toBe("new-access");
    expect(result.refreshToken).toBe("new-refresh");
  });

  it("falls back to direct OpenAPI exchange when the SDK omits app credentials", async () => {
    const requests: Array<{ body: Record<string, string>; url: string }> = [];
    const result = await exchangeAuthorizationCode({
      appId: "cli-app",
      appSecret: "cli-secret",
      code: "auth-code",
      httpPost: async (url, body) => {
        requests.push({ url, body });
        return {
          code: 0,
          data: {
            access_token: "direct-access",
            refresh_token: "direct-refresh",
          },
        };
      },
    });

    expect(result.accessToken).toBe("direct-access");
    expect(requests[0]?.url).toContain("/open-apis/authen/v1/access_token");
    expect(requests[0]?.body).toMatchObject({
      app_id: "cli-app",
      app_secret: "cli-secret",
      code: "auth-code",
      grant_type: "authorization_code",
    });
  });
});
