import { Flags } from "@oclif/core";

import { defaultAuthPath } from "../../config/auth-store.js";
import { ConfigStore } from "../../config/store.js";
import {
  extractBugCandidates,
  filterActionableCandidates,
  observedStatusValues,
  sortCandidatesByPriority,
} from "../../triage/candidate-sort.js";
import { writeSelection } from "../../triage/selection-state.js";
import {
  applyQueryLimit,
  parsePositiveLimit,
} from "../../mode/owner-filter.js";
import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import {
  applyOwnerCriteria,
  loadRecordCommandData,
} from "../shared-records.js";

export default class TriageCommand extends BaseCommand {
  static description =
    "Guide actionable bug selection by status filtering and priority sorting.";
  static flags = {
    ...BaseCommand.baseFlags,
    "actionable-status": Flags.string({
      description:
        "Exact status value to filter for this run. Omit to inspect all inferred bug candidates.",
    }),
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    "config-cwd": Flags.string({ hidden: true }),
    fixture: Flags.string({ hidden: true }),
    limit: Flags.integer({
      description: "Maximum candidates to return after sorting.",
    }),
    owner: Flags.string({
      description: "Filter candidates by owner using an inferred owner field.",
    }),
    select: Flags.integer({
      description: "Select candidate index without an interactive prompt.",
      hidden: true,
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(TriageCommand);
    const store = new ConfigStore({ cwd: flags["config-cwd"] });
    const context = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixture: flags.fixture,
    });
    const ownerResult = applyOwnerCriteria({
      ...context,
      commandOwner: flags.owner,
    });

    const actionableStatus = flags["actionable-status"];
    const allCandidates = extractBugCandidates(ownerResult.records);
    const candidates = sortCandidatesByPriority(
      filterActionableCandidates(allCandidates, actionableStatus),
    );
    const limit = parsePositiveLimit({
      defaultLimit: 20,
      flagLimit: flags.limit,
    });
    const limitedResult = applyQueryLimit(candidates, {
      appliedAfter: ["owner", "actionable-status", "priority-sort"],
      ...limit,
    });

    if (limitedResult.items.length === 0) {
      const output: CommandOutput = {
        command: "triage",
        status: "partial",
        issues: [
          {
            code: "no-actionable-records",
            message: actionableStatus
              ? "No bug records matched the requested actionable status."
              : "No bug records were available for triage.",
            remediation:
              "Run lark-bitable schema --json to inspect current status values, then pass --actionable-status with the exact table value when status filtering is needed.",
          },
        ],
        mode: {
          active: context.mode.active,
          source: context.mode.source,
        },
        ownerCriteria: ownerResult.criteria,
        queryLimit: limitedResult.queryLimit,
        data: {
          candidates: [],
          criteria: {
            actionableStatus,
            observedStatusValues: observedStatusValues(allCandidates),
          },
        },
      };
      this.emit(output, Boolean(flags.json));
      return output;
    }

    const selectedIndex = flags.select ?? 0;
    const selected = limitedResult.items[selectedIndex];

    if (selected) {
      writeSelection(store, {
        selectedRecordId: selected.record.recordId,
        selectedAt: new Date().toISOString(),
        mode: context.mode.active,
        selectionEvidence: {
          filter: actionableStatus
            ? `status equals ${actionableStatus}`
            : "no actionable-status filter",
          mode: context.mode.active,
          ownerCriteria: ownerResult.criteria,
          queryLimit: limitedResult.queryLimit,
          sort: "inferred priority order",
          displayedRecordIds: limitedResult.items.map(
            (candidate) => candidate.record.recordId,
          ),
        },
        candidateSnapshot: {
          title: selected.title,
          status: selected.status,
          priority: selected.priority,
          owner: selected.owner,
          originalDescription: selected.originalDescription,
          reproductionSteps: selected.reproductionSteps,
          expectedBehavior: selected.expectedBehavior,
          actualBehavior: selected.actualBehavior,
          links: selected.links,
          notes: selected.notes,
          missingFields: selected.missingFields,
        },
      });
    }

    const output: CommandOutput = {
      command: "triage",
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
          actionableStatus,
        },
        candidates: limitedResult.items,
        selectedRecordId: selected?.record.recordId ?? null,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
