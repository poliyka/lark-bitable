import { Args, Flags } from "@oclif/core";
import { input as promptInput } from "@inquirer/prompts";

import { BaseCommand } from "../base-command.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import { searchRecords } from "../../lark/record-mapper.js";
import { loadRecordCommandData } from "../shared-records.js";

export default class SearchCommand extends BaseCommand {
  static args = {
    query: Args.string({
      description: "Text query to search for.",
      required: false,
    }),
  };
  static description = "Search visible text-like fields.";
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    "config-cwd": Flags.string({ hidden: true }),
    field: Flags.string({
      description: "Restrict search to a field.",
      multiple: true,
    }),
    fixture: Flags.string({ hidden: true }),
  };

  async run(): Promise<CommandOutput> {
    const { args, flags } = await this.parse(SearchCommand);
    const query =
      args.query ??
      (process.stdin.isTTY && !flags.json
        ? await promptInput({
            message: "Search text",
            required: true,
          })
        : undefined);
    if (!query?.trim()) {
      throw new CliError({
        code: "empty-query",
        message: "Search query must not be empty.",
        remediation: "Run lark-bitable search <query>.",
      });
    }
    const { records, source } = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixture: flags.fixture,
    });
    const matches = searchRecords(records, query, flags.field);
    const output: CommandOutput = {
      command: "search",
      status: "ok",
      source: {
        appToken: source.appToken,
        tableId: source.tableId,
        viewId: source.viewId,
        retrievedAt: new Date().toISOString(),
      },
      data: {
        query,
        records: matches,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
