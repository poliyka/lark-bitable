import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { toEvidence } from "./evidence.js";
import type { ResearchEvidence } from "../config/schema.js";

export interface RepositoryContextEvidence {
  evidence: ResearchEvidence[];
  packageManager?: "npm" | "pnpm" | "yarn";
  scripts: Record<string, string>;
  testDirectories: string[];
}

export function parseEvidenceArgument(argument: string): ResearchEvidence {
  const [type, reference, ...excerptParts] = argument.split(":");
  return toEvidence({
    type: type as ResearchEvidence["type"],
    reference: reference ?? "unknown",
    excerpt: excerptParts.join(":") || "No excerpt provided",
    status: "verified",
  });
}

export function discoverRepositoryContext(
  cwd = process.cwd(),
): RepositoryContextEvidence {
  const evidence: ResearchEvidence[] = [];
  const packageJsonPath = join(cwd, "package.json");
  let packageManager: RepositoryContextEvidence["packageManager"];
  let scripts: Record<string, string> = {};

  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      packageManager?: string;
      scripts?: Record<string, string>;
    };
    scripts = packageJson.scripts ?? {};
    packageManager = inferPackageManager(packageJson.packageManager);
    evidence.push(
      toEvidence({
        type: "repository-file",
        reference: packageJsonPath,
        excerpt: `package.json scripts: ${Object.keys(scripts).join(", ")}`,
        status: "verified",
      }),
    );
  }

  const testDirectories = ["tests", "test", "e2e"]
    .map((name) => join(cwd, name))
    .filter((path) => existsSync(path));
  for (const directory of testDirectories) {
    evidence.push(
      toEvidence({
        type: "repository-file",
        reference: directory,
        excerpt: `test directory entries: ${readdirSync(directory)
          .slice(0, 10)
          .join(", ")}`,
        status: "verified",
      }),
    );
  }

  return {
    evidence,
    packageManager,
    scripts,
    testDirectories,
  };
}

function inferPackageManager(
  packageManager: string | undefined,
): RepositoryContextEvidence["packageManager"] {
  if (packageManager?.startsWith("yarn")) return "yarn";
  if (packageManager?.startsWith("npm")) return "npm";
  if (packageManager?.startsWith("pnpm")) return "pnpm";
  return packageManager ? undefined : undefined;
}
