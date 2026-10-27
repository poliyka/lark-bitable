import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ConfigureCommand from "../../src/cli/commands/configure.js";
import GetCommand from "../../src/cli/commands/get.js";
import FilterCommand from "../../src/cli/commands/filter.js";
import ListCommand from "../../src/cli/commands/list.js";
import SearchCommand from "../../src/cli/commands/search.js";
import SchemaCommand from "../../src/cli/commands/schema.js";
import WriteCommand from "../../src/cli/commands/write.js";
import { resolveCommandSource } from "../../src/cli/source-selection.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import * as larkClient from "../../src/lark/client.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureSource } from "../fixtures/lark.js";

const scratch = join(
  homedir(),
  "scratchpad/lark-bitable-perf-20261027/c01-writer",
);
const profileUrl =
  "https://example.larksuite.com/base/appRequirements?table=tblRequirements&view=vewRequirements";
let cwd: string;

beforeEach(async () => {
  await mkdir(scratch, { recursive: true });
  cwd = await mkdtemp(join(scratch, "profiles-"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(cwd, { recursive: true, force: true });
});

describe("table selection through command transports", () => {
  const createTransport = larkClient.createLarkSdkTransport;
  let authPath: string;
  const getRecord = vi.fn<larkClient.LarkClientTransport["getRecord"]>();
  const listRecords = vi.fn<larkClient.LarkClientTransport["listRecords"]>();
  const recordApi = {
    get: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const fieldApi = { list: vi.fn() };

  beforeEach(async () => {
    authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    const store = new ConfigStore({ cwd });
    store.setSource(fixtureSource);
    store.setTableProfile("req", {
      sourceUrl: profileUrl,
      appToken: "appRequirements",
      tableId: "tblRequirements",
      viewId: "vewRequirements",
      updatedAt: "2026-10-27T00:00:00.000Z",
    });
    getRecord.mockReset();
    listRecords.mockReset();
    recordApi.get.mockReset().mockResolvedValue({
      code: 0,
      data: {
        record: {
          record_id: "recRequirements",
          fields: { 標題: "Requirements", 狀態: "待處理" },
        },
      },
    });
    recordApi.list.mockReset().mockResolvedValue({
      code: 0,
      data: {
        items: [
          {
            record_id: "recRequirements",
            fields: { 標題: "Requirements", 狀態: "待處理" },
          },
        ],
      },
    });
    recordApi.create
      .mockReset()
      .mockRejectedValue(new Error("Preview must not create records"));
    recordApi.update
      .mockReset()
      .mockRejectedValue(new Error("Preview must not update records"));
    fieldApi.list.mockReset().mockResolvedValue({
      code: 0,
      data: {
        items: [
          { field_name: "標題", type: 1 },
          { field_name: "狀態", type: 1 },
        ],
      },
    });
    vi.spyOn(larkClient, "createLarkSdkTransport").mockImplementation(
      (session) => {
        const transport = createTransport(session, {
          sdk: {
            bitable: { appTableRecord: recordApi, appTableField: fieldApi },
          } as never,
        });
        getRecord.mockImplementation(transport.getRecord);
        listRecords.mockImplementation(transport.listRecords);
        return { ...transport, getRecord, listRecords };
      },
    );
  });

  function contextArgs() {
    return ["--config-cwd", cwd, "--auth-path", authPath, "--json"];
  }

  it.each(
    [
      {
        name: "profile",
        flags: ["--table-profile", "req"],
        suffix: " --table-profile req",
        source: { appToken: "appRequirements", tableId: "tblRequirements" },
      },
      {
        name: "URL",
        flags: ["--table", `${profileUrl}&label=Owner's%20notes`],
        suffix:
          " --table 'https://example.larksuite.com/base/appRequirements?table=tblRequirements&view=vewRequirements&label=Owner'\\''s%20notes'",
        source: { appToken: "appRequirements", tableId: "tblRequirements" },
      },
      {
        name: "token",
        flags: ["--table", "tblOnce"],
        suffix: " --table 'tblOnce'",
        source: { appToken: "TypDbjKBfaJcaSsoEI1lZjHsgIY", tableId: "tblOnce" },
      },
    ].flatMap((selection) =>
      ["create", "update"].map((op) => ({ ...selection, op })),
    ),
  )(
    "write $op preserves the original $name selection in preview, success, and unknown follow-ups",
    async ({ flags, suffix, source, op }) => {
      const args = [
        "--op",
        op,
        ...(op === "update" ? ["--record-id", "recRequirements"] : []),
        ...flags,
        "--field",
        "標題=Follow-up",
        ...contextArgs(),
      ];
      const preview = await WriteCommand.run(args);
      expect(preview.source).toMatchObject(source);

      const assertSource = (command: string) => {
        expect(command).toContain(suffix);
        const profile = command.match(
          /--table-profile ([a-z][a-z0-9_-]{0,31})/,
        );
        const table = command.match(/--table '((?:[^']|'\\'')*)'/);
        const resolved = resolveCommandSource(new ConfigStore({ cwd }), {
          tableProfile: profile?.[1],
          table: table?.[1]?.replaceAll("'\\''", "'"),
        });
        expect(resolved).toMatchObject(source);
        expect(resolved.appToken).toBe(preview.source?.appToken);
        expect(resolved.tableId).toBe(preview.source?.tableId);
      };
      const assertFollowUps = (
        output: Awaited<ReturnType<typeof WriteCommand.run>>,
      ) => {
        const data = output.data as {
          nextSafeCommands: string[];
          result: { nextActions: string[] };
        };
        expect(data.nextSafeCommands).toHaveLength(1);
        expect(data.result.nextActions).toHaveLength(1);
        for (const command of [
          ...data.nextSafeCommands,
          ...data.result.nextActions,
        ])
          assertSource(command);
      };
      assertFollowUps(preview);

      const response = {
        code: 0,
        data: {
          record: {
            record_id: "recRequirements",
            fields: { 標題: "Follow-up" },
          },
        },
      };
      recordApi.create.mockResolvedValue(response);
      recordApi.update.mockResolvedValue(response);
      const confirmed = await WriteCommand.run([...args, "--confirm"]);
      expect(confirmed.data).toMatchObject({
        result: { confirmationStatus: "confirmed" },
      });
      assertFollowUps(confirmed);
      const unknown = await WriteCommand.run([
        ...args,
        "--confirm",
        "--mock-confirm-error",
        "Fixture confirmation unavailable",
      ]);
      expect(unknown.data).toMatchObject({
        result: { confirmationStatus: "unknown" },
      });
      assertFollowUps(unknown);
      const unknownData = unknown.data as {
        result: { issues: Array<{ remediation: string }> };
      };
      expect(unknownData.result.issues).toHaveLength(1);
      assertSource(unknownData.result.issues[0]!.remediation);
    },
  );

  it("keeps the original confirm command unchanged when no table selection was supplied", async () => {
    const result = await WriteCommand.run([
      "--op",
      "create",
      "--field",
      "標題=Follow-up",
      ...contextArgs(),
    ]);
    const command = `lark-bitable write --op create --fields-json '{"標題":"Follow-up"}' --confirm --json`;
    expect(result.data).toMatchObject({
      nextSafeCommands: [command],
      result: { nextActions: [command] },
    });
  });

  it("get --table-profile req sends the profile tableId to transport and reports the resolved source", async () => {
    const result = await GetCommand.run([
      "--table-profile",
      "req",
      "recRequirements",
      ...contextArgs(),
    ]);
    expect(getRecord).toHaveBeenCalledWith({
      appToken: "appRequirements",
      tableId: "tblRequirements",
      recordId: "recRequirements",
    });
    expect(listRecords).not.toHaveBeenCalled();
    expect(result.source).toMatchObject({
      appToken: "appRequirements",
      tableId: "tblRequirements",
      viewId: "vewRequirements",
    });
    expect(result.data).toMatchObject({
      record: {
        recordId: "recRequirements",
        source: { appToken: "appRequirements", tableId: "tblRequirements" },
      },
    });
  });

  it("filter --table URL sends the URL tableId without viewId to transport and the SDK", async () => {
    const result = await FilterCommand.run([
      "--table",
      profileUrl,
      "--field",
      "狀態",
      "--equals",
      "待處理",
      ...contextArgs(),
    ]);
    expect(listRecords).toHaveBeenCalledWith({
      appToken: "appRequirements",
      tableId: "tblRequirements",
      pageSize: 500,
      pageToken: undefined,
    });
    expect(listRecords.mock.calls[0]?.[0]).not.toHaveProperty("viewId");
    expect(recordApi.list.mock.calls[0]?.[0].params.view_id).toBeUndefined();
    expect(recordApi.list.mock.calls[0]?.[0].path).toEqual({
      app_token: "appRequirements",
      table_id: "tblRequirements",
    });
    expect(result.source).toMatchObject({
      appToken: "appRequirements",
      tableId: "tblRequirements",
      viewId: "vewRequirements",
    });
    expect(result.data).toMatchObject({
      records: [{ recordId: "recRequirements" }],
    });
  });

  it("write --op update --table-profile req previews the profile target without writing", async () => {
    const authBefore = await readFile(authPath, "utf8");
    const result = await WriteCommand.run([
      "--op",
      "update",
      "--record-id",
      "recRequirements",
      "--table-profile",
      "req",
      "--field",
      "標題=Updated requirement",
      ...contextArgs(),
    ]);
    expect(getRecord).toHaveBeenCalledWith({
      appToken: "appRequirements",
      tableId: "tblRequirements",
      recordId: "recRequirements",
    });
    expect(fieldApi.list.mock.calls[0]?.[0].path).toEqual({
      app_token: "appRequirements",
      table_id: "tblRequirements",
    });
    expect(result.source).toMatchObject({
      appToken: "appRequirements",
      tableId: "tblRequirements",
      viewId: "vewRequirements",
    });
    expect(result.data).toMatchObject({
      operation: {
        source: { tableId: "tblRequirements" },
        commitState: "previewed",
      },
      preview: {
        source: { tableId: "tblRequirements" },
        targetRecord: {
          recordId: "recRequirements",
          source: { tableId: "tblRequirements" },
        },
      },
      result: { commitState: "previewed", confirmationStatus: "not-written" },
    });
    expect(recordApi.create).not.toHaveBeenCalled();
    expect(recordApi.update).not.toHaveBeenCalled();
    expect(await readFile(authPath, "utf8")).toBe(authBefore);
  });

  it.each([
    { name: "list", command: ListCommand, args: [] },
    { name: "search", command: SearchCommand, args: ["Requirements"] },
    { name: "schema", command: SchemaCommand, args: [] },
  ])(
    "$name uses the shared profile selection and preserves view as metadata only",
    async ({ command, args }) => {
      const result = await command.run([
        ...args,
        "--table-profile",
        "req",
        ...contextArgs(),
      ]);
      expect(listRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          appToken: "appRequirements",
          tableId: "tblRequirements",
        }),
      );
      expect(listRecords.mock.calls[0]?.[0]).not.toHaveProperty("viewId");
      expect(result.source).toMatchObject({
        tableId: "tblRequirements",
        viewId: "vewRequirements",
      });
    },
  );

  it("list --table token changes tables within the active Base without persisting the selection", async () => {
    const result = await ListCommand.run([
      "--table",
      "tblOnce",
      ...contextArgs(),
    ]);
    expect(listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        appToken: fixtureSource.appToken,
        tableId: "tblOnce",
      }),
    );
    expect(result.source).toMatchObject({
      appToken: fixtureSource.appToken,
      tableId: "tblOnce",
    });
    expect(JSON.parse(JSON.stringify(result.source))).not.toHaveProperty(
      "viewId",
    );
    expect(new ConfigStore({ cwd }).getSource()).toEqual(fixtureSource);
  });

  it("get reports conflicting-table-flags before any Lark request", async () => {
    await expect(
      GetCommand.run([
        "recRequirements",
        "--table-profile",
        "req",
        "--table",
        "tblOnce",
        ...contextArgs(),
      ]),
    ).rejects.toMatchObject({ code: "conflicting-table-flags" });
    expect(recordApi.get).not.toHaveBeenCalled();
    expect(recordApi.list).not.toHaveBeenCalled();
  });
});

