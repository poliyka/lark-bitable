import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import WriteCommand from "../../src/cli/commands/write.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureSource } from "../fixtures/lark.js";
import {
  fixtureCreatedWriteRecord,
  fixtureWriteFields,
  fixtureWriteRecord,
} from "../fixtures/write.js";

async function configuredWriteContext(
  options: { auth?: boolean; source?: boolean } = {},
) {
  const cwd = await mkdtemp(join(tmpdir(), "write-"));
  const authPath = join(cwd, "auth.json");
  if (options.auth !== false) {
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
  }
  if (options.source !== false) {
    new ConfigStore({ cwd }).setSource(fixtureSource);
  }
  return { authPath, cwd };
}

describe("write command", () => {
  it("previews a create without committing table content", async () => {
    const { authPath, cwd } = await configuredWriteContext();

    const result = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--op",
      "create",
      "--field",
      "標題=Write command preview",
      "--field",
      "狀態=待處理",
      "--json",
    ]);

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      result: {
        confirmationStatus: "not-written",
      },
    });
    expect(JSON.stringify(result.data)).toContain("Write command preview");
  });

  it("commits a create and reports created record evidence", async () => {
    const { authPath, cwd } = await configuredWriteContext();

    const result = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--mock-create-record",
      JSON.stringify(fixtureCreatedWriteRecord),
      "--op",
      "create",
      "--fields-json",
      '{"標題":"Write command live create","狀態":"待處理"}',
      "--client-token",
      "manual-write-create-001",
      "--confirm",
      "--json",
    ]);

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      result: {
        clientToken: "manual-write-create-001",
        confirmationStatus: "confirmed",
        targetRecordId: "recCreatedWrite",
      },
    });
  });

  it("previews an update with before values", async () => {
    const { authPath, cwd } = await configuredWriteContext();

    const result = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--fixture-records",
      JSON.stringify([fixtureWriteRecord]),
      "--op",
      "update",
      "--record-id",
      "recWrite",
      "--field",
      "狀態=處理中",
      "--json",
    ]);

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      result: {
        confirmationStatus: "not-written",
        fieldChanges: [
          expect.objectContaining({
            fieldName: "狀態",
            previousValue: "待處理",
            requestedValue: "處理中",
          }),
        ],
      },
    });
  });

  it("commits an update while preserving unrelated fields in the returned record", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const updatedRecord = {
      ...fixtureWriteRecord,
      fields: {
        ...fixtureWriteRecord.fields,
        狀態: "處理中",
      },
    };

    const result = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--fixture-records",
      JSON.stringify([fixtureWriteRecord]),
      "--mock-update-record",
      JSON.stringify(updatedRecord),
      "--op",
      "update",
      "--record-id",
      "recWrite",
      "--field",
      "狀態=處理中",
      "--confirm",
      "--json",
    ]);

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      result: {
        confirmationStatus: "confirmed",
        targetRecordId: "recWrite",
        updatedRecord: {
          fields: {
            備註: "Existing note",
          },
        },
      },
    });
  });

  it("keeps preview-only requests from reaching commit mocks and shows next safe action", async () => {
    const { authPath, cwd } = await configuredWriteContext();

    const result = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--mock-create-error",
      "create mock must not be called",
      "--op",
      "create",
      "--field",
      "標題=Preview gate",
      "--json",
    ]);

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      result: {
        confirmationStatus: "not-written",
      },
      nextSafeCommands: [expect.stringContaining("--confirm")],
    });
  });

  it("blocks missing setup, unknown fields, and missing update target records before commit", async () => {
    const missingAuth = await configuredWriteContext({ auth: false });
    await expect(
      WriteCommand.run([
        "--config-cwd",
        missingAuth.cwd,
        "--auth-path",
        missingAuth.authPath,
        "--fixture-fields",
        JSON.stringify(fixtureWriteFields),
        "--op",
        "create",
        "--field",
        "標題=Missing auth",
      ]),
    ).rejects.toThrow("Lark auth is missing or not ready");

    const missingSource = await configuredWriteContext({ source: false });
    await expect(
      WriteCommand.run([
        "--config-cwd",
        missingSource.cwd,
        "--auth-path",
        missingSource.authPath,
        "--fixture-fields",
        JSON.stringify(fixtureWriteFields),
        "--op",
        "create",
        "--field",
        "標題=Missing source",
      ]),
    ).rejects.toThrow("No active Lark Bitable source is configured");

    const { authPath, cwd } = await configuredWriteContext();
    await expect(
      WriteCommand.run([
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--fixture-fields",
        JSON.stringify(fixtureWriteFields),
        "--op",
        "create",
        "--field",
        "不存在欄位=value",
      ]),
    ).rejects.toThrow("Unknown field: 不存在欄位");

    await expect(
      WriteCommand.run([
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--fixture-fields",
        JSON.stringify(fixtureWriteFields),
        "--fixture-records",
        JSON.stringify([fixtureWriteRecord]),
        "--op",
        "update",
        "--record-id",
        "missing",
        "--field",
        "狀態=處理中",
      ]),
    ).rejects.toThrow("Target record not found");
  });

  it("classifies Lark rejections and confirmation failures without claiming success", async () => {
    const { authPath, cwd } = await configuredWriteContext();

    const permission = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--mock-create-error",
      "Lark 403 permission denied",
      "--op",
      "create",
      "--field",
      "標題=Denied",
      "--confirm",
      "--json",
    ]);
    expect(permission).toMatchObject({
      status: "error",
      data: {
        result: {
          confirmationStatus: "failed",
          issues: [
            expect.objectContaining({ code: "write-permission-denied" }),
          ],
        },
      },
    });

    const valueRejected = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--mock-create-error",
      "Lark invalid field value",
      "--op",
      "create",
      "--field",
      "狀態=不存在狀態",
      "--confirm",
      "--json",
    ]);
    expect(valueRejected).toMatchObject({
      status: "error",
      data: {
        result: {
          confirmationStatus: "failed",
          issues: [expect.objectContaining({ code: "write-value-rejected" })],
        },
      },
    });

    const unknown = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--mock-create-record",
      JSON.stringify(fixtureCreatedWriteRecord),
      "--mock-confirm-error",
      "Confirmation read failed",
      "--op",
      "create",
      "--field",
      "標題=Unknown after create",
      "--confirm",
      "--json",
    ]);
    expect(unknown).toMatchObject({
      status: "partial",
      data: {
        result: {
          confirmationStatus: "unknown",
          targetRecordId: "recCreatedWrite",
        },
      },
    });
  });
});
