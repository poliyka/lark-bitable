import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ConfigDraftInput } from "../../src/dashboard/schemas.js";
import { fixtureSource } from "./lark.js";

export interface DashboardTestPaths {
  auditPath: string;
  authPath: string;
  configCwd: string;
  home: string;
  researchDir: string;
  runtimePath: string;
  root: string;
}

export async function createDashboardTestPaths(
  prefix = "dashboard-",
): Promise<DashboardTestPaths> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const home = join(root, "home");
  return {
    auditPath: join(home, ".lark-bitable", "logs", "audit.json"),
    authPath: join(home, ".lark-bitable", "auth.json"),
    configCwd: join(home, ".lark-bitable"),
    home,
    researchDir: join(home, ".lark-bitable", "research"),
    runtimePath: join(home, ".lark-bitable", "dashboard", "runtime.json"),
    root,
  };
}

export async function fetchDashboardJson<T>(
  origin: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(new URL(path, origin), {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  return (await response.json()) as T;
}

export const configDraftFixture: ConfigDraftInput = {
  sourceUrl: fixtureSource.sourceUrl,
  sourceName: "Project Bugs",
  mode: "Developer",
  larkAppId: "cli-app-id",
  larkAppSecret: "cli-secret-value",
  larkDomain: "larksuite.com",
  redirectUri: "http://127.0.0.1:14543/callback",
  callbackPort: 14543,
  scopes: ["bitable:app:readonly"],
  statusField: "狀態",
  priorityField: "優先級",
  titleField: "標題",
  ownerField: "負責人",
  actionableStatus: "待處理",
  defaultOwner: "openclaw",
};
