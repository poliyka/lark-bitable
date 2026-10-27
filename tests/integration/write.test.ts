import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

import WriteCommand from "../../src/cli/commands/write.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import * as larkClient from "../../src/lark/client.js";
import { readAuditEntries } from "../fixtures/audit.js";
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
  it("rejects invalid create client tokens before any Lark API call or attachment upload", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const attachmentPath = join(cwd, "evidence.png");
    await writeFile(attachmentPath, "fixture");
    const transport = {
      createRecord: vi.fn().mockResolvedValue({
        record_id: "recCreatedWrite",
        fields: { 標題: "Invalid token" },
      }),
      uploadMedia: vi
        .fn()
        .mockImplementation(async (input: larkClient.UploadMediaInput) => ({
          ...input,
          fileToken: "boxcnb01",
        })),
      listFields: vi.fn().mockResolvedValue([]),
      getRecord: vi.fn(),
      updateRecord: vi.fn(),
      listRecords: vi.fn(),
      downloadMedia: vi.fn(),
    };
    const factory = vi
      .spyOn(larkClient, "createLarkSdkTransport")
      .mockReturnValue(transport);
    try {
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
          "--fields-json",
          JSON.stringify({ 標題: "Invalid token", 附件: attachmentPath }),
          "--client-token",
          "abc",
          "--confirm",
          "--json",
        ]),
      ).rejects.toMatchObject({
        code: "invalid-client-token",
        remediation:
          "Omit --client-token to auto-generate one, or pass a UUID.",
      });
      expect(transport.createRecord).toHaveBeenCalledTimes(0);
      expect(transport.uploadMedia).toHaveBeenCalledTimes(0);
      expect(transport.listFields).toHaveBeenCalledTimes(0);
      expect(factory).not.toHaveBeenCalled();
    } finally {
      factory.mockRestore();
    }
  });

  it("auto-generates a UUID for confirmed creates without a client token", async () => {
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
      "--field",
      "標題=Generated token",
      "--confirm",
      "--json",
    ]);
    expect(result).toMatchObject({
      status: "ok",
      data: {
        result: {
          confirmationStatus: "confirmed",
          clientToken: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          ),
        },
      },
    });
  });

  it("preserves the existing rejection of client tokens for confirmed updates", async () => {
    const { authPath, cwd } = await configuredWriteContext();
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
        "recWrite",
        "--field",
        "狀態=待處理",
        "--client-token",
        "abc",
        "--confirm",
        "--json",
      ]),
    ).rejects.toMatchObject({
      code: "invalid-client-token",
      message: "Client token is only valid for create writes.",
      remediation: "Use --client-token only with --op create --confirm.",
    });
  });

  it("previews a create without committing table content", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const auditPath = join(cwd, "logs", "audit.json");

    const result = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--audit-path",
      auditPath,
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

    const auditEntries = await readAuditEntries(auditPath);
    expect(auditEntries[0]).toMatchObject({
      command: "write",
      status: "ok",
      dataSnapshot: expect.objectContaining({
        result: expect.objectContaining({
          confirmationStatus: "not-written",
        }),
      }),
    });
  });

  it("commits a create and reports created record evidence", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const auditPath = join(cwd, "logs", "audit.json");

    const result = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--audit-path",
      auditPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--mock-create-record",
      JSON.stringify(fixtureCreatedWriteRecord),
      "--op",
      "create",
      "--fields-json",
      '{"標題":"Write command live create","狀態":"待處理"}',
      "--client-token",
      "A7A412D8-19BE-4DC0-903F-81C8495B9C84",
      "--confirm",
      "--json",
    ]);

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      result: {
        clientToken: "A7A412D8-19BE-4DC0-903F-81C8495B9C84",
        confirmationStatus: "confirmed",
        targetRecordId: "recCreatedWrite",
      },
    });

    const auditEntries = await readAuditEntries(auditPath);
    expect(auditEntries[0]).toMatchObject({
      command: "write",
      status: "ok",
      dataSnapshot: {
        result: expect.objectContaining({
          confirmationStatus: "confirmed",
          targetRecordId: "recCreatedWrite",
        }),
      },
    });
    expect(JSON.stringify(auditEntries)).not.toContain(
      "A7A412D8-19BE-4DC0-903F-81C8495B9C84",
    );
  });

  it("prunes audit entries older than 14 days when writing a command entry", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const auditPath = join(cwd, "logs", "audit.json");
    await mkdir(dirname(auditPath), { recursive: true });
    await writeFile(
      join(dirname(auditPath), "audit-2000-01-01.json"),
      `${JSON.stringify({
        id: "expired",
        startedAt: "2000-01-01T00:00:00.000Z",
        finishedAt: "2000-01-01T00:00:00.000Z",
        durationMs: 0,
        command: "list",
        argv: ["list"],
        status: "ok",
        exitCode: 0,
        issues: [],
        evidenceSummary: [],
        retentionApplied: {
          retentionDays: 14,
          prunedEntries: 0,
        },
      })}\n`,
      "utf8",
    );

    await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--audit-path",
      auditPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--op",
      "create",
      "--field",
      "標題=Retention write",
      "--json",
    ]);

    const auditEntries = await readAuditEntries(auditPath);
    const files = await readdir(dirname(auditPath));
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({
      command: "write",
      retentionApplied: {
        retentionDays: 14,
        prunedEntries: 1,
      },
    });
    expect(files).not.toContain("audit-2000-01-01.json");
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

  it("uploads local attachment paths while preserving existing attachments before committing an update", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const attachmentPath = join(cwd, "evidence", "fixed.png");
    await mkdir(dirname(attachmentPath), { recursive: true });
    await writeFile(attachmentPath, "png fixture", "utf8");
    const uploadedRecord = {
      ...fixtureWriteRecord,
      fields: {
        ...fixtureWriteRecord.fields,
        附件: [
          { file_token: "boxcnexisting", name: "existing.png" },
          { file_token: "boxcnuploaded", name: "fixed.png" },
        ],
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
      "--mock-upload-token",
      "boxcnuploaded",
      "--mock-update-record",
      JSON.stringify(uploadedRecord),
      "--op",
      "update",
      "--record-id",
      "recWrite",
      "--fields-json",
      JSON.stringify({
        附件: [{ file_token: "boxcnexisting" }, attachmentPath],
      }),
      "--confirm",
      "--json",
    ]);

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      operation: {
        requestedFields: {
          附件: [
            { file_token: "boxcnexisting" },
            { file_token: "boxcnuploaded" },
          ],
        },
      },
      attachmentPlan: [
        expect.objectContaining({
          existingAttachmentCount: 1,
          fieldName: "附件",
          localFileCount: 1,
          mode: "append",
          replacementPolicy: "preserve",
          requestedEffect: "append",
          willReplaceExisting: false,
        }),
      ],
      result: {
        confirmationStatus: "confirmed",
        fieldChanges: [
          expect.objectContaining({
            fieldName: "附件",
            requestedValue: [
              { file_token: "boxcnexisting" },
              { file_token: "boxcnuploaded" },
            ],
            resultValue: [
              { file_token: "boxcnexisting", name: "existing.png" },
              { file_token: "boxcnuploaded", name: "fixed.png" },
            ],
          }),
        ],
      },
    });
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reference: "boxcnuploaded",
          status: "verified",
          type: "lark-media",
        }),
      ]),
    );
  });

  it("reports attachment replacement risk in preview before local upload", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const attachmentPath = join(cwd, "evidence", "replace-risk.png");
    await mkdir(dirname(attachmentPath), { recursive: true });
    await writeFile(attachmentPath, "png fixture", "utf8");

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
      "--fields-json",
      JSON.stringify({ 附件: attachmentPath }),
      "--json",
    ]);

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      attachmentPlan: [
        expect.objectContaining({
          existingAttachmentCount: 1,
          existingFileTokens: ["boxcnexisting"],
          fieldName: "附件",
          localFileCount: 1,
          mode: "replace",
          replacementPolicy: "preserve",
          requestedEffect: "replace",
          willReplaceExisting: true,
        }),
      ],
      preview: {
        attachmentPlan: [
          expect.objectContaining({
            localFiles: [
              expect.objectContaining({
                name: "replace-risk.png",
                parentType: "bitable_image",
                path: attachmentPath,
              }),
            ],
          }),
        ],
        warnings: [
          expect.stringContaining("will replace attachment/photo field 附件"),
        ],
      },
      result: {
        nextActions: [
          expect.stringContaining("lark-bitable get recWrite --json"),
          expect.stringContaining("preserving existing"),
          expect.stringContaining("--attachment-mode replace"),
        ],
      },
      nextSafeCommands: [
        expect.stringContaining("lark-bitable get recWrite --json"),
        expect.stringContaining("preserving existing"),
        expect.stringContaining("--attachment-mode replace"),
      ],
    });
    const data = result.data as {
      nextSafeCommands: string[];
      result: { nextActions: string[] };
    };
    expect(JSON.stringify(data.nextSafeCommands)).not.toContain("--confirm");
    expect(JSON.stringify(data.result.nextActions)).not.toContain("--confirm");
  });

  it("blocks confirmed attachment replacement unless replacement is explicit", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const attachmentPath = join(cwd, "evidence", "replace-risk.png");
    await mkdir(dirname(attachmentPath), { recursive: true });
    await writeFile(attachmentPath, "png fixture", "utf8");

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
        "--mock-upload-error",
        "upload mock must not be called",
        "--op",
        "update",
        "--record-id",
        "recWrite",
        "--fields-json",
        JSON.stringify({ 附件: attachmentPath }),
        "--confirm",
        "--json",
      ]),
    ).rejects.toThrow("--attachment-mode replace");
  });

  it("validates local attachment paths during preview without uploading", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const attachmentPath = join(cwd, "evidence", "preview.png");
    await mkdir(dirname(attachmentPath), { recursive: true });
    await writeFile(attachmentPath, "png fixture", "utf8");

    const result = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--fixture-records",
      JSON.stringify([fixtureWriteRecord]),
      "--mock-upload-error",
      "upload mock must not be called",
      "--op",
      "update",
      "--record-id",
      "recWrite",
      "--fields-json",
      JSON.stringify({ 附件: attachmentPath }),
      "--json",
    ]);

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      operation: {
        requestedFields: {
          附件: attachmentPath,
        },
      },
      result: {
        confirmationStatus: "not-written",
      },
    });
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reference: attachmentPath,
          status: "not-run",
          type: "lark-media",
        }),
      ]),
    );
  });

  it("keeps uploaded file tokens in failed write retry guidance", async () => {
    const { authPath, cwd } = await configuredWriteContext();
    const attachmentPath = join(cwd, "evidence", "retry.png");
    await mkdir(dirname(attachmentPath), { recursive: true });
    await writeFile(attachmentPath, "png fixture", "utf8");

    const result = await WriteCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture-fields",
      JSON.stringify(fixtureWriteFields),
      "--fixture-records",
      JSON.stringify([fixtureWriteRecord]),
      "--mock-upload-token",
      "boxcnuploaded",
      "--mock-update-error",
      "Lark invalid field value",
      "--op",
      "update",
      "--record-id",
      "recWrite",
      "--fields-json",
      JSON.stringify({
        附件: [{ file_token: "boxcnexisting" }, attachmentPath],
      }),
      "--confirm",
      "--json",
    ]);

    expect(result.status).toBe("error");
    expect(result.data).toMatchObject({
      operation: {
        requestedFields: {
          附件: [
            { file_token: "boxcnexisting" },
            { file_token: "boxcnuploaded" },
          ],
        },
      },
      result: {
        confirmationStatus: "failed",
        nextActions: expect.arrayContaining([
          expect.stringContaining("boxcnuploaded"),
        ]),
      },
    });
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reference: "boxcnuploaded",
          status: "verified",
          type: "lark-media",
        }),
      ]),
    );
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
