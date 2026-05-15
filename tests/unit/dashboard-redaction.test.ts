import { describe, expect, it } from "vitest";

import {
  dashboardError,
  dashboardOk,
  redactDashboardPayload,
} from "../../src/dashboard/api.js";

describe("dashboard API envelopes and redaction", () => {
  it("wraps successful responses in the shared envelope", () => {
    expect(dashboardOk({ ready: true }, "live")).toMatchObject({
      data: { ready: true },
      dataSource: "live",
      issues: [],
      status: "ok",
    });
  });

  it("wraps errors without leaking secret-like values", () => {
    const response = dashboardError(
      {
        code: "bad-token",
        message: "token=abc123",
        remediation: "replace appSecret=secret-value",
      },
      400,
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.stringify(response.body)).not.toContain("abc123");
    expect(JSON.stringify(response.body)).not.toContain("secret-value");
  });

  it("redacts nested tokens, codes, authorization headers, and app secrets", () => {
    const redacted = redactDashboardPayload({
      auth: {
        accessToken: "access-secret",
        authorization: "Bearer live-token",
        nested: { appSecret: "app-secret-value", code: "oauth-code" },
      },
    });

    expect(JSON.stringify(redacted)).not.toContain("access-secret");
    expect(JSON.stringify(redacted)).not.toContain("live-token");
    expect(JSON.stringify(redacted)).not.toContain("app-secret-value");
    expect(JSON.stringify(redacted)).not.toContain("oauth-code");
  });

  it("redacts token-like values inside arrays and freeform issue text", () => {
    const redacted = redactDashboardPayload({
      headers: [
        "authorization=Bearer top-secret-token",
        "tenant_access_token=tenant-secret",
        "clientToken=client-secret",
      ],
      issues: [
        {
          code: "oauth-code-leak",
          message: "code=temporary-oauth-code",
          remediation: "replace refreshToken=refresh-secret",
        },
      ],
    });

    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain("top-secret-token");
    expect(serialized).not.toContain("tenant-secret");
    expect(serialized).not.toContain("client-secret");
    expect(serialized).not.toContain("temporary-oauth-code");
    expect(serialized).not.toContain("refresh-secret");
  });
});
