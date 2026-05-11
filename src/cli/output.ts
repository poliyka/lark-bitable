import type {
  Issue,
  ResearchEvidence,
  SourceMetadata,
} from "../config/schema.js";
import { redactSecrets } from "../reporting/evidence.js";

export type CommandStatus = "ok" | "partial" | "error";

export interface AuthOutput {
  status: "ready" | "missing" | "expired" | "invalid" | "insufficient-scope";
  storagePath?: string;
  domain?: string;
  accountLabel?: string;
  expiresAt?: string;
}

export interface CommandOutput<T = unknown> {
  command: string;
  status: CommandStatus;
  source?: SourceMetadata;
  auth?: AuthOutput;
  evidence?: ResearchEvidence[];
  issues?: Issue[];
  data?: T;
}

export interface NormalizedCommandOutput<T = unknown> {
  command: string;
  status: CommandStatus;
  source: SourceMetadata | null;
  auth: AuthOutput | null;
  evidence: ResearchEvidence[];
  issues: Issue[];
  data: T | null;
}

export function normalizeOutput<T>(
  output: CommandOutput<T>,
): NormalizedCommandOutput<T> {
  return {
    command: output.command,
    status: output.status,
    source: output.source ?? null,
    auth: output.auth ?? null,
    evidence: output.evidence ?? [],
    issues: output.issues ?? [],
    data: output.data ?? null,
  };
}

export function formatJson(output: CommandOutput): string {
  return redactSecrets(JSON.stringify(normalizeOutput(output), null, 2));
}

export function formatHuman(output: CommandOutput): string {
  const normalized = normalizeOutput(output);
  const lines = [
    `command: ${normalized.command}`,
    `status: ${normalized.status}`,
  ];

  if (normalized.auth) {
    lines.push(`auth: ${normalized.auth.status}`);
  }

  if (normalized.source) {
    lines.push(
      `source: app=${normalized.source.appToken} table=${normalized.source.tableId}` +
        (normalized.source.viewId ? ` view=${normalized.source.viewId}` : ""),
    );
  }

  for (const issue of normalized.issues) {
    lines.push(`issue: ${issue.code} - ${issue.message}`);
    if (issue.remediation) lines.push(`remediation: ${issue.remediation}`);
  }

  if (normalized.evidence.length > 0) {
    lines.push(`evidence: ${normalized.evidence.length}`);
  }

  if (normalized.data !== null) {
    lines.push(`data: ${JSON.stringify(normalized.data)}`);
  }

  return redactSecrets(lines.join("\n"));
}

export function writeOutput(output: CommandOutput, json = false): void {
  process.stdout.write(`${json ? formatJson(output) : formatHuman(output)}\n`);
}
