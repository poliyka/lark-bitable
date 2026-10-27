import { randomUUID } from "node:crypto";

import { Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import { tableSelectionFlags } from "../source-selection.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import type {
  BitableRecord,
  ResearchEvidence,
  WriteOperation,
  WritePreview,
} from "../../config/schema.js";
import type {
  LarkClient,
  UploadMediaInput,
  UploadMediaResult,
} from "../../lark/client.js";
import {
  prepareAttachmentFieldUploads,
  type AttachmentPlan,
  type AttachmentWriteMode,
} from "../../write/attachments.js";
import { parseFieldInput } from "../../write/field-input.js";
import { createWriteOperation } from "../../write/operation.js";
import {
  buildConfirmedWriteResult,
  buildFailedWriteResult,
  buildPreviewWriteResult,
  buildUnknownWriteResult,
  issueFromWriteError,
  writeEvidence,
} from "../../write/result.js";
import { loadWriteCommandContext } from "../../write/readiness.js";

export default class WriteCommand extends BaseCommand {
  static description =
    "Preview or commit one create/update operation against the active Lark Bitable table.";
  static examples = [
    {
      command:
        'lark-bitable write --op create --field "標題=新增登入錯誤" --field "狀態=待處理"',
      description: "Preview a new record without changing table content.",
    },
    {
      command:
        'lark-bitable write --op update --record-id recxxxx --fields-json \'{"狀態":"處理中"}\' --confirm --json',
      description: "Commit one update after the preview data is known.",
    },
  ];
  static flags = {
    ...BaseCommand.baseFlags,
    ...tableSelectionFlags,
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    "client-token": Flags.string({
      description: "Idempotency token for committed create writes.",
    }),
    confirm: Flags.boolean({
      description: "Commit the write. Without this flag only a preview runs.",
    }),
    "config-cwd": Flags.string({ hidden: true }),
    field: Flags.string({
      char: "f",
      description:
        "Field assignment in name=value form. Repeat for multiple fields.",
      multiple: true,
    }),
    "fields-json": Flags.string({
      description:
        "JSON object mapping Bitable field names to requested values.",
    }),
    "fixture-fields": Flags.string({ hidden: true }),
    "fixture-records": Flags.string({ hidden: true }),
    "mock-confirm-error": Flags.string({ hidden: true }),
    "mock-create-error": Flags.string({ hidden: true }),
    "mock-create-record": Flags.string({ hidden: true }),
    "mock-update-error": Flags.string({ hidden: true }),
    "mock-update-record": Flags.string({ hidden: true }),
    "mock-upload-error": Flags.string({ hidden: true }),
    "mock-upload-token": Flags.string({ hidden: true, multiple: true }),
    "attachment-mode": Flags.string({
      default: "preserve",
      description:
        "Attachment/photo replacement handling for confirmed writes.",
      options: ["preserve", "replace"],
    }),
    op: Flags.string({
      description: "Write operation.",
      options: ["create", "update"],
      required: true,
    }),
    "record-id": Flags.string({
      description: "Target record id for update writes.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(WriteCommand);
    const tableSelectionArgs =
      flags["table-profile"] !== undefined
        ? ` --table-profile ${flags["table-profile"]}`
        : flags.table !== undefined
          ? ` --table '${flags.table.replaceAll("'", "'\\''")}'`
          : "";
    const fields = parseFieldInput({
      fieldAssignments: flags.field,
      fieldsJson: flags["fields-json"],
    });
    const op = flags.op as "create" | "update";
    if (
      op === "create" &&
      flags.confirm &&
      flags["client-token"] !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        flags["client-token"],
      )
    ) {
      throw new CliError({
        code: "invalid-client-token",
        message: "Client token must be a UUID.",
        remediation:
          "Omit --client-token to auto-generate one, or pass a UUID.",
      });
    }
    const clientToken =
      op === "create" && flags.confirm
        ? (flags["client-token"] ?? randomUUID())
        : flags["client-token"];
    const context = await loadWriteCommandContext({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      table: flags.table,
      tableProfile: flags["table-profile"],
      fixtureFields: flags["fixture-fields"],
      fixtureRecords: flags["fixture-records"],
      recordId: flags["record-id"],
      requireRecord: op === "update",
    });
    const attachmentPreparation = await prepareAttachmentFieldUploads({
      attachmentMode: flags["attachment-mode"] as AttachmentWriteMode,
      confirm: Boolean(flags.confirm),
      currentRecord: context.targetRecord,
      fields,
      source: context.source,
      tableFields: context.fields,
      uploadMedia: uploadMediaHandler(context.client, {
        mockUploadError: flags["mock-upload-error"],
        mockUploadTokens: flags["mock-upload-token"],
      }),
    });

    const operation = createWriteOperation({
      clientToken,
      confirm: Boolean(flags.confirm),
      currentRecord: context.targetRecord,
      fields: attachmentPreparation.fields,
      recordId: flags["record-id"],
      source: context.source,
      tableFields: context.fields,
      type: op,
    });
    const preview = buildWritePreview(operation, context.targetRecord, {
      attachmentPlan: attachmentPreparation.attachmentPlan,
      warnings: attachmentPreparation.warnings,
    });

    if (!flags.confirm) {
      const previewResult = buildPreviewWriteResult(
        operation,
        tableSelectionArgs,
      );
      const nextActions = nextActionsForPreview(operation, {
        tableSelectionArgs,
        attachmentMode: flags["attachment-mode"] as AttachmentWriteMode,
        attachmentPlan: attachmentPreparation.attachmentPlan,
        defaultNextActions: previewResult.nextActions,
      });
      const result = {
        ...previewResult,
        evidence: [
          ...attachmentPreparation.evidence,
          ...previewResult.evidence,
        ],
        warnings: [
          ...previewResult.warnings,
          ...attachmentPreparation.warnings,
        ],
        nextActions,
      };
      const output: CommandOutput = {
        command: "write",
        status: "ok",
        source: operation.source,
        evidence: result.evidence,
        issues: result.issues,
        mode: {
          active: context.mode.active,
          source: context.mode.source,
        },
        data: {
          attachmentPlan: attachmentPreparation.attachmentPlan,
          operation,
          preview,
          result,
          nextSafeCommands: result.nextActions,
        },
      };
      this.emit(output, Boolean(flags.json));
      return output;
    }

    const result = await this.commitWrite(operation, {
      tableSelectionArgs,
      mockConfirmError: flags["mock-confirm-error"],
      mockCreateError: flags["mock-create-error"],
      mockCreateRecord: flags["mock-create-record"],
      mockUpdateError: flags["mock-update-error"],
      mockUpdateRecord: flags["mock-update-record"],
      runCreate: (input) =>
        context.client.createRecord(context.source, input.fields, {
          clientToken: input.clientToken,
        }),
      runUpdate: (input) =>
        context.client.updateRecord(
          context.source,
          input.recordId,
          input.fields,
        ),
      attachmentMode: flags["attachment-mode"] as AttachmentWriteMode,
      uploadEvidence: attachmentPreparation.evidence,
    });
    const output: CommandOutput = {
      command: "write",
      status:
        result.confirmationStatus === "confirmed"
          ? "ok"
          : result.confirmationStatus === "unknown" ||
              result.confirmationStatus === "partial"
            ? "partial"
            : "error",
      source: operation.source,
      evidence: result.evidence,
      issues: result.issues,
      mode: {
        active: context.mode.active,
        source: context.mode.source,
      },
      data: {
        attachmentPlan: attachmentPreparation.attachmentPlan,
        operation,
        preview,
        result,
        nextSafeCommands: result.nextActions,
      },
    };
    this.emit(output, Boolean(flags.json));
    return output;
  }

  private async commitWrite(
    operation: WriteOperation,
    input: {
      tableSelectionArgs: string;
      mockConfirmError?: string;
      mockCreateError?: string;
      mockCreateRecord?: string;
      mockUpdateError?: string;
      mockUpdateRecord?: string;
      attachmentMode?: AttachmentWriteMode;
      uploadEvidence?: ResearchEvidence[];
      runCreate: (input: {
        clientToken?: string;
        fields: Record<string, unknown>;
      }) => Promise<BitableRecord>;
      runUpdate: (input: {
        fields: Record<string, unknown>;
        recordId: string;
      }) => Promise<BitableRecord>;
    },
  ) {
    try {
      if (operation.type === "create") {
        if (input.mockCreateError) throw new Error(input.mockCreateError);
        const record = input.mockCreateRecord
          ? (JSON.parse(input.mockCreateRecord) as BitableRecord)
          : await input.runCreate({
              clientToken: operation.clientToken,
              fields: operation.requestedFields,
            });
        if (input.mockConfirmError) {
          return buildUnknownWriteResult(
            withTargetRecordId(operation, record.recordId),
            {
              message: input.mockConfirmError,
              evidence: [
                ...(input.uploadEvidence ?? []),
                writeEvidence({
                  reference: record.recordId,
                  excerpt:
                    "Create response returned before confirmation failed.",
                  status: "partial",
                }),
              ],
            },
            input.tableSelectionArgs,
          );
        }
        return buildConfirmedWriteResult(
          operation,
          {
            evidence: input.uploadEvidence,
            record,
          },
          input.tableSelectionArgs,
        );
      }

      if (input.mockUpdateError) throw new Error(input.mockUpdateError);
      const recordId = operation.targetRecordId;
      if (!recordId) {
        throw new Error("Record id is required for update writes.");
      }
      const record = input.mockUpdateRecord
        ? (JSON.parse(input.mockUpdateRecord) as BitableRecord)
        : await input.runUpdate({
            fields: operation.requestedFields,
            recordId,
          });
      if (input.mockConfirmError) {
        return buildUnknownWriteResult(
          operation,
          {
            message: input.mockConfirmError,
            evidence: [
              ...(input.uploadEvidence ?? []),
              writeEvidence({
                reference: record.recordId,
                excerpt: "Update response returned before confirmation failed.",
                status: "partial",
              }),
            ],
          },
          input.tableSelectionArgs,
        );
      }
      return buildConfirmedWriteResult(
        operation,
        {
          evidence: input.uploadEvidence,
          record,
        },
        input.tableSelectionArgs,
      );
    } catch (error) {
      const result = buildFailedWriteResult(
        operation,
        issueFromWriteError(error),
      );
      const retryCommand = retryUploadedAttachmentCommand(operation, {
        tableSelectionArgs: input.tableSelectionArgs,
        attachmentMode: input.attachmentMode,
        uploadEvidence: input.uploadEvidence,
      });
      return {
        ...result,
        evidence: [...(input.uploadEvidence ?? []), ...result.evidence],
        nextActions: retryCommand
          ? [retryCommand, ...result.nextActions]
          : result.nextActions,
      };
    }
  }
}

function buildWritePreview(
  operation: WriteOperation,
  targetRecord: BitableRecord | undefined,
  options: { attachmentPlan?: AttachmentPlan[]; warnings?: string[] } = {},
): WritePreview {
  return {
    attachmentPlan: options.attachmentPlan ?? [],
    operation,
    source: operation.source,
    targetRecord,
    fieldChanges: operation.fieldChanges,
    warnings: options.warnings ?? [],
    commitRequired: true,
    wouldWrite: true,
  };
}

function retryUploadedAttachmentCommand(
  operation: WriteOperation,
  input: {
    tableSelectionArgs: string;
    attachmentMode?: AttachmentWriteMode;
    uploadEvidence?: ResearchEvidence[];
  },
): string | undefined {
  const hasUploadedMedia = input.uploadEvidence?.some(
    (item) => item.type === "lark-media" && item.status === "verified",
  );
  if (!hasUploadedMedia) return undefined;

  const fieldJson = JSON.stringify(operation.requestedFields);
  const base =
    operation.type === "update"
      ? `lark-bitable write --op update --record-id ${operation.targetRecordId} --fields-json '${fieldJson}' --confirm --json`
      : `lark-bitable write --op create --fields-json '${fieldJson}' --confirm --json`;
  return `${input.attachmentMode === "replace" ? `${base} --attachment-mode replace` : base}${input.tableSelectionArgs}`;
}

function nextActionsForPreview(
  operation: WriteOperation,
  input: {
    tableSelectionArgs: string;
    attachmentMode: AttachmentWriteMode;
    attachmentPlan: AttachmentPlan[];
    defaultNextActions: string[];
  },
): string[] {
  const riskyPreservePlans = input.attachmentPlan.filter(
    (plan) => plan.willReplaceExisting && plan.replacementPolicy !== "replace",
  );
  if (riskyPreservePlans.length > 0) {
    const fieldNames = riskyPreservePlans
      .map((plan) => plan.fieldName)
      .join(", ");
    return [
      operation.targetRecordId
        ? `lark-bitable get ${operation.targetRecordId} --json${input.tableSelectionArgs}`
        : `Run lark-bitable get <record-id> --json${input.tableSelectionArgs} before retrying this attachment write.`,
      `Rebuild --fields-json for attachment/photo field(s) ${fieldNames} by preserving existing {"file_token":"..."} objects and adding the new local file path, then run preview again.`,
      "Use --attachment-mode replace only when the user explicitly requested attachment replacement.",
    ];
  }

  if (
    input.attachmentMode === "replace" &&
    input.attachmentPlan.some((plan) => plan.willReplaceExisting)
  ) {
    return input.defaultNextActions.map((action) =>
      action.startsWith("lark-bitable write") &&
      !action.includes("--attachment-mode")
        ? `${action} --attachment-mode replace`
        : action,
    );
  }

  return input.defaultNextActions;
}

function withTargetRecordId(
  operation: WriteOperation,
  targetRecordId: string,
): WriteOperation {
  return {
    ...operation,
    targetRecordId,
  };
}

function uploadMediaHandler(
  client: LarkClient,
  input: {
    mockUploadError?: string;
    mockUploadTokens?: string[];
  },
): (upload: UploadMediaInput) => Promise<UploadMediaResult> {
  const mockTokens = input.mockUploadTokens ?? [];
  let mockIndex = 0;

  return async (upload) => {
    if (input.mockUploadError) throw new Error(input.mockUploadError);
    if (mockTokens.length > 0) {
      const fileToken = mockTokens[Math.min(mockIndex, mockTokens.length - 1)];
      if (!fileToken) throw new Error("Mock upload token is missing.");
      mockIndex += 1;
      return {
        ...upload,
        fileToken,
      };
    }
    return client.uploadMedia(upload);
  };
}
