import { Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import {
  applyQueryLimit,
  parsePositiveLimit,
} from "../../mode/owner-filter.js";
import {
  applyOwnerCriteria,
  loadRecordCommandData,
  selectFields,
} from "../shared-records.js";

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
      description: "Maximum records to return.",
    }),
    "no-default-owner": Flags.boolean({
      description: "Ignore the stored default owner for this run.",
    }),
    owner: Flags.string({
      description: "Filter records by owner when an owner field is configured.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(ListCommand);
    const context = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixture: flags.fixture,
    });
    const { criteria, records } = applyOwnerCriteria({
      ...context,
      commandOwner: flags.owner,
      ignoreDefaultOwner: flags["no-default-owner"],
    });
    const limit = parsePositiveLimit({
      defaultLimit: 20,
      flagLimit: flags.limit,
    });
    const limitedResult = applyQueryLimit(records, {
      appliedAfter: ["owner"],
      ...limit,
    });
    const limited = selectFields(limitedResult.items, flags.field ?? []);
    const output: CommandOutput = {
      command: "list",
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
      ownerCriteria: criteria,
      queryLimit: limitedResult.queryLimit,
      data: {
        records: limited,
        pagination: {
          limit: limitedResult.queryLimit.limit,
          returned: limited.length,
          hasMore: limitedResult.queryLimit.hasMore,
        },
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
