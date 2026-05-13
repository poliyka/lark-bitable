import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import ConfigureCommand from "../../src/cli/commands/configure.js";
import { ConfigStore } from "../../src/config/store.js";
import { readAuditEntries } from "../fixtures/audit.js";

const validUrl =
  "https://u5ijellsw5.sg.larksuite.com/base/TypDbjKBfaJcaSsoEI1lZjHsgIY?table=tblp8ig36Itp0yOU&view=vewb6FrjBe";

const stdinIsTtyDescriptor = Object.getOwnPropertyDescriptor(
  process.stdin,
  "isTTY",
);

afterEach(() => {
  vi.doUnmock("@inquirer/prompts");
  vi.doUnmock("../../src/lark/field-discovery.js");
  vi.resetModules();
  if (stdinIsTtyDescriptor) {
    Object.defineProperty(process.stdin, "isTTY", stdinIsTtyDescriptor);
  }
});

describe("configure command", () => {
  it("stores a new source and returns parsed identity", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "lark-configure-"));

    const result = await ConfigureCommand.run([
      validUrl,
      "--config-cwd",
      cwd,
      "--name",
      "bugs",
      "--status-field",
      "狀態",
      "--priority-field",
      "優先級",
      "--title-field",
      "標題",
      "--json",
    ]);

    expect(JSON.stringify(result)).toContain("tblp8ig36Itp0yOU");
    expect(
      new ConfigStore({ cwd, projectName: "lark-bitable" }).getSource(),
    ).toMatchObject({
      name: "bugs",
      statusField: "狀態",
      priorityField: "優先級",
    });
  });

  it("does not mutate previous config when the URL is invalid", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "lark-configure-"));
    const store = new ConfigStore({ cwd, projectName: "lark-bitable" });
    await ConfigureCommand.run([validUrl, "--config-cwd", cwd, "--json"]);

    await expect(
      ConfigureCommand.run([
        "https://example.com/base/app?table=tbl",
        "--config-cwd",
        cwd,
      ]),
    ).rejects.toThrow();

    expect(store.getSource()?.tableId).toBe("tblp8ig36Itp0yOU");
  });

  it("clears an existing source", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "lark-configure-"));
    await ConfigureCommand.run([validUrl, "--config-cwd", cwd, "--json"]);

    const result = await ConfigureCommand.run([
      "--clear",
      "--config-cwd",
      cwd,
      "--json",
    ]);

    expect(JSON.stringify(result)).toContain("cleared");
    expect(
      new ConfigStore({ cwd, projectName: "lark-bitable" }).getSource(),
    ).toBeUndefined();
  });

  it("stores Lark app OAuth settings without exposing the app secret", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "lark-configure-"));
    const auditPath = join(cwd, "logs", "audit.json");

    const result = await ConfigureCommand.run([
      validUrl,
      "--config-cwd",
      cwd,
      "--audit-path",
      auditPath,
      "--lark-app-id",
      "cli-app",
      "--lark-app-secret",
      "cli-secret",
      "--lark-callback-port",
      "14543",
      "--lark-redirect-uri",
      "http://127.0.0.1:14543/callback",
      "--json",
    ]);

    const output = JSON.stringify(result);
    const stored = new ConfigStore({
      cwd,
      projectName: "lark-bitable",
    }).getLarkApp();

    expect(stored).toMatchObject({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: 14543,
      redirectUri: "http://127.0.0.1:14543/callback",
    });
    expect(output).toContain("larkApp");
    expect(output).toContain("http://127.0.0.1:14543/callback");
    expect(output).not.toContain("cli-secret");

    const entries = await readAuditEntries(auditPath);
    expect(entries).toEqual([
      expect.objectContaining({
        command: "configure",
        status: "ok",
        retentionApplied: {
          retentionDays: 14,
          prunedEntries: 0,
        },
      }),
    ]);
    expect(JSON.stringify(entries)).not.toContain("cli-secret");
  });

  it("guides humans through source, Lark app, and numbered field mapping choices", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "lark-configure-"));
    const rawlistPrompts: Array<{
      choices: Array<{ name?: string; value: string }>;
      default?: string;
      message: string;
    }> = [];
    const inputPrompts: string[] = [];

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    vi.doMock("@inquirer/prompts", () => ({
      input: vi.fn(
        async ({ message }: { message: string; default?: string }) => {
          inputPrompts.push(message);
          if (message.includes("redirect URI")) {
            return "http://127.0.0.1:14543/callback";
          }
          if (message.includes("Default owner")) return "";
          if (message.includes("URL")) return validUrl;
          if (message.includes("app id")) return "cli-app";
          throw new Error(`unexpected prompt: ${message}`);
        },
      ),
      password: vi.fn(async () => "cli-secret"),
      rawlist: vi.fn(
        async ({
          choices,
          default: defaultValue,
          message,
        }: {
          choices: Array<{ name?: string; value: string }>;
          default?: string;
          message: string;
        }) => {
          rawlistPrompts.push({ choices, default: defaultValue, message });
          if (message.includes("workflow mode")) return "Developer";
          if (message.includes("status field")) return "狀態";
          if (message.includes("priority")) return "優先級";
          if (message.includes("title")) return "標題";
          if (message.includes("owner field")) return "__none__";
          if (message.includes("Actionable status")) return "待處理";
          throw new Error(`unexpected rawlist prompt: ${message}`);
        },
      ),
    }));
    vi.doMock("../../src/lark/field-discovery.js", () => ({
      discoverBitableFieldsWithAppCredentials: vi.fn(async () => [
        { fieldName: "標題", type: 1 },
        {
          fieldName: "狀態",
          options: [{ name: "待處理" }, { name: "處理中" }, { name: "已完成" }],
          type: 3,
        },
        { fieldName: "優先級", type: 3 },
        { fieldName: "描述", type: 1 },
      ]),
      discoverBitableFieldValuesWithAppCredentials: vi.fn(async () => {
        throw new Error("record values should not be read when options exist");
      }),
    }));

    const { default: InteractiveConfigureCommand } =
      await import("../../src/cli/commands/configure.js");

    const result = await InteractiveConfigureCommand.run(["--config-cwd", cwd]);

    const store = new ConfigStore({
      cwd,
      projectName: "lark-bitable",
    });

    expect(store.getSource()).toMatchObject({
      statusField: "狀態",
      priorityField: "優先級",
      actionableStatus: "待處理",
      fieldAliases: {
        title: "標題",
      },
    });
    expect(store.getLarkApp()).toMatchObject({
      appId: "cli-app",
      appSecret: "cli-secret",
      redirectUri: "http://127.0.0.1:14543/callback",
    });
    expect(rawlistPrompts).toHaveLength(6);
    expect(rawlistPrompts.map((prompt) => prompt.message)).toEqual([
      "Choose workflow mode",
      "Choose the bug status field",
      "Choose the bug priority field",
      "Choose the bug title field",
      "Choose the optional owner field",
      "Actionable status value",
    ]);
    for (const prompt of rawlistPrompts.slice(1, 4)) {
      expect(prompt.choices.map((choice) => choice.name)).toEqual([
        "標題",
        "狀態",
        "優先級",
        "描述",
      ]);
    }
    expect(rawlistPrompts[5]?.choices.map((choice) => choice.name)).toEqual([
      "待處理",
      "處理中",
      "已完成",
    ]);
    expect(inputPrompts).not.toContain("Actionable status value");
    expect(
      inputPrompts.some((message) => message.includes("Default owner")),
    ).toBe(false);
    expect(result.data).toMatchObject({
      fieldDiscovery: {
        actionableValuesReturned: 3,
        fieldsReturned: 4,
        status: "ready",
      },
    });
    expect(JSON.stringify(result)).not.toContain("cli-secret");
  });

  it("stops interactive field mapping when Lark field discovery fails instead of asking humans to type field names", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "lark-configure-"));
    const inputPrompts: string[] = [];

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    vi.doMock("@inquirer/prompts", () => ({
      input: vi.fn(
        async ({ message }: { message: string; default?: string }) => {
          inputPrompts.push(message);
          if (message.includes("redirect URI")) {
            return "http://127.0.0.1:14543/callback";
          }
          if (message.includes("URL")) return validUrl;
          if (message.includes("app id")) return "cli-app";
          throw new Error(`unexpected prompt: ${message}`);
        },
      ),
      password: vi.fn(async () => "cli-secret"),
      rawlist: vi.fn(async ({ message }: { message: string }) => {
        if (message.includes("workflow mode")) return "Developer";
        throw new Error("field choices should not be shown");
      }),
    }));
    vi.doMock("../../src/lark/field-discovery.js", () => ({
      discoverBitableFieldsWithAppCredentials: vi.fn(async () => {
        throw new Error(
          "Lark field list failed with HTTP 400: code=99991672 msg=Access denied. One of the following scopes is required: [bitable:app:readonly, bitable:app, base:field:read]",
        );
      }),
      discoverBitableFieldValuesWithAppCredentials: vi.fn(async () => []),
    }));

    const { default: InteractiveConfigureCommand } =
      await import("../../src/cli/commands/configure.js");

    let caughtError: unknown;
    try {
      await InteractiveConfigureCommand.run(["--config-cwd", cwd]);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toMatchObject({
      code: "field-discovery-required",
      remediation: expect.stringContaining("base:field:read"),
    });
    expect(caughtError).toMatchObject({
      remediation: expect.stringContaining("application-identity"),
    });
    expect(caughtError).toMatchObject({
      remediation: expect.stringContaining("tenant_access_token"),
    });
    expect(caughtError).toMatchObject({
      remediation: expect.stringContaining(
        "User-identity bitable:app:readonly",
      ),
    });
    expect(
      new ConfigStore({ cwd, projectName: "lark-bitable" }).getSource(),
    ).toBeUndefined();
    expect(inputPrompts).not.toContain("Bug status field");
    expect(inputPrompts).not.toContain("Bug priority field");
    expect(inputPrompts).not.toContain("Bug title field");
  });

  it("offers stored interactive values as defaults and reuses them when the user presses Enter", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "lark-configure-"));
    const store = new ConfigStore({
      cwd,
      projectName: "lark-bitable",
    });
    store.setSource({
      sourceUrl: validUrl,
      appToken: "TypDbjKBfaJcaSsoEI1lZjHsgIY",
      tableId: "tblp8ig36Itp0yOU",
      viewId: "vewb6FrjBe",
      statusField: "既有狀態",
      actionableStatus: "既有待處理",
      priorityField: "既有優先級",
      fieldAliases: {
        title: "既有標題",
      },
      updatedAt: new Date().toISOString(),
    });
    store.setLarkApp({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: 15432,
      domain: "feishu.cn",
      redirectUri: "http://127.0.0.1:15432/callback",
      scopes: ["bitable:app:readonly"],
      updatedAt: new Date().toISOString(),
    });

    const inputPrompts: Array<{
      default?: string;
      message: string;
      required?: boolean;
    }> = [];
    const passwordPrompts: Array<{
      default?: string;
      message: string;
    }> = [];
    const rawlistPrompts: Array<{
      choices: Array<{ name?: string; value: string }>;
      default?: string;
      message: string;
    }> = [];

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    vi.doMock("@inquirer/prompts", () => ({
      input: vi.fn(
        async (prompt: {
          default?: string;
          message: string;
          required?: boolean;
        }) => {
          inputPrompts.push(prompt);
          return "";
        },
      ),
      password: vi.fn(async (prompt: { default?: string; message: string }) => {
        passwordPrompts.push(prompt);
        return "";
      }),
      rawlist: vi.fn(
        async ({
          choices,
          default: defaultValue,
          message,
        }: {
          choices: Array<{ name?: string; value: string }>;
          default?: string;
          message: string;
        }) => {
          rawlistPrompts.push({ choices, default: defaultValue, message });
          if (defaultValue) return defaultValue;
          throw new Error(`missing default for prompt: ${message}`);
        },
      ),
    }));
    vi.doMock("../../src/lark/field-discovery.js", () => ({
      discoverBitableFieldsWithAppCredentials: vi.fn(async () => [
        {
          fieldName: "既有狀態",
          options: [
            { name: "既有待處理" },
            { name: "處理中" },
            { name: "已完成" },
          ],
          type: 3,
        },
        { fieldName: "既有優先級", type: 3 },
        { fieldName: "既有標題", type: 1 },
        { fieldName: "描述", type: 1 },
      ]),
      discoverBitableFieldValuesWithAppCredentials: vi.fn(async () => {
        throw new Error("record values should not be read when options exist");
      }),
    }));

    const { default: InteractiveConfigureCommand } =
      await import("../../src/cli/commands/configure.js");

    const result = await InteractiveConfigureCommand.run(["--config-cwd", cwd]);
    const storedSource = store.getSource();
    const storedApp = store.getLarkApp();

    expect(storedSource).toMatchObject({
      actionableStatus: "既有待處理",
      fieldAliases: {
        title: "既有標題",
      },
      priorityField: "既有優先級",
      statusField: "既有狀態",
    });
    expect(storedApp).toMatchObject({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: 15432,
      domain: "feishu.cn",
      redirectUri: "http://127.0.0.1:15432/callback",
    });
    expect(inputPrompts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          default: validUrl,
          message: "Paste the Lark Base/Bitable URL",
        }),
        expect.objectContaining({
          default: "cli-app",
          message: "Lark app id for login",
        }),
        expect.objectContaining({
          default: "http://127.0.0.1:15432/callback",
          message:
            "Lark OAuth redirect URI from Developer Console > Security Settings > Redirect URL, not the event callback URL",
        }),
      ]),
    );
    expect(rawlistPrompts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          default: "既有狀態",
          message: "Choose the bug status field",
        }),
        expect.objectContaining({
          default: "既有優先級",
          message: "Choose the bug priority field",
        }),
        expect.objectContaining({
          default: "既有標題",
          message: "Choose the bug title field",
        }),
        expect.objectContaining({
          default: "既有待處理",
          message: "Actionable status value",
        }),
      ]),
    );
    expect(passwordPrompts).toHaveLength(1);
    expect(passwordPrompts[0]).toMatchObject({
      message:
        "Lark app secret for token exchange (press Enter to keep stored secret)",
    });
    expect(
      inputPrompts.some((prompt) => prompt.message.includes("Default owner")),
    ).toBe(false);
    expect(passwordPrompts[0]).not.toHaveProperty("default");
    expect(JSON.stringify(result)).not.toContain("cli-secret");
  });
});
