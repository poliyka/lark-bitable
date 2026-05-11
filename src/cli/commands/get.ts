import { Args, Flags } from "@oclif/core";
import { select as promptSelect } from "@inquirer/prompts";

import { BaseCommand } from "../base-command.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import { LarkClient, createLarkSdkTransport } from "../../lark/client.js";
import { loadRecordCommandData } from "../shared-records.js";

export default class GetCommand extends BaseCommand {
  static args = {
    recordId: Args.string({
      description: "Stable Lark record id.",
      required: false,
    }),
  };
  static description = "Retrieve one record by stable record id.";
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    "config-cwd": Flags.string({ hidden: true }),
    fixture: Flags.string({ hidden: true }),
  };

  async run(): Promise<CommandOutput> {
    const { args, flags } = await this.parse(GetCommand);
    const { auth, records, source } = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixture: flags.fixture,
    });
    const recordId =
      args.recordId ??
      (process.stdin.isTTY
        ? await promptSelect({
            choices: records.slice(0, 20).map((record) => ({
              name: `${record.recordId} ${JSON.stringify(record.fields).slice(0, 80)}`,
              value: record.recordId,
            })),
            message: "Choose a Lark record to inspect",
          })
        : undefined);
    if (!recordId) {
      throw new CliError({
        code: "missing-record-id",
        message: "Record id is required.",
        remediation:
          "Run lark-bitable list, then lark-bitable get <record-id>.",
      });
    }
    const record =
      records.find((item) => item.recordId === recordId) ??
      (!flags.fixture
        ? await new LarkClient(createLarkSdkTransport(auth)).getRecord(
            source,
            recordId,
          )
        : undefined);
    if (!record) {
      throw new CliError({
        code: "record-not-found",
        message: "Record not found.",
        remediation: "Run lark-bitable list to inspect available record ids.",
      });
    }

    const output: CommandOutput = {
      command: "get",
      status: "ok",
      source: {
        appToken: source.appToken,
        tableId: source.tableId,
        viewId: source.viewId,
        retrievedAt: new Date().toISOString(),
      },
      data: {
        record,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
