import { Flags } from "@oclif/core";

import { defaultAuthPath } from "../../config/auth-store.js";
import { ConfigStore } from "../../config/store.js";
import {
  extractBugCandidates,
  filterActionableCandidates,
  sortCandidatesByPriority,
} from "../../triage/candidate-sort.js";
import { writeSelection } from "../../triage/selection-state.js";
import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { loadRecordCommandData } from "../shared-records.js";

export default class TriageCommand extends BaseCommand {
  static description =
    "Guide actionable bug selection by status filtering and priority sorting.";
  static flags = {
    ...BaseCommand.baseFlags,
    "actionable-status": Flags.string({
      description: "Override actionable status value.",
    }),
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    "config-cwd": Flags.string({ hidden: true }),
    fixture: Flags.string({ hidden: true }),
    select: Flags.integer({
      description: "Select candidate index without an interactive prompt.",
      hidden: true,
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(TriageCommand);
    const store = new ConfigStore({ cwd: flags["config-cwd"] });
    const { records, source } = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixture: flags.fixture,
    });

    const actionableStatus =
      flags["actionable-status"] ?? source.actionableStatus;
    const candidates = sortCandidatesByPriority(
      filterActionableCandidates(
        extractBugCandidates(records, source),
        actionableStatus,
      ),
      source.priorityOrder,
    );

    if (candidates.length === 0) {
      const output: CommandOutput = {
        command: "triage",
        status: "partial",
        issues: [
          {
            code: "no-actionable-records",
            message: "No actionable bug records matched the configured status.",
            remediation:
              "Run lark-bitable list or filter with broader criteria.",
          },
        ],
        data: {
          candidates: [],
          criteria: {
            actionableStatus,
            priorityOrder: source.priorityOrder ?? [],
          },
        },
      };
      this.emit(output, Boolean(flags.json));
      return output;
    }

    const selectedIndex = flags.select ?? 0;
    const selected = candidates[selectedIndex];

    if (selected) {
      writeSelection(store, {
        selectedRecordId: selected.record.recordId,
        selectedAt: new Date().toISOString(),
        selectionEvidence: {
          filter: `${source.statusField} equals ${actionableStatus}`,
          sort: `${source.priorityField} by configured priority order`,
          displayedRecordIds: candidates.map(
            (candidate) => candidate.record.recordId,
          ),
        },
        candidateSnapshot: {
          title: selected.title,
          status: selected.status,
          priority: selected.priority,
          missingFields: selected.missingFields,
        },
      });
    }

    const output: CommandOutput = {
      command: "triage",
      status: "ok",
      source: {
        appToken: source.appToken,
        tableId: source.tableId,
        viewId: source.viewId,
        retrievedAt: new Date().toISOString(),
      },
      data: {
        criteria: {
          actionableStatus,
          priorityOrder: source.priorityOrder ?? [],
        },
        candidates,
        selectedRecordId: selected?.record.recordId ?? null,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
