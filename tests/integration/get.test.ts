import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { select as promptSelect } from "@inquirer/prompts";

import GetCommand from "../../src/cli/commands/get.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";
import { mediaAttachmentFixture } from "../fixtures/media.js";

const recordApi = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn() }));
const transportCalls = vi.hoisted(() => ({
  getRecord: vi.fn(),
  listRecords: vi.fn(),
}));

vi.mock("@inquirer/prompts", () => ({ select: vi.fn() }));

vi.mock("../../src/lark/client.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/lark/client.js")>();
  return {
    ...actual,
    createLarkSdkTransport: (
      session: Parameters<typeof actual.createLarkSdkTransport>[0],
    ) => {
      const transport = actual.createLarkSdkTransport(session, {
        sdk: { bitable: { appTableRecord: recordApi } } as never,
      });
      return {
        ...transport,
        getRecord: transportCalls.getRecord.mockImplementation(
          transport.getRecord,
        ),
        listRecords: transportCalls.listRecords.mockImplementation(
          transport.listRecords,
        ),
      };
    },
  };
});

beforeEach(() => {
  transportCalls.getRecord.mockReset();
  transportCalls.listRecords.mockReset();
  recordApi.get.mockReset().mockResolvedValue({
    code: 0,
    data: {
      record: { record_id: "recLogin", fields: { 標題: "Login error" } },
    },
  });
  recordApi.list.mockReset().mockResolvedValue({
    code: 0,
    data: {
      items: [{ record_id: "recLogin", fields: { 標題: "Listed record" } }],
    },
  });
});

describe("get command", () => {
  async function liveGetArgs(recordId: string) {
    const cwd = await mkdtemp(join(tmpdir(), "get-live-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);
    return [recordId, "--config-cwd", cwd, "--auth-path", authPath, "--json"];
  }

  it("gets a non-fixture record with one getRecord call and no listRecords calls", async () => {
    const result = await GetCommand.run(await liveGetArgs("recLogin"));

    expect(result.data).toMatchObject({
      record: { recordId: "recLogin", fields: { 標題: "Login error" } },
    });
    expect(recordApi.get).toHaveBeenCalledTimes(1);
    expect(recordApi.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: {
          app_token: fixtureSource.appToken,
          table_id: fixtureSource.tableId,
          record_id: "recLogin",
        },
      }),
      expect.anything(),
    );
    expect(recordApi.list).not.toHaveBeenCalled();
    expect(transportCalls.getRecord).toHaveBeenCalledTimes(1);
    expect(transportCalls.listRecords).not.toHaveBeenCalled();
  });

  it("keeps list-backed interactive selection when record id is omitted", async () => {
    const args = (await liveGetArgs("unused")).slice(1);
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    vi.mocked(promptSelect).mockResolvedValueOnce("recLogin");
    try {
      const result = await GetCommand.run(args);
      expect(result.data).toMatchObject({
        record: { recordId: "recLogin", fields: { 標題: "Listed record" } },
      });
      expect(transportCalls.listRecords).toHaveBeenCalledTimes(1);
      expect(transportCalls.getRecord).not.toHaveBeenCalled();
      expect(promptSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [expect.objectContaining({ value: "recLogin" })],
        }),
      );
    } finally {
      if (descriptor) Object.defineProperty(process.stdin, "isTTY", descriptor);
      else Reflect.deleteProperty(process.stdin, "isTTY");
    }
  });

  it("maps Lark RecordIdNotFound to the record-not-found CLI error", async () => {
    recordApi.get.mockResolvedValue({ code: 1254043, msg: "RecordIdNotFound" });

    await expect(
      GetCommand.run(await liveGetArgs("recMissing")),
    ).rejects.toMatchObject({
      code: "record-not-found",
      message: "Record not found.",
    });
    expect(recordApi.get).toHaveBeenCalledTimes(1);
    expect(recordApi.list).not.toHaveBeenCalled();
  });

  it("preserves Lark permission errors instead of reporting record-not-found", async () => {
    recordApi.get.mockResolvedValue({
      code: 1254302,
      msg: "Permission denied",
    });

    await expect(
      GetCommand.run(await liveGetArgs("recDenied")),
    ).rejects.toThrow("Permission denied");
    expect(recordApi.get).toHaveBeenCalledTimes(1);
    expect(recordApi.list).not.toHaveBeenCalled();
  });

  it("preserves network errors from getRecord", async () => {
    const networkError = new Error("Connection reset");
    recordApi.get.mockRejectedValue(networkError);

    await expect(GetCommand.run(await liveGetArgs("recNetwork"))).rejects.toBe(
      networkError,
    );
    expect(recordApi.list).not.toHaveBeenCalled();
  });

  it("returns one record by stable record id", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "get-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    const result = await GetCommand.run([
      "recLogin",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(fixtureRecords),
      "--json",
    ]);

    expect(JSON.stringify(result)).toContain("Login error");
  });

  it("fails when the record is unknown", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "get-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    await expect(
      GetCommand.run([
        "missing",
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--fixture",
        JSON.stringify(fixtureRecords),
      ]),
    ).rejects.toThrow("Record not found");
  });

  it("returns full visible fields and extracted media references", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "get-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);
    const records = [
      {
        ...fixtureRecords[0],
        fields: {
          ...fixtureRecords[0].fields,
          描述: "Full reproduction detail",
          附件: [mediaAttachmentFixture],
        },
      },
    ];

    const result = await GetCommand.run([
      "recLogin",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(records),
      "--json",
    ]);

    expect(result.data).toMatchObject({
      record: {
        recordId: "recLogin",
        fields: {
          描述: "Full reproduction detail",
        },
      },
      mediaReferences: [
        {
          field: "附件",
          fileToken: mediaAttachmentFixture.file_token,
          name: mediaAttachmentFixture.name,
        },
      ],
    });
  });
});
