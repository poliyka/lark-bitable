import { Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import { loadRecordCommandData, selectFields } from "../shared-records.js";

export default class ListCommand extends BaseCommand {
  static description = "List records from the active Lark Bitable source.";
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({
      default: defaultAuthPath(),
      hidden: true,
    }),
    "config-cwd": Flags.string({
      hidden: true,
    }),
    field: Flags.string({
      description: "Field to include in output.",
      multiple: true,
    }),
    fixture: Flags.string({
      hidden: true,
    }),
    limit: Flags.integer({
      default: 20,
      description: "Maximum records to return.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(ListCommand);
    const { records, source } = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixture: flags.fixture,
    });
    const limited = selectFields(
      records.slice(0, flags.limit),
      flags.field ?? [],
    );
    const output: CommandOutput = {
      command: "list",
      status: "ok",
      source: {
        appToken: source.appToken,
        tableId: source.tableId,
        viewId: source.viewId,
        retrievedAt: new Date().toISOString(),
      },
      data: {
        records: limited,
        pagination: {
          limit: flags.limit,
          returned: limited.length,
          hasMore: records.length > limited.length,
        },
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
