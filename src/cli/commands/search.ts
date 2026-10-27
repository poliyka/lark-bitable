import { Args, Flags } from "@oclif/core";
import { input as promptInput } from "@inquirer/prompts";

import { BaseCommand } from "../base-command.js";
import { tableSelectionFlags } from "../source-selection.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import { searchRecords } from "../../lark/record-mapper.js";
import {
  applyQueryLimit,
  parsePositiveLimit,
} from "../../mode/owner-filter.js";
import {
  applyOwnerCriteria,
  loadRecordCommandData,
} from "../shared-records.js";

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
    ...tableSelectionFlags,
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    "config-cwd": Flags.string({ hidden: true }),
    field: Flags.string({
      description: "Restrict search to a field.",
      multiple: true,
    }),
    fixture: Flags.string({ hidden: true }),
    limit: Flags.integer({
      description: "Maximum matching records to return.",
    }),
    owner: Flags.string({
      description: "Filter records by owner using an inferred owner field.",
    }),
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
    const context = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      table: flags.table,
      tableProfile: flags["table-profile"],
      fixture: flags.fixture,
    });
    const ownerResult = applyOwnerCriteria({
      ...context,
      commandOwner: flags.owner,
    });
    const matches = searchRecords(ownerResult.records, query, flags.field);
    const limit = parsePositiveLimit({
      defaultLimit: 20,
      flagLimit: flags.limit,
    });
    const limitedResult = applyQueryLimit(matches, {
      appliedAfter: ["owner", "search"],
      ...limit,
    });
    const output: CommandOutput = {
      command: "search",
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
      ownerCriteria: ownerResult.criteria,
      queryLimit: limitedResult.queryLimit,
      data: {
        query,
        records: limitedResult.items,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
