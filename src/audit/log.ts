import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { homedir, tmpdir } from "node:os";

import {
  auditLogEntrySchema,
  auditLogFileSchema,
  type AuditLogEntry,
  type Issue,
  type ResearchEvidence,
} from "../config/schema.js";
import { redactSecrets } from "../reporting/evidence.js";
import type { CommandOutput } from "../cli/output.js";

const AUDIT_RETENTION_DAYS = 14;
const AUDIT_LOCK_TIMEOUT_MS = 2000;
const AUDIT_LOCK_RETRY_MS = 25;
const MAX_STRING_LENGTH = 4000;
const MAX_SNAPSHOT_LENGTH = 64 * 1024;
const REDACTED = "[REDACTED]";

const sensitiveFlagNames = new Set([
  "app-secret",
  "audit-token",
  "authorization",
  "client-token",
  "code",
  "lark-app-secret",
  "mock-access-token",
  "mock-refresh-token",
  "refresh-token",
  "token",
]);

const sensitiveKeyPattern =
  /(access[_-]?token|accessToken|app[_-]?secret|appSecret|authorization|client[_-]?token|clientToken|code|mock[_-]?(access|refresh)[_-]?token|refresh[_-]?token|refreshToken|secret|tenant[_-]?access[_-]?token|tenant_access_token|token)$/i;

export interface BuildAuditEntryInput {
  argv: string[];
  error?: Error & { code?: string };
  finishedAt?: Date;
  output: CommandOutput;
  startedAt?: Date;
}

export interface AppendAuditOptions {
  lockTimeoutMs?: number;
  now?: Date;
}

export type AppendAuditResult =
  | { ok: true; path: string; prunedEntries: number }
  | { ok: false; path: string; error: Error; prunedEntries: 0 };

export function defaultAuditPath(home = homedir()): string {
  return join(home, ".lark-bitable", "logs", "audit.json");
}

export function resolveAuditPath(home = homedir()): string {
  const environmentPath = process.env.LARK_BITABLE_AUDIT_PATH?.trim();
  return environmentPath ? environmentPath : defaultAuditPath(home);
}

export function sanitizeAuditArgv(argv: string[]): string[] {
  const sanitized: string[] = [];
  let redactNext = false;

  for (const item of argv) {
    if (redactNext) {
      sanitized.push(REDACTED);
      redactNext = false;
      continue;
    }

    if (!item.startsWith("--")) {
      sanitized.push(redactString(item));
      continue;
    }

    const withoutPrefix = item.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    const flagName =
      equalsIndex >= 0 ? withoutPrefix.slice(0, equalsIndex) : withoutPrefix;
    if (isSensitiveFlag(flagName)) {
      if (equalsIndex >= 0) {
        sanitized.push(`--${flagName}=${REDACTED}`);
      } else {
        sanitized.push(item);
        redactNext = true;
      }
      continue;
    }

    sanitized.push(redactString(item));
  }

  return sanitized;
}

