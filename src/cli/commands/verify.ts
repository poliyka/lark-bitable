import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { Args, Flags } from "@oclif/core";

import { defaultAuthPath } from "../../config/auth-store.js";
import type { QaVerificationResult } from "../../config/schema.js";
import { LarkClient, createLarkSdkTransport } from "../../lark/client.js";
import { extractMediaReferences } from "../../lark/record-mapper.js";
import {
  applyQueryLimit,
  parsePositiveLimit,
} from "../../mode/owner-filter.js";
import { discoverQaChecks } from "../../qa/check-discovery.js";
import { runQaChecks } from "../../qa/check-runner.js";
import { renderQaVerificationReport } from "../../qa/verification-report.js";
import { dedupeEvidence, toEvidence } from "../../reporting/evidence.js";
import { BaseCommand } from "../base-command.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";
import {
  applyOwnerCriteria,
  loadRecordCommandData,
} from "../shared-records.js";

export default class VerifyCommand extends BaseCommand {
  static args = {
    recordId: Args.string({
      description:
        "Stable Lark record id to verify. Defaults to last triage selection.",
      required: false,
    }),
  };
  static description = "QA mode verification for a selected Bitable task.";
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    checks: Flags.string({
      default: "auto",
      description: "Check execution scope.",
      options: ["auto", "none", "unit", "integration", "e2e"],
    }),
    "config-cwd": Flags.string({ hidden: true }),
    fixture: Flags.string({ hidden: true }),
    limit: Flags.integer({
      description:
        "Maximum table records to inspect when validating the requested task.",
    }),
    "no-default-owner": Flags.boolean({
      description: "Ignore the stored default owner for this run.",
    }),
    out: Flags.string({
      description: "Path to write the Markdown QA verification report.",
    }),
    owner: Flags.string({
      description:
        "Validate the task against an owner filter when an owner field is configured.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { args, flags } = await this.parse(VerifyCommand);
    const context = await loadRecordCommandData({
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      fixture: flags.fixture,
    });
    if (context.mode.active !== "QA") {
      throw new CliError({
        code: "wrong-mode",
        message: "QA verification requires active mode QA.",
        remediation: "Run lark-bitable configure --mode QA",
      });
    }

    const ownerResult = applyOwnerCriteria({
      ...context,
      commandOwner: flags.owner,
      ignoreDefaultOwner: flags["no-default-owner"],
    });
    const limit = parsePositiveLimit({
      defaultLimit: 20,
      flagLimit: flags.limit,
    });
    const limitedResult = applyQueryLimit(ownerResult.records, {
      appliedAfter: ["owner", "record-validation"],
      ...limit,
    });
    const selection = context.configStore.getSelection();
    const recordId = args.recordId ?? selection?.selectedRecordId;
    if (!recordId) {
      throw new CliError({
        code: "missing-selection",
        message: "Verify requires a record id or previous triage selection.",
        remediation:
          "Run lark-bitable triage or lark-bitable verify <record-id>.",
      });
    }

    const knownTableRecord = context.records.find(
      (item) => item.recordId === recordId,
    );
    const ownerVisibleRecord = ownerResult.records.find(
      (item) => item.recordId === recordId,
    );
    if (
      ownerResult.criteria.applied &&
      knownTableRecord &&
      !ownerVisibleRecord
    ) {
      throw new CliError({
        code: "owner-record-mismatch",
        message: "Selected task record does not match the active owner filter.",
        remediation:
          "Run lark-bitable verify <record-id> --no-default-owner, choose a record from the owner-filtered list, or configure the correct default owner.",
      });
    }

    const record =
      ownerVisibleRecord ??
      knownTableRecord ??
      (!flags.fixture
        ? await new LarkClient(createLarkSdkTransport(context.auth)).getRecord(
            context.source,
            recordId,
          )
        : undefined);
    if (!record) {
      throw new CliError({
        code: "record-not-found",
        message: "Selected task record is not readable.",
        remediation:
          "Run lark-bitable list and verify an accessible record id.",
      });
    }

    const mediaReferences = extractMediaReferences(record);
    const taskEvidence = toEvidence({
      type: "bug-record",
      reference: record.recordId,
      excerpt: JSON.stringify(record.fields).slice(0, 4000),
      status: "verified",
    });
    const mediaEvidence = mediaReferences.map((media) =>
      toEvidence({
        type: "lark-media",
        reference: media.fileToken,
        excerpt:
          "Media reference found in selected record. Download with lark-bitable media download before treating its contents as evidence.",
        status: "not-run",
      }),
    );
    const candidates = filterCandidates(
      discoverQaChecks(process.cwd()),
      flags.checks,
    );
    const { executedChecks, skippedChecks } = await runQaChecks({
      allowExecution: flags.checks !== "none",
      candidates,
    });
    const workspaceEvidence = candidates.flatMap(
      (candidate) => candidate.evidence,
    );
    const evidence = dedupeEvidence([
      taskEvidence,
      ...mediaEvidence,
      ...workspaceEvidence,
      ...executedChecks.flatMap((check) => check.evidence),
      ...skippedChecks.flatMap((check) => check.evidence),
    ]);
    const result: QaVerificationResult = {
      assumptions: [
        "Root cause is not confirmed by QA verification unless separate evidence is cited.",
      ],
      checkCandidates: candidates,
      evidence,
      executedChecks,
      manualNextSteps: skippedChecks.map((check) => check.manualNextStep),
      mode: "QA",
      nextActions: [
        mediaReferences.length > 0
          ? "Download and inspect listed media references with lark-bitable media download."
          : "Attach reproduction evidence if automated checks are inconclusive.",
      ],
      observedFacts: [
        `Selected task record ${record.recordId} was read from Lark. [${taskEvidence.id}]`,
        ...executedChecks.map(
          (check) =>
            `Executed ${check.command.join(" ")} with status ${check.status}. [${check.evidence[0]?.id}]`,
        ),
      ],
      risks: [
        ...(mediaReferences.length > 0
          ? [
              "Record contains media references that were not automatically inspected.",
            ]
          : []),
        ...(executedChecks.length === 0
          ? ["No automated QA check was executed."]
          : []),
      ],
      ownerCriteria: ownerResult.criteria,
      skippedChecks,
      taskSummary: {
        recordId: record.recordId,
        title: titleFromRecord(record),
        mediaReferences,
      },
      workspaceEvidence,
    };
    const report = renderQaVerificationReport(result);
    if (flags.out) {
      await mkdir(dirname(flags.out), { recursive: true });
      await writeFile(flags.out, report, "utf8");
    }

    const output: CommandOutput = {
      command: "verify",
      status: executedChecks.some((check) => check.status === "failed")
        ? "partial"
        : "ok",
      evidence,
      mode: {
        active: context.mode.active,
        source: context.mode.source,
      },
      ownerCriteria: ownerResult.criteria,
      queryLimit: limitedResult.queryLimit,
      source: {
        appToken: context.source.appToken,
        tableId: context.source.tableId,
        viewId: context.source.viewId,
        retrievedAt: new Date().toISOString(),
      },
      data: {
        ...result,
        report,
        reportPath: flags.out ?? null,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}

function filterCandidates(
  candidates: ReturnType<typeof discoverQaChecks>,
  checks: string,
) {
  if (checks === "auto" || checks === "none") return candidates;
  const kindMap: Record<string, string> = {
    e2e: "e2e-test",
    integration: "integration-test",
    unit: "unit-test",
  };
  return candidates.filter((candidate) => candidate.kind === kindMap[checks]);
}

function titleFromRecord(record: { fields: Record<string, unknown> }): string {
  const preferred = ["問題名稱", "问题名称", "标题", "標題", "title", "Title"];
  for (const key of preferred) {
    const value = record.fields[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return JSON.stringify(record.fields).slice(0, 120);
}
