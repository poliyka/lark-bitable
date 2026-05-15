import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  AuditLogEntry,
  AuditCommandStatus,
  WorkflowMode,
} from "../config/schema.js";
import { parseAuditEntryWithDerivedDuration } from "./log.js";
import { redactSecrets } from "../reporting/evidence.js";

const REDACTED = "[REDACTED]";
const sensitiveKeyPattern =
  /(access[_-]?token|accessToken|app[_-]?secret|appSecret|authorization|client[_-]?token|clientToken|code|refresh[_-]?token|refreshToken|secret|tenant[_-]?access[_-]?token|tenant_access_token|token)$/i;

export interface AuditQueryInput {
  auditPath: string;
  command?: string;
  cursor?: string;
  from?: string;
  hasError?: boolean;
  hasEvidence?: boolean;
  issueCode?: string;
  limit?: number;
  mode?: WorkflowMode;
  source?: string;
  status?: AuditCommandStatus;
  text?: string;
  to?: string;
}

export interface SkippedAuditFile {
  line?: number;
  path: string;
  reason: string;
}

export async function queryAuditEntries(input: AuditQueryInput): Promise<{
  entries: AuditEntrySummary[];
  nextCursor: string | null;
  skippedFiles: SkippedAuditFile[];
}> {
  const { entries, skippedFiles } = await readAuditEntries(input.auditPath);
  const filtered = entries
    .filter((entry) => matchesAuditQuery(entry, input))
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  const offset = Number.parseInt(input.cursor ?? "0", 10) || 0;
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const page = filtered.slice(offset, offset + limit);
  return {
    entries: page.map(summarizeAuditEntry),
    nextCursor:
      offset + limit < filtered.length ? String(offset + limit) : null,
    skippedFiles,
  };
}

export async function getAuditEntry(input: {
  auditPath: string;
  id: string;
}): Promise<{ entry: AuditLogEntry; skippedFiles: SkippedAuditFile[] } | null> {
  const { entries, skippedFiles } = await readAuditEntries(input.auditPath);
  const entry = entries.find((candidate) => candidate.id === input.id);
  return entry ? { entry: redactAuditEntry(entry), skippedFiles } : null;
}

export interface AuditEntrySummary {
  command: string;
  durationMs: number;
  evidenceSummary: AuditLogEntry["evidenceSummary"];
  finishedAt: string;
  id: string;
  issues: AuditLogEntry["issues"];
  mode: AuditLogEntry["mode"];
  startedAt: string;
  status: AuditLogEntry["status"];
}

async function readAuditEntries(auditPath: string): Promise<{
  entries: AuditLogEntry[];
  skippedFiles: SkippedAuditFile[];
}> {
  const skippedFiles: SkippedAuditFile[] = [];
  const entries: AuditLogEntry[] = [];
  for (const path of await discoverAuditFiles(auditPath, skippedFiles)) {
    try {
      const raw = await readFile(path, "utf8");
      if (!raw.trim()) continue;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { entries?: unknown[] }).entries)
        ) {
          for (const entry of (parsed as { entries: unknown[] }).entries) {
            entries.push(redactAuditEntry(parseAuditEntry(entry)));
          }
          continue;
        }
      } catch {
        // Line-delimited audit files are expected to fail whole-file parsing.
      }
      raw
        .split("\n")
        .map((line, index) => ({ index, line }))
        .filter(({ line }) => line.trim())
        .forEach(({ index, line }) => {
          try {
            entries.push(redactAuditEntry(parseAuditEntry(JSON.parse(line))));
          } catch (error) {
            skippedFiles.push({
              line: index + 1,
              path,
              reason: `invalid audit entry: ${(error as Error).message}`,
            });
          }
        });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        skippedFiles.push({
          path,
          reason: `invalid audit file: ${(error as Error).message}`,
        });
      }
    }
  }
  return { entries, skippedFiles };
}

function parseAuditEntry(entry: unknown): AuditLogEntry {
  return parseAuditEntryWithDerivedDuration(entry);
}