describe("configure table profiles", () => {
  it("stores and overwrites a profile without changing active source, Lark app, or workflow or prompting", async () => {
    const store = new ConfigStore({ cwd });
    store.setSource(fixtureSource);
    store.setLarkApp({
      appId: "fixture-app",
      appSecret: "fixture-secret",
      callbackPort: 14543,
      domain: "larksuite.com",
      updatedAt: "2026-10-27T00:00:00.000Z",
    });
    store.setActiveMode({ mode: "QA", configuredBy: "fixture" });
    const before = JSON.parse(await readFile(store.path, "utf8"));
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    try {
      const result = await ConfigureCommand.run([
        profileUrl,
        "--table-profile",
        "req",
        "--config-cwd",
        cwd,
      ]);
      expect(result).toMatchObject({
        source: {
          appToken: "appRequirements",
          tableId: "tblRequirements",
          viewId: "vewRequirements",
        },
      });
    } finally {
      if (descriptor) Object.defineProperty(process.stdin, "isTTY", descriptor);
      else Reflect.deleteProperty(process.stdin, "isTTY");
    }
    expect(new ConfigStore({ cwd }).listTableProfiles()).toMatchObject({
      req: {
        appToken: "appRequirements",
        tableId: "tblRequirements",
        viewId: "vewRequirements",
      },
    });
    await ConfigureCommand.run([
      "https://example.larksuite.com/base/appOther?table=tblOther",
      "--table-profile",
      "req",
      "--config-cwd",
      cwd,
      "--json",
    ]);
    const reloaded = new ConfigStore({ cwd });
    expect(reloaded.getTableProfile("req")).toMatchObject({
      appToken: "appOther",
      tableId: "tblOther",
    });
    expect(reloaded.getTableProfile("req")).not.toHaveProperty("viewId");
    const after = JSON.parse(await readFile(store.path, "utf8"));
    expect(after.activeSource).toEqual(before.activeSource);
    expect(after.larkApp).toEqual(before.larkApp);
    expect(after.workflow).toEqual(before.workflow);
  });

  it("lists profile names and source identities without requiring a URL or exposing app credentials", async () => {
    await ConfigureCommand.run([
      profileUrl,
      "--table-profile",
      "req",
      "--config-cwd",
      cwd,
      "--json",
    ]);
    const result = await ConfigureCommand.run([
      "--list-table-profiles",
      "--config-cwd",
      cwd,
      "--json",
    ]);
    expect(result.data).toMatchObject({
      tableProfiles: [
        {
          name: "req",
          appToken: "appRequirements",
          tableId: "tblRequirements",
          viewId: "vewRequirements",
        },
      ],
    });
    expect(result.source).toBeUndefined();
    expect(new ConfigStore({ cwd }).getSource()).toBeUndefined();
  });

  it("removes only the named table profile", async () => {
    const store = new ConfigStore({ cwd });
    store.setSource(fixtureSource);
    await ConfigureCommand.run([
      profileUrl,
      "--table-profile",
      "req",
      "--config-cwd",
      cwd,
      "--json",
    ]);
    await ConfigureCommand.run([
      profileUrl,
      "--table-profile",
      "release",
      "--config-cwd",
      cwd,
      "--json",
    ]);
    await ConfigureCommand.run([
      "--table-profile",
      "req",
      "--remove",
      "--config-cwd",
      cwd,
      "--json",
    ]);
    const reloaded = new ConfigStore({ cwd });
    expect(reloaded.getTableProfile("req")).toBeUndefined();
    expect(Object.keys(reloaded.listTableProfiles())).toEqual(["release"]);
    expect(reloaded.getSource()).toEqual(fixtureSource);
  });

  it.each(["Req", "1req", "has.dot", "has space", "__proto__", "a".repeat(33)])(
    "rejects invalid table profile name %s for save and removal",
    async (name) => {
      await expect(
        ConfigureCommand.run([
          profileUrl,
          "--table-profile",
          name,
          "--config-cwd",
          cwd,
          "--json",
        ]),
      ).rejects.toMatchObject({ code: "invalid-table-profile-name" });
      await expect(
        ConfigureCommand.run([
          "--table-profile",
          name,
          "--remove",
          "--config-cwd",
          cwd,
          "--json",
        ]),
      ).rejects.toMatchObject({ code: "invalid-table-profile-name" });
    },
  );

  it("requires a URL when saving a profile instead of using the active URL", async () => {
    new ConfigStore({ cwd }).setSource(fixtureSource);
    await expect(
      ConfigureCommand.run([
        "--table-profile",
        "req",
        "--config-cwd",
        cwd,
        "--json",
      ]),
    ).rejects.toMatchObject({ code: "missing-url" });
  });

  it("reads legacy config without tableProfiles and preserves it when profiles are added", async () => {
    const path = join(cwd, "config.json");
    await writeFile(path, JSON.stringify({ activeSource: fixtureSource }));
    const store = new ConfigStore({ cwd });
    expect(store.getSource()).toEqual(fixtureSource);
    expect(store.listTableProfiles()).toEqual({});
    expect(store.getTableProfile("req")).toBeUndefined();
    await ConfigureCommand.run([
      profileUrl,
      "--table-profile",
      "req",
      "--config-cwd",
      cwd,
      "--json",
    ]);
    expect(new ConfigStore({ cwd }).getSource()).toEqual(fixtureSource);
  });
});
