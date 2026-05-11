import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { Flags } from "@oclif/core";

import { ConfigStore } from "../../config/store.js";
import { resolveWorkflowMode } from "../../mode/mode-config.js";
import { parseEvidenceArgument } from "../../reporting/repository-context.js";
import { renderResearchReport } from "../../reporting/research-report.js";
import { toEvidence } from "../../reporting/evidence.js";
import { BaseCommand } from "../base-command.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";

export default class ResearchCommand extends BaseCommand {
  static description =
    "Produce an evidence-backed first research report for the selected bug.";
  static flags = {
    ...BaseCommand.baseFlags,
    "config-cwd": Flags.string({ hidden: true }),
    evidence: Flags.string({
      description: "Evidence as type:reference:excerpt.",
      multiple: true,
    }),
    out: Flags.string({
      description: "Path to write the Markdown report.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(ResearchCommand);
    const store = new ConfigStore({ cwd: flags["config-cwd"] });
    const mode = resolveWorkflowMode(store);
    const selectedBug = store.getSelection();
    if (!selectedBug) {
      throw new CliError({
        code: "missing-selection",
        message: "Research requires a selected bug.",
        remediation: "Run lark-bitable triage first.",
      });
    }

    const evidence = [
      toEvidence({
        type: "bug-record",
        reference: selectedBug.selectedRecordId,
        excerpt: JSON.stringify(selectedBug.candidateSnapshot),
        status: "verified",
      }),
      ...(flags.evidence ?? []).map((item) => parseEvidenceArgument(item)),
    ];
    const report = renderResearchReport({
      selectedBug,
      evidence,
      repositoryFindings: evidence
        .filter((item) => item.type === "repository-file")
        .map((item) => `${item.excerpt} [${item.id}]`),
      assumptions: ["Repository analysis is limited to provided evidence."],
      likelyCauses: ["Unconfirmed until reproduction evidence is collected."],
      recommendedFixes: ["Inspect cited repository areas before editing."],
      risks: ["Missing runtime reproduction can hide the actual cause."],
      nextActions: ["Collect command-output evidence before implementation."],
    });

    if (flags.out) {
      await mkdir(dirname(flags.out), { recursive: true });
      await writeFile(flags.out, report, "utf8");
    }

    const output: CommandOutput = {
      command: "research",
      status: "ok",
      evidence,
      mode: {
        active: mode.active,
        source: mode.source,
      },
      issues:
        mode.active === "QA"
          ? [
              {
                code: "qa-mode-research",
                message:
                  "Research is Developer-oriented; QA mode should normally use verify.",
                remediation:
                  "Run lark-bitable verify, or switch with lark-bitable configure --mode Developer.",
              },
            ]
          : undefined,
      data: {
        mode: "Developer",
        selectionMode: selectedBug.mode ?? null,
        ownerCriteria: selectedBug.selectionEvidence.ownerCriteria ?? null,
        report,
        reportPath: flags.out ?? null,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
