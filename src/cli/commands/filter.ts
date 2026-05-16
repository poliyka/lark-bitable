import { Flags } from "@oclif/core";
import {
  input as promptInput,
  select as promptSelect,
} from "@inquirer/prompts";
import { z } from "zod";

import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import {
  filterRecordsByCriteria,
  filterRecords,
  type FilterCriterion,
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
    where: Flags.string({
      description:
        'Repeatable JSON criterion: {"field":"狀態","operator":"equals","value":"待處理"}. Criteria are ANDed.',
      multiple: true,
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
    const criteria =
      flags.where?.map(parseWhereCriterion) ??
      (await legacyCriteriaFromFlags({
        contains: flags.contains,
        equals: flags.equals,
        field: flags.field,
        json: Boolean(flags.json),
        records: ownerResult.records,
      }));
    if (criteria.length === 0) {
      throw new Error(
        "Filter requires --where, --field plus --equals or --contains, or an interactive terminal.",
      );
    }
    const legacyCriterion = criteria[0];
    const matches =
      criteria.length === 1 && !flags.where && legacyCriterion
        ? filterRecords(
            ownerResult.records,
            legacyCriterion.field,
            legacyCriterion.operator,
            legacyCriterion.value,
          )
        : filterRecordsByCriteria(ownerResult.records, criteria);
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
        criteria: flags.where ? criteria : criteria[0],
        records: limitedResult.items,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}

const whereCriterionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals", "contains"]),
  value: z.union([z.string(), z.number(), z.boolean()]).transform(String),
});

function parseWhereCriterion(value: string): FilterCriterion {
  try {
    return whereCriterionSchema.parse(JSON.parse(value));
  } catch (error) {
    throw new Error(
      `Invalid --where criterion: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function legacyCriteriaFromFlags(input: {
  contains?: string;
  equals?: string;
  field?: string;
  json: boolean;
  records: Array<{ fields: Record<string, unknown> }>;
}): Promise<FilterCriterion[]> {
  const interactive = process.stdin.isTTY && !input.json;
  const field =
    input.field ??
    (interactive
      ? await promptSelect({
          choices: Array.from(
            new Set(
              input.records.flatMap((record) => Object.keys(record.fields)),
            ),
          ).map((name) => ({ name, value: name })),
          message: "Choose a field to filter",
        })
      : undefined);
  const operator: FilterOperator =
    input.contains || (!input.equals && interactive)
      ? interactive && !input.contains && !input.equals
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
    input.contains ??
    input.equals ??
    (interactive
      ? await promptInput({
          message: "Value to match",
          required: true,
        })
      : undefined);
  return field && value ? [{ field, operator, value }] : [];
}
