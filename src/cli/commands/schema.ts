import { Flags } from "@oclif/core";

import { defaultAuthPath } from "../../config/auth-store.js";
import { LarkClient, createLarkSdkTransport } from "../../lark/client.js";
import { renderFieldValue } from "../../lark/record-mapper.js";
import type { BitableFieldInfo } from "../../lark/field-discovery.js";
import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { loadRecordCommandData } from "../shared-records.js";

export default class SchemaCommand extends BaseCommand {
  static description =
    "Inspect the configured Lark Bitable table schema and configured field mappings.";
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    "config-cwd": Flags.string({ hidden: true }),
    fixture: Flags.string({ hidden: true }),
    "sample-limit": Flags.integer({
      description:
        "Maximum records to sample for observed non-empty counts and values.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(SchemaCommand);
    const context = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixture: flags.fixture,
    });
    const sampleLimit = flags["sample-limit"] ?? 20;
    if (!Number.isInteger(sampleLimit) || sampleLimit <= 0) {
      this.error("Sample limit must be a positive integer.", {
        code: "invalid-sample-limit",
        suggestions: ["Run lark-bitable schema --sample-limit 20"],
      });
    }

    const fields = flags.fixture
      ? inferFieldsFromRecords(context.records)
      : await new LarkClient(createLarkSdkTransport(context.auth)).listFields(
          context.source,
        );
    const sampledRecords = context.records.slice(0, sampleLimit);
    const mappings = {
      statusField: context.source.statusField ?? null,
      actionableStatus: context.source.actionableStatus,
      priorityField: context.source.priorityField ?? null,
      priorityOrder: context.source.priorityOrder ?? [],
      titleField: context.source.fieldAliases.title ?? null,
      ownerField: context.source.fieldAliases.owner ?? null,
      reproductionStepsField:
        context.source.fieldAliases.reproductionSteps ?? null,
      expectedBehaviorField:
        context.source.fieldAliases.expectedBehavior ?? null,
      actualBehaviorField: context.source.fieldAliases.actualBehavior ?? null,
      linksField: context.source.fieldAliases.links ?? null,
      notesField: context.source.fieldAliases.notes ?? null,
    };
    const fieldSummaries = fields.map((field) =>
      summarizeField(field, sampledRecords),
    );

    const output: CommandOutput = {
      command: "schema",
      status: "ok",
      source: {
        appToken: context.source.appToken,
        tableId: context.source.tableId,
        viewId: context.source.viewId,
        retrievedAt: new Date().toISOString(),
      },
      mode: {
        active: context.mode.active,
        source: context.mode.source,
      },
      data: {
        fields: fieldSummaries,
        mappings,
        sample: {
          limit: sampleLimit,
          recordsRead: context.records.length,
          sampledRecords: sampledRecords.length,
        },
        nextSafeCommands: [
          "lark-bitable list --limit 20 --json",
          "lark-bitable get <record-id> --json",
          "lark-bitable triage --limit 20 --json",
        ],
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}

function inferFieldsFromRecords(
  records: Array<{ fields: Record<string, unknown> }>,
): BitableFieldInfo[] {
  return [
    ...new Set(records.flatMap((record) => Object.keys(record.fields))),
  ].map((fieldName) => ({ fieldName }));
}

function summarizeField(
  field: BitableFieldInfo,
  sampledRecords: Array<{ fields: Record<string, unknown> }>,
) {
  const values = sampledRecords
    .map((record) => record.fields[field.fieldName])
    .filter((value) => value !== undefined && value !== null && value !== "");
  const observedValues = [
    ...new Set(values.map((value) => renderFieldValue(value))),
  ].slice(0, 10);

  return {
    fieldName: field.fieldName,
    type: field.type ?? null,
    uiType: field.uiType ?? null,
    options: field.options ?? [],
    nonEmptyInSample: values.length,
    observedValues,
  };
}
