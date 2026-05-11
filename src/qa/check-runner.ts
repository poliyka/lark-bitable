import { spawn } from "node:child_process";

import type {
  ExecutedQaCheck,
  QaCheckCandidate,
  SkippedQaCheck,
} from "../config/schema.js";
import { redactSecrets, toEvidence } from "../reporting/evidence.js";

export interface RunQaChecksOptions {
  allowExecution: boolean;
  candidates: QaCheckCandidate[];
  timeoutMs?: number;
}

export async function runQaChecks(options: RunQaChecksOptions): Promise<{
  executedChecks: ExecutedQaCheck[];
  skippedChecks: SkippedQaCheck[];
}> {
  const executedChecks: ExecutedQaCheck[] = [];
  const skippedChecks: SkippedQaCheck[] = [];

  for (const candidate of options.candidates) {
    if (
      !options.allowExecution ||
      candidate.safety !== "safe" ||
      candidate.command.length === 0
    ) {
      skippedChecks.push({
        candidateId: candidate.id,
        evidence: candidate.evidence,
        manualNextStep:
          "Run a supported manual QA check and attach command-output evidence.",
        reason:
          candidate.skipReason ??
          (options.allowExecution
            ? "Candidate was not safe to execute."
            : "Automatic check execution was disabled."),
      });
      continue;
    }
    executedChecks.push(await runOne(candidate, options.timeoutMs ?? 120_000));
  }

  if (executedChecks.length === 0 && skippedChecks.length === 0) {
    skippedChecks.push({
      evidence: [],
      manualNextStep:
        "Inspect the selected task manually and collect evidence.",
      reason: "No QA check candidates were discovered.",
    });
  }

  return { executedChecks, skippedChecks };
}

async function runOne(
  candidate: QaCheckCandidate,
  timeoutMs: number,
): Promise<ExecutedQaCheck> {
  const startedAt = new Date().toISOString();
  const [command, ...args] = candidate.command;
  if (!command) {
    throw new Error("QA check candidate command is empty.");
  }

  const result = await new Promise<{
    exitCode: number | null;
    output: string;
    status: "passed" | "failed" | "error";
  }>((resolve) => {
    const child = spawn(command, args, {
      cwd: candidate.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: string[] = [];
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        exitCode: null,
        output: chunks.join(""),
        status: "error",
      });
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => chunks.push(String(chunk)));
    child.stderr?.on("data", (chunk) => chunks.push(String(chunk)));
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        exitCode: null,
        output: `${chunks.join("")}\n${error.message}`,
        status: "error",
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        output: chunks.join(""),
        status: code === 0 ? "passed" : "failed",
      });
    });
  });

  const outputExcerpt = redactSecrets(result.output).slice(0, 4000);
  return {
    candidateId: candidate.id,
    command: candidate.command,
    cwd: candidate.cwd,
    evidence: [
      toEvidence({
        type: "command-output",
        reference: `${candidate.cwd}$ ${candidate.command.join(" ")}`,
        excerpt: outputExcerpt || "(no command output)",
        status: result.status === "passed" ? "verified" : "failed",
      }),
    ],
    exitCode: result.exitCode,
    finishedAt: new Date().toISOString(),
    outputExcerpt,
    startedAt,
    status: result.status,
  };
}
