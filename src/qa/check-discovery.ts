import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { QaCheckCandidate } from "../config/schema.js";
import { toEvidence } from "../reporting/evidence.js";

const scriptKinds: Array<{
  kind: QaCheckCandidate["kind"];
  patterns: RegExp[];
}> = [
  { kind: "unit-test", patterns: [/^test$/, /^test:/] },
  { kind: "e2e-test", patterns: [/e2e/i] },
  { kind: "lint", patterns: [/^lint$/] },
  { kind: "typecheck", patterns: [/type-?check/i] },
];

export function discoverQaChecks(cwd = process.cwd()): QaCheckCandidate[] {
  const packageJsonPath = join(cwd, "package.json");
  if (!existsSync(packageJsonPath)) {
    return [
      {
        command: [],
        confidence: "low",
        cwd,
        evidence: [],
        id: "manual-workspace-check",
        kind: "other",
        safety: "blocked",
        skipReason: "No package.json was found in the workspace.",
      },
    ];
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    packageManager?: string;
    scripts?: Record<string, string>;
  };
  const packageManager = packageJson.packageManager?.startsWith("yarn")
    ? "yarn"
    : packageJson.packageManager?.startsWith("npm")
      ? "npm"
      : "pnpm";
  const scripts = packageJson.scripts ?? {};
  const evidence = toEvidence({
    type: "repository-file",
    reference: packageJsonPath,
    excerpt: `package.json scripts: ${Object.keys(scripts).join(", ")}`,
    status: "verified",
  });

  const candidates: QaCheckCandidate[] = [];
  for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
    const kind =
      scriptKinds.find((entry) =>
        entry.patterns.some((pattern) => pattern.test(scriptName)),
      )?.kind ?? "other";
    if (kind === "other") continue;
    const blocked = isUnsafeCommand(scriptCommand);
    candidates.push({
      command: [packageManager, "run", scriptName],
      confidence: kind === "unit-test" ? "high" : "medium",
      cwd,
      evidence: [evidence],
      id: `script-${scriptName.replace(/[^a-z0-9_-]/gi, "-")}`,
      kind,
      safety: blocked ? "blocked" : "safe",
      skipReason: blocked
        ? `Script contains unsafe command text: ${scriptCommand}`
        : undefined,
    });
  }

  if (candidates.length === 0 && existsSync(join(cwd, "tests"))) {
    const entries = readdirSync(join(cwd, "tests"));
    candidates.push({
      command: [packageManager, "test"],
      confidence: "medium",
      cwd,
      evidence: [
        evidence,
        toEvidence({
          type: "repository-file",
          reference: join(cwd, "tests"),
          excerpt: `tests directory entries: ${entries.slice(0, 10).join(", ")}`,
          status: "verified",
        }),
      ],
      id: "tests-directory",
      kind: "unit-test",
      safety: "safe",
    });
  }

  return candidates.length > 0
    ? candidates
    : [
        {
          command: [],
          confidence: "low",
          cwd,
          evidence: [evidence],
          id: "manual-no-supported-script",
          kind: "other",
          safety: "blocked",
          skipReason:
            "No supported test, e2e, lint, or typecheck script was found.",
        },
      ];
}

export function isUnsafeCommand(command: string): boolean {
  return /\b(rm\s+-rf|git\s+reset\s+--hard|git\s+push|publish|deploy|prisma\s+migrate\s+deploy)\b/i.test(
    command,
  );
}
