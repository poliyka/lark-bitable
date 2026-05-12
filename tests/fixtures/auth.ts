import type { LarkAuthSession } from "../../src/config/schema.js";

export const readyAuthSession: LarkAuthSession = {
  storagePath: "~/.lark-bitable/auth.json",
  domain: "larksuite.com",
  accountLabel: "qa-user@example.com",
  appIdentity: "lark-bitable",
  scopes: ["bitable:app:readonly"],
  accessToken: "access-secret",
  refreshToken: "refresh-secret",
  expiresAt: "2099-05-07T12:00:00.000Z",
  status: "ready",
  updatedAt: "2026-05-07T10:00:00.000Z",
};

export const expiredAuthSession: LarkAuthSession = {
  ...readyAuthSession,
  expiresAt: "2026-05-07T09:00:00.000Z",
  status: "expired",
};
