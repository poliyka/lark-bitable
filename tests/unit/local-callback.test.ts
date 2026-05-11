import { describe, expect, it } from "vitest";

import { createLocalSsoServer } from "../../src/lark/local-callback.js";

describe("local Lark SSO callback server", () => {
  it("guides users to check Lark app scope approval when the browser callback never arrives", async () => {
    const server = await createLocalSsoServer({ port: 0 });

    await expect(
      server.waitForCode({
        authorizationUrl:
          "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject({
      code: "sso-callback-timeout",
      remediation: expect.stringContaining("bitable:app:readonly"),
    });
  });
});
