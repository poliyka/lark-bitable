import { randomUUID } from "node:crypto";

import { Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import type {
  BitableRecord,
  WriteOperation,
  WritePreview,
} from "../../config/schema.js";
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
    const fields = parseFieldInput({
      fieldAssignments: flags.field,
      fieldsJson: flags["fields-json"],
    });
    const op = flags.op as "create" | "update";
    const clientToken =
      op === "create" && flags.confirm
        ? (flags["client-token"] ?? randomUUID())
        : flags["client-token"];
    const context = await loadWriteCommandContext({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixtureFields: flags["fixture-fields"],
      fixtureRecords: flags["fixture-records"],
      recordId: flags["record-id"],
      requireRecord: op === "update",
    });

    const operation = createWriteOperation({
      clientToken,
      confirm: Boolean(flags.confirm),
      currentRecord: context.targetRecord,
      fields,
      recordId: flags["record-id"],
      source: context.source,
      tableFields: context.fields,
      type: op,
    });
    const preview = buildWritePreview(operation, context.targetRecord);

    if (!flags.confirm) {
      const result = buildPreviewWriteResult(operation);
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
      mockConfirmError?: string;
      mockCreateError?: string;
      mockCreateRecord?: string;
      mockUpdateError?: string;
      mockUpdateRecord?: string;
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
                writeEvidence({
                  reference: record.recordId,
                  excerpt:
                    "Create response returned before confirmation failed.",
                  status: "partial",
                }),
              ],
            },
          );
        }
        return buildConfirmedWriteResult(operation, { record });
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
        return buildUnknownWriteResult(operation, {
          message: input.mockConfirmError,
          evidence: [
            writeEvidence({
              reference: record.recordId,
              excerpt: "Update response returned before confirmation failed.",
              status: "partial",
            }),
          ],
        });
      }
      return buildConfirmedWriteResult(operation, { record });
    } catch (error) {
      return buildFailedWriteResult(operation, issueFromWriteError(error));
    }
  }
}

function buildWritePreview(
  operation: WriteOperation,
  targetRecord: BitableRecord | undefined,
): WritePreview {
  return {
    operation,
    source: operation.source,
    targetRecord,
    fieldChanges: operation.fieldChanges,
    warnings: [],
    commitRequired: true,
    wouldWrite: true,
  };
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
