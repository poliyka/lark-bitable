import { Flags } from "@oclif/core";

import { ConfigStore } from "../../config/store.js";
import { resolveWorkflowMode } from "../../mode/mode-config.js";
import { parseEvidenceArgument } from "../../reporting/repository-context.js";
import {
  buildStructuredResearchReport,
  renderStructuredResearchReport,
} from "../../reporting/research-report.js";
import {
  createResearchOutputLink,
  defaultResearchDir,
  updateResearchReportLinkStatus,
  writeCanonicalResearchReport,
} from "../../reporting/research-store.js";
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
      char: "o",
      description: "Path to create as a symlink to the canonical JSON report.",
    }),
    "research-dir": Flags.string({
      default: defaultResearchDir(),
      hidden: true,
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
    const structuredReport = buildStructuredResearchReport({
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
    const report = renderStructuredResearchReport(structuredReport);
    const canonical = await writeCanonicalResearchReport({
      report: {
        ...structuredReport,
        markdown: report,
      },
      researchDir: flags["research-dir"],
    });
    const link = await createResearchOutputLink({
      canonicalPath: canonical.canonicalPath,
      outputPath: flags.out,
    });
    const reportFile = await updateResearchReportLinkStatus(
      canonical.canonicalPath,
      link,
    );
    const issues = [
      ...(mode.active === "QA"
        ? [
            {
              code: "qa-mode-research",
              message:
                "Research is Developer-oriented; QA mode should normally use verify.",
              remediation:
                "Run lark-bitable verify, or switch with lark-bitable configure --mode Developer.",
            },
          ]
        : []),
      ...(link.outputLinkStatus === "failed" ||
      link.outputLinkStatus === "unsupported"
        ? [
            {
              code: "research-output-link-failed",
              message:
                link.outputLinkError ??
                `Research output link status is ${link.outputLinkStatus}.`,
              remediation:
                "Use the canonical reportPath, remove the existing output path, or choose another -o path.",
            },
          ]
        : []),
    ];

    const output: CommandOutput = {
      command: "research",
      status:
        link.outputLinkStatus === "failed" ||
        link.outputLinkStatus === "unsupported"
          ? "partial"
          : "ok",
      evidence,
      mode: {
        active: mode.active,
        source: mode.source,
      },
      issues: issues.length > 0 ? issues : undefined,
      data: {
        mode: "Developer",
        selectionMode: selectedBug.mode ?? null,
        ownerCriteria: selectedBug.selectionEvidence.ownerCriteria ?? null,
        report,
        reportFile,
        reportPath: reportFile.canonicalPath,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