async function discoverAuditFiles(
  auditPath: string,
  skippedFiles: SkippedAuditFile[],
): Promise<string[]> {
  const dir = dirname(auditPath);
  try {
    const files = await readdir(dir);
    return [
      auditPath,
      ...files
        .filter((file) => /^audit-\d{4}-\d{2}-\d{2}\.json$/.test(file))
        .map((file) => join(dir, file)),
    ];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      skippedFiles.push({
        path: dir,
        reason: `invalid audit directory: ${(error as Error).message}`,
      });
    }
    return [auditPath];
  }
}

function matchesAuditQuery(entry: AuditLogEntry, input: AuditQueryInput) {
  const text = input.text?.toLowerCase();
  return (
    (!input.command || entry.command === input.command) &&
    (!input.status || entry.status === input.status) &&
    (!input.mode || entry.mode?.active === input.mode) &&
    (!input.source ||
      [entry.source?.appToken, entry.source?.tableId, entry.source?.viewId]
        .filter(Boolean)
        .join(" ")
        .includes(input.source)) &&
    (!input.issueCode ||
      entry.issues.some((issue) => issue.code === input.issueCode)) &&
    (input.hasEvidence === undefined ||
      entry.evidenceSummary.length > 0 === input.hasEvidence) &&
    (input.hasError === undefined || Boolean(entry.error) === input.hasError) &&
    (!input.from || entry.finishedAt >= input.from) &&
    (!input.to || entry.finishedAt <= input.to) &&
    (!text || JSON.stringify(entry).toLowerCase().includes(text))
  );
}

function summarizeAuditEntry(entry: AuditLogEntry): AuditEntrySummary {
  return {
    command: entry.command,
    durationMs: entry.durationMs,
    evidenceSummary: entry.evidenceSummary,
    finishedAt: entry.finishedAt,
    id: entry.id,
    issues: entry.issues,
    mode: entry.mode,
    startedAt: entry.startedAt,
    status: entry.status,
  };
}

function redactAuditEntry(entry: AuditLogEntry): AuditLogEntry {
  return redactAuditValue(entry) as AuditLogEntry;
}

function redactAuditValue(value: unknown, key?: string): unknown {
  if (key && sensitiveKeyPattern.test(key)) return REDACTED;
  if (typeof value === "string") {
    return redactSecrets(value)
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
      .replace(
        /(access[_-]?token|accessToken|app[_-]?secret|appSecret|authorization|client[_-]?token|clientToken|code|refresh[_-]?token|refreshToken|secret|tenant[_-]?access[_-]?token|tenant_access_token|token)\s*[:=]\s*["']?[^"',\s}]+/gi,
        "$1=[REDACTED]",
      );
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditValue(item));
  }
  if (typeof value === "object") {
    if (isIssueLike(value)) return redactAuditIssue(value);
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([entryKey, entryValue]) => [
          entryKey,
          redactAuditValue(entryValue, entryKey),
        ],
      ),
    );
  }
  return typeof value;
}

function isIssueLike(value: unknown): value is {
  code: string;
  message: string;
  remediation?: string;
} {
  if (!value || typeof value !== "object") return false;
  return (
    typeof (value as { code?: unknown }).code === "string" &&
    typeof (value as { message?: unknown }).message === "string" &&
    ("remediation" in value
      ? typeof (value as { remediation?: unknown }).remediation === "string"
      : true)
  );
}

function redactAuditIssue(issue: {
  code: string;
  message: string;
  remediation?: string;
}) {
  return {
    code: redactAuditString(issue.code),
    message: redactAuditString(issue.message),
    ...(issue.remediation
      ? { remediation: redactAuditString(issue.remediation) }
      : {}),
  };
}

function redactAuditString(value: string): string {
  return redactSecrets(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(
      /(access[_-]?token|accessToken|app[_-]?secret|appSecret|authorization|client[_-]?token|clientToken|code|refresh[_-]?token|refreshToken|secret|tenant[_-]?access[_-]?token|tenant_access_token|token)\s*[:=]\s*["']?[^"',\s}]+/gi,
      "$1=[REDACTED]",
    );
}
