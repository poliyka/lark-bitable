import {
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import {
  persistedResearchReportSchema,
  type PersistedResearchReport,
} from "../config/schema.js";

export interface WriteCanonicalResearchReportInput {
  now?: Date;
  report: Omit<
    PersistedResearchReport,
    | "canonicalPath"
    | "createdAt"
    | "name"
    | "outputLinkPath"
    | "outputLinkStatus"
    | "schemaVersion"
  > &
    Partial<
      Pick<
        PersistedResearchReport,
        | "canonicalPath"
        | "createdAt"
        | "name"
        | "outputLinkPath"
        | "outputLinkStatus"
        | "schemaVersion"
      >
    >;
  researchDir?: string;
}

export interface ResearchOutputLinkResult {
  outputLinkError?: string;
  outputLinkPath: string | null;
  outputLinkStatus: PersistedResearchReport["outputLinkStatus"];
}

export interface ResearchReportListInput {
  cursor?: string;
  limit?: number;
  researchDir?: string;
  text?: string;
}

export interface SkippedResearchFile {
  path: string;
  reason: string;
}

export function defaultResearchDir(home = homedir()): string {
  return join(home, ".lark-bitable", "research");
}

export function safeResearchName(input: string | undefined): string {
  const safe = (input?.trim() || "research")
    .replace(/[\\/]+/g, "-")
    .replace(/\.\.+/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");
  return safe || "research";
}

export async function writeCanonicalResearchReport(
  input: WriteCanonicalResearchReportInput,
): Promise<PersistedResearchReport> {
  const researchDir = input.researchDir ?? defaultResearchDir();
  await mkdir(researchDir, { recursive: true, mode: 0o700 });
  const now = input.now ?? new Date();
  const name = safeResearchName(input.report.name);
  const createdAt = input.report.createdAt ?? now.toISOString();
  const canonicalPath = await nextCanonicalPath({
    name,
    now,
    researchDir,
  });
  const report = persistedResearchReportSchema.parse({
    ...input.report,
    schemaVersion: 1,
    name,
    createdAt,
    canonicalPath,
    outputLinkPath: input.report.outputLinkPath ?? null,
    outputLinkStatus: input.report.outputLinkStatus ?? "none",
  });
  await writeFile(canonicalPath, `${JSON.stringify(report, null, 2)}\n`, {
    mode: 0o600,
  });
  return report;
}

export async function updateResearchReportLinkStatus(
  canonicalPath: string,
  link: ResearchOutputLinkResult,
): Promise<PersistedResearchReport> {
  const report = persistedResearchReportSchema.parse(
    JSON.parse(await readFile(canonicalPath, "utf8")),
  );
  const updated = persistedResearchReportSchema.parse({
    ...report,
    outputLinkPath: link.outputLinkPath,
    outputLinkStatus: link.outputLinkStatus,
  });
  await writeFile(canonicalPath, `${JSON.stringify(updated, null, 2)}\n`, {
    mode: 0o600,
  });
  return updated;
}

export async function createResearchOutputLink(input: {
  canonicalPath: string;
  outputPath?: string | null;
}): Promise<ResearchOutputLinkResult> {
  if (!input.outputPath) {
    return { outputLinkPath: null, outputLinkStatus: "none" };
  }
  const outputPath = resolve(input.outputPath);
  const canonicalPath = resolve(input.canonicalPath);
  try {
    const existing = await lstat(outputPath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    });
    if (existing) {
      if (!existing.isSymbolicLink()) {
        return {
          outputLinkError: "Output path already exists and is not a symlink.",
          outputLinkPath: outputPath,
          outputLinkStatus: "failed",
        };
      }
      const target = resolve(dirname(outputPath), await readlink(outputPath));
      return target === canonicalPath
        ? { outputLinkPath: outputPath, outputLinkStatus: "linked" }
        : {
            outputLinkError: "Output path already links to a different target.",
            outputLinkPath: outputPath,
            outputLinkStatus: "failed",
          };
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await symlink(canonicalPath, outputPath);
    return { outputLinkPath: outputPath, outputLinkStatus: "linked" };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      outputLinkError: error instanceof Error ? error.message : String(error),
      outputLinkPath: outputPath,
      outputLinkStatus:
        code === "EPERM" || code === "ENOTSUP" ? "unsupported" : "failed",
    };
  }
}

export async function listResearchReports(
  input: ResearchReportListInput = {},
): Promise<{
  nextCursor: string | null;
  researchDir: string;
  reports: Array<{
    canonicalPath: string;
    createdAt: string;
    evidenceCount: number;
    name: string;
    outputLinkStatus: PersistedResearchReport["outputLinkStatus"];
    reportId: string;
    selectedRecordId?: string | null;
  }>;
  skippedFiles: SkippedResearchFile[];
  unavailableReports: Array<{
    canonicalPath: string;
    name: string;
    reason: string;
    reportId: string;
    status: "unavailable";
  }>;
}> {
  const researchDir = input.researchDir ?? defaultResearchDir();
  const skippedFiles: SkippedResearchFile[] = [];
  const reports: PersistedResearchReport[] = [];
  let files: string[] = [];
  try {
    files = await readdir(researchDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      skippedFiles.push({
        path: researchDir,
        reason: `invalid research directory: ${(error as Error).message}`,
      });
    }
  }

  for (const file of files.filter((item) => item.endsWith(".json"))) {
    const path = join(researchDir, file);
    try {
      reports.push(
        persistedResearchReportSchema.parse(
          JSON.parse(await readFile(path, "utf8")),
        ),
      );
    } catch (error) {
      skippedFiles.push({
        path,
        reason: `invalid research report: ${(error as Error).message}`,
      });
    }
  }

  const text = input.text?.toLowerCase();
  const filtered = reports
    .filter((report) =>
      text ? JSON.stringify(report).toLowerCase().includes(text) : true,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const offset = Number.parseInt(input.cursor ?? "0", 10) || 0;
  const limit = input.limit ?? 50;
  const page = filtered.slice(offset, offset + limit);
  return {
    nextCursor:
      offset + limit < filtered.length ? String(offset + limit) : null,
    researchDir,
    reports: page.map((report) => ({
      canonicalPath: report.canonicalPath,
      createdAt: report.createdAt,
      evidenceCount: report.evidence.length,
      name: report.name,
      outputLinkStatus: report.outputLinkStatus,
      reportId: basename(report.canonicalPath, ".json"),
      selectedRecordId: report.selectedRecordId,
    })),
    skippedFiles,
    unavailableReports: skippedFiles
      .filter((file) => file.path.endsWith(".json"))
      .map((file) => ({
        canonicalPath: file.path,
        name: basename(file.path),
        reason: file.reason,
        reportId: basename(file.path, ".json"),
        status: "unavailable" as const,
      })),
  };
}

export async function readResearchReport(input: {
  reportId: string;
  researchDir?: string;
}): Promise<PersistedResearchReport> {
  if (!/^[A-Za-z0-9._-]+$/.test(input.reportId)) {
    throw new Error(`Unsafe research report id: ${input.reportId}`);
  }
  const researchDir = input.researchDir ?? defaultResearchDir();
  const fileName = input.reportId.endsWith(".json")
    ? input.reportId
    : `${input.reportId}.json`;
  return persistedResearchReportSchema.parse(
    JSON.parse(await readFile(join(researchDir, fileName), "utf8")),
  );
}

async function nextCanonicalPath(input: {
  name: string;
  now: Date;
  researchDir: string;
}): Promise<string> {
  const base = `${input.name}-${sortableTimestamp(input.now)}`;
  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const path = join(input.researchDir, `${base}${suffix}.json`);
    try {
      await lstat(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return path;
      throw error;
    }
  }
  throw new Error(
    `Could not allocate a unique research report path for ${base}`,
  );
}

function sortableTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(".", "");
}