export function buildAuditEntry(input: BuildAuditEntryInput): AuditLogEntry {
  const startedAt = input.startedAt ?? new Date();
  const finishedAt = input.finishedAt ?? new Date();
  const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
  const normalizedOutput = normalizeOutputForAudit(input.output);

  return {
    id: randomUUID(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs,
    command: input.output.command,
    argv: sanitizeAuditArgv(input.argv),
    status: input.output.status,
    exitCode: input.output.status === "error" ? 1 : 0,
    source: normalizedOutput.source,
    auth: normalizedOutput.auth,
    mode: normalizedOutput.mode,
    ownerCriteria: normalizedOutput.ownerCriteria,
    queryLimit: normalizedOutput.queryLimit,
    issues: sanitizeIssues(input.output.issues ?? []),
    evidenceSummary: summarizeEvidence(input.output.evidence ?? []),
    dataSnapshot: snapshotValue(input.output.data ?? null),
    ...(input.error
      ? {
          error: {
            name: input.error.name || "Error",
            message: redactString(input.error.message || "Unknown error"),
            ...(input.error.code
              ? { code: redactString(String(input.error.code)) }
              : {}),
          },
        }
      : {}),
    retentionApplied: {
      retentionDays: AUDIT_RETENTION_DAYS,
      prunedEntries: 0,
    },
  };
}

export function appendAuditEntry(
  path: string,
  entry: AuditLogEntry,
  options: AppendAuditOptions = {},
): AppendAuditResult {
  try {
    return withAuditLock(path, options, () => {
      const now = options.now ?? new Date();
      rotateActiveAuditLog(path, now);
      const prunedEntries = pruneRotatedAuditLogs(path, now);
      const nextEntry: AuditLogEntry = {
        ...entry,
        retentionApplied: {
          retentionDays: AUDIT_RETENTION_DAYS,
          prunedEntries,
        },
      };

      appendAuditLine(path, auditLogEntrySchema.parse(nextEntry));
      return {
        ok: true,
        path,
        prunedEntries,
      };
    });
  } catch (error) {
    return {
      ok: false,
      path,
      error: error instanceof Error ? error : new Error(String(error)),
      prunedEntries: 0,
    };
  }
}

function withAuditLock<T>(
  path: string,
  options: AppendAuditOptions,
  fn: () => T,
): T {
  ensureAuditDir(path);
  const lockPath = `${path}.lock`;
  const timeoutMs = options.lockTimeoutMs ?? AUDIT_LOCK_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  let acquired = false;

  while (!acquired) {
    try {
      mkdirSync(lockPath, { mode: 0o700 });
      acquired = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for audit log lock: ${lockPath}`);
      }
      sleepSync(Math.min(AUDIT_LOCK_RETRY_MS, deadline - Date.now()));
    }
  }

  try {
    return fn();
  } finally {
    if (existsSync(lockPath)) {
      rmSync(lockPath, { force: true, recursive: true });
    }
  }
}

function sleepSync(ms: number): void {
  if (ms <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

interface AuditLogReadResult {
  entries: AuditLogEntry[];
  format: "missing" | "empty" | "lines" | "wrapped";
}

function readAuditLog(path: string): AuditLogReadResult {
  try {
    const raw = readFileSync(path, "utf8");
    if (raw.trim().length === 0) {
      return { entries: [], format: "empty" };
    }

    try {
      const wrapped = auditLogFileSchema.safeParse(JSON.parse(raw));
      if (wrapped.success) {
        return {
          entries: validateAuditEntries(wrapped.data.entries),
          format: "wrapped",
        };
      }
    } catch {
      // Multi-line audit files are expected to fail whole-file JSON parsing.
    }

    return {
      entries: readAuditLines(raw),
      format: "lines",
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { entries: [], format: "missing" };
    }
    throw error;
  }
}

function readAuditLines(raw: string): AuditLogEntry[] {
  return validateAuditEntries(
    raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => auditLogEntrySchema.parse(JSON.parse(line))),
  );
}

function validateAuditEntries(entries: AuditLogEntry[]): AuditLogEntry[] {
  for (const entry of entries) {
    timestampForRetention(entry);
  }
  return entries;
}

function rotateActiveAuditLog(path: string, now: Date): void {
  const active = readAuditLog(path);
  if (active.format === "missing") return;

  if (active.entries.length === 0) {
    if (active.format !== "empty") writeAuditLines(path, []);
    return;
  }

  const currentDay = dayKeyForDate(now);
  const currentEntries: AuditLogEntry[] = [];
  const rotatedEntries = new Map<string, AuditLogEntry[]>();

  for (const entry of active.entries) {
    const entryDay = dayKeyForEntry(entry);
    if (entryDay === currentDay) {
      currentEntries.push(entry);
      continue;
    }

    const entries = rotatedEntries.get(entryDay) ?? [];
    entries.push(entry);
    rotatedEntries.set(entryDay, entries);
  }

  for (const [day, entries] of rotatedEntries) {
    appendEntriesToRotatedLog(path, day, entries);
  }

  if (active.format === "wrapped" || rotatedEntries.size > 0) {
    writeAuditLines(path, currentEntries);
  }
}

function appendEntriesToRotatedLog(
  path: string,
  activeDay: string,
  entries: AuditLogEntry[],
): void {
  const targetPath = rotatedAuditPath(path, activeDay);
  const existing = readAuditLog(targetPath);
  if (existing.format !== "missing") {
    writeAuditLines(targetPath, [...existing.entries, ...entries]);
  } else {
    writeAuditLines(targetPath, entries);
  }
}

function pruneRotatedAuditLogs(path: string, now: Date): number {
  const targetDir = dirname(path);
  if (!existsSync(targetDir)) return 0;

  const cutoffDay = retentionCutoffDay(now);
  let prunedEntries = 0;
  for (const fileName of readdirSync(targetDir)) {
    const match = /^audit-(\d{4}-\d{2}-\d{2})\.json$/.exec(fileName);
    const rotatedDay = match?.[1];
    if (!rotatedDay || rotatedDay >= cutoffDay) continue;

    const expiredPath = join(targetDir, fileName);
    prunedEntries += countAuditEntries(expiredPath);
    rmSync(expiredPath, { force: true });
  }
  return prunedEntries;
}

function countAuditEntries(path: string): number {
  try {
    const count = readAuditLog(path).entries.length;
    return count > 0 ? count : 1;
  } catch {
    return 1;
  }
}

function appendAuditLine(path: string, entry: AuditLogEntry): void {
  ensureAuditDir(path);
  appendFileSync(path, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function writeAuditLines(path: string, entries: AuditLogEntry[]): void {
  ensureAuditDir(path);
  const tempDir = mkdtempSync(join(tmpdir(), "lark-bitable-audit-"));
  const tempPath = join(tempDir, "audit-lines.json");
  try {
    const content =
      entries.length > 0
        ? `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`
        : "";
    writeFileSync(tempPath, content, {
      mode: 0o600,
    });
    chmodSync(tempPath, 0o600);
    renameSync(tempPath, path);
    chmodSync(path, 0o600);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function ensureAuditDir(path: string): void {
  const targetDir = dirname(path);
  const existed = existsSync(targetDir);
  mkdirSync(targetDir, { recursive: true, mode: 0o700 });
  if (!existed) chmodSync(targetDir, 0o700);
}

function rotatedAuditPath(path: string, day: string): string {
  return join(dirname(path), `audit-${day}.json`);
}

function dayKeyForEntry(entry: AuditLogEntry): string {
  return new Date(timestampForRetention(entry)).toISOString().slice(0, 10);
}

function dayKeyForDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function retentionCutoffDay(now: Date): string {
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  cutoff.setUTCDate(cutoff.getUTCDate() - (AUDIT_RETENTION_DAYS - 1));
  return dayKeyForDate(cutoff);
}

function timestampForRetention(entry: AuditLogEntry): number {
  const raw = entry.finishedAt || entry.startedAt;
  const time = Date.parse(raw);
  if (Number.isNaN(time)) {
    throw new Error(`Invalid audit timestamp: ${raw}`);
  }
  return time;
}

function normalizeOutputForAudit(output: CommandOutput) {
  return {
    source: output.source ?? null,
    auth: output.auth
      ? {
          status: output.auth.status,
          storagePath: output.auth.storagePath,
          domain: output.auth.domain,
          accountLabel: output.auth.accountLabel,
          expiresAt: output.auth.expiresAt,
        }
      : null,
    mode: output.mode ?? null,
    ownerCriteria: output.ownerCriteria ?? null,
    queryLimit: output.queryLimit ?? null,
  };
}

function sanitizeIssues(issues: Issue[]): Issue[] {
  return issues.map((issue) => ({
    code: redactString(issue.code),
    message: redactString(issue.message),
    ...(issue.remediation
      ? { remediation: redactString(issue.remediation) }
      : {}),
  }));
}

function summarizeEvidence(evidence: ResearchEvidence[]) {
  return evidence.map((item) => ({
    id: item.id,
    type: item.type,
    reference: redactString(item.reference),
    collectedAt: item.collectedAt,
    status: item.status,
  }));
}

function snapshotValue(value: unknown): unknown {
  const snapshot = sanitizeValue(value);
  const serialized = JSON.stringify(snapshot);
  if (serialized.length <= MAX_SNAPSHOT_LENGTH) return snapshot;

  return {
    truncated: true,
    originalBytes: Buffer.byteLength(serialized, "utf8"),
    summary:
      snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
        ? Object.keys(snapshot).slice(0, 50)
        : typeof snapshot,
  };
}

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && sensitiveKeyPattern.test(key)) return REDACTED;

  if (typeof value === "string") return redactString(value);
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[entryKey] = sanitizeValue(entryValue, entryKey);
    }
    return result;
  }
  return typeof value;
}

function redactString(value: string): string {
  const redacted = redactSecrets(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(
      /"(access[_-]?token|accessToken|app[_-]?secret|appSecret|authorization|client[_-]?token|clientToken|code|mock[_-]?(access|refresh)[_-]?token|refresh[_-]?token|refreshToken|secret|tenant[_-]?access[_-]?token|tenant_access_token|token)"\s*:\s*"[^"]*"/gi,
      '"$1":"[REDACTED]"',
    )
    .replace(
      /\\+"(access[_-]?token|accessToken|app[_-]?secret|appSecret|authorization|client[_-]?token|clientToken|code|mock[_-]?(access|refresh)[_-]?token|refresh[_-]?token|refreshToken|secret|tenant[_-]?access[_-]?token|tenant_access_token|token)\\+"\s*:\s*\\+"[^"\\]*\\+"/gi,
      '\\"$1\\":\\"[REDACTED]\\"',
    )
    .replace(
      /(app[_-]?secret|appSecret|authorization|client[_-]?token|clientToken|code|mock[_-]?(access|refresh)[_-]?token|secret|tenant[_-]?access[_-]?token|tenant_access_token)\s*[:=]\s*["']?[^"',\s}]+/gi,
      "$1=[REDACTED]",
    );

  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`
    : redacted;
}

function isSensitiveFlag(flagName: string): boolean {
  return (
    sensitiveFlagNames.has(flagName) ||
    flagName.endsWith("-secret") ||
    flagName.endsWith("-token") ||
    flagName === "authorization-code"
  );
}
