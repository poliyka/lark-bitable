import { Flags } from "@oclif/core";
import {
  input as promptInput,
  select as promptSelect,
} from "@inquirer/prompts";

import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import {
  filterRecords,
  type FilterOperator,
} from "../../lark/record-mapper.js";
import {
  applyQueryLimit,
  parsePositiveLimit,
} from "../../mode/owner-filter.js";
import {
  applyOwnerCriteria,
  loadRecordCommandData,
} from "../shared-records.js";

export default class FilterCommand extends BaseCommand {
  static description = "Return records matching field criteria.";
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    "config-cwd": Flags.string({ hidden: true }),
    contains: Flags.string({
      description: "Return records where field contains this value.",
      exclusive: ["equals"],
    }),
    equals: Flags.string({
      description: "Return records where field equals this value.",
      exclusive: ["contains"],
    }),
    field: Flags.string({
      description: "Field name to filter.",
    }),
    fixture: Flags.string({ hidden: true }),
    limit: Flags.integer({
      description: "Maximum matching records to return.",
    }),
    "no-default-owner": Flags.boolean({
      description: "Ignore the stored default owner for this run.",
    }),
    owner: Flags.string({
      description: "Filter records by owner when an owner field is configured.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(FilterCommand);
    const context = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixture: flags.fixture,
    });
    const ownerResult = applyOwnerCriteria({
      ...context,
      commandOwner: flags.owner,
      ignoreDefaultOwner: flags["no-default-owner"],
    });
    const interactive = process.stdin.isTTY && !flags.json;
    const field =
      flags.field ??
      (interactive
        ? await promptSelect({
            choices: Array.from(
              new Set(
                ownerResult.records.flatMap((record) =>
                  Object.keys(record.fields),
                ),
              ),
            ).map((name) => ({ name, value: name })),
            message: "Choose a field to filter",
          })
        : undefined);
    const operator: FilterOperator =
      flags.contains || (!flags.equals && interactive)
        ? interactive && !flags.contains && !flags.equals
          ? await promptSelect({
              choices: [
                { name: "equals", value: "equals" },
                { name: "contains", value: "contains" },
              ],
              message: "Choose a comparison",
            })
          : "contains"
        : "equals";
    const value =
      flags.contains ??
      flags.equals ??
      (interactive
        ? await promptInput({
            message: "Value to match",
            required: true,
          })
        : undefined);
    if (!field || !value) {
      throw new Error(
        "Filter requires --field plus --equals or --contains, or an interactive terminal.",
      );
    }
    const matches = filterRecords(ownerResult.records, field, operator, value);
    const limit = parsePositiveLimit({
      defaultLimit: 20,
      flagLimit: flags.limit,
    });
    const limitedResult = applyQueryLimit(matches, {
      appliedAfter: ["owner", "filter"],
      ...limit,
    });
    const output: CommandOutput = {
      command: "filter",
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
        criteria: {
          field,
          operator,
          value,
        },
        records: limitedResult.items,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
