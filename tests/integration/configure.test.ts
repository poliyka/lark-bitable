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
      "--json",
    ]);

    expect(JSON.stringify(result)).toContain("tblp8ig36Itp0yOU");
    expect(
      new ConfigStore({ cwd, projectName: "lark-bitable" }).getSource(),
    ).toMatchObject({
      name: "bugs",
      tableId: "tblp8ig36Itp0yOU",
      viewId: "vewb6FrjBe",
    });
    expect(result.data?.active).not.toHaveProperty("statusField");
    expect(result.data?.active).not.toHaveProperty("actionableStatus");
    expect(result.data?.active).not.toHaveProperty("priorityField");
    expect(
      new ConfigStore({ cwd, projectName: "lark-bitable" }).getSource(),
    ).not.toHaveProperty("actionableStatus");
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

  it("guides humans through source and Lark app without bug field mapping choices", async () => {
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
          throw new Error(`unexpected rawlist prompt: ${message}`);
        },
      ),
    }));
    vi.doMock("../../src/lark/field-discovery.js", () => ({
      discoverBitableFieldsWithAppCredentials: vi.fn(async () => {
        throw new Error("configure should not discover bug field mappings");
      }),
      discoverBitableFieldValuesWithAppCredentials: vi.fn(async () => {
        throw new Error("configure should not discover actionable values");
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
      tableId: "tblp8ig36Itp0yOU",
      viewId: "vewb6FrjBe",
    });
    expect(store.getSource()).not.toHaveProperty("statusField");
    expect(store.getSource()).not.toHaveProperty("actionableStatus");
    expect(store.getSource()).not.toHaveProperty("priorityField");
    expect(store.getSource()).not.toHaveProperty("fieldAliases");
    expect(store.getLarkApp()).toMatchObject({
      appId: "cli-app",
      appSecret: "cli-secret",
      redirectUri: "http://127.0.0.1:14543/callback",
    });
    expect(rawlistPrompts).toHaveLength(1);
    expect(rawlistPrompts.map((prompt) => prompt.message)).toEqual([
      "Choose workflow mode",
    ]);
    expect(inputPrompts).not.toContain("Actionable status value");
    expect(
      inputPrompts.some((message) => message.includes("Default owner")),
    ).toBe(false);
    expect(result.data).not.toHaveProperty("fieldDiscovery");
    expect(JSON.stringify(result)).not.toContain("cli-secret");
  });

  it("does not call field discovery during interactive configure", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "lark-configure-"));
    const inputPrompts: string[] = [];
    const fieldDiscovery = vi.fn(async () => {
      throw new Error("field discovery should not be called");
    });

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
      discoverBitableFieldsWithAppCredentials: fieldDiscovery,
      discoverBitableFieldValuesWithAppCredentials: vi.fn(async () => []),
    }));

    const { default: InteractiveConfigureCommand } =
      await import("../../src/cli/commands/configure.js");

    const result = await InteractiveConfigureCommand.run(["--config-cwd", cwd]);

    expect(result.status).toBe("ok");
    expect(fieldDiscovery).not.toHaveBeenCalled();
    expect(
      new ConfigStore({ cwd, projectName: "lark-bitable" }).getSource(),
    ).toMatchObject({
      tableId: "tblp8ig36Itp0yOU",
      viewId: "vewb6FrjBe",
    });
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
      updatedAt: new Date().toISOString(),
    });
    store.setLarkApp({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: 15432,
      domain: "feishu.cn",
      redirectUri: "http://127.0.0.1:15432/callback",
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
      discoverBitableFieldsWithAppCredentials: vi.fn(async () => {
        throw new Error("field discovery should not be called");
      }),
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
      tableId: "tblp8ig36Itp0yOU",
      viewId: "vewb6FrjBe",
    });
    expect(storedSource).not.toHaveProperty("actionableStatus");
    expect(storedSource).not.toHaveProperty("fieldAliases");
    expect(storedSource).not.toHaveProperty("priorityField");
    expect(storedSource).not.toHaveProperty("statusField");
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
    expect(rawlistPrompts).toEqual([
      expect.objectContaining({
        default: "Developer",
        message: "Choose workflow mode",
      }),
    ]);
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
