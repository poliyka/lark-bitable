import { describe, expect, it } from "vitest";

import type { QaCheckCandidate } from "../../src/config/schema.js";
import { runQaChecks } from "../../src/qa/check-runner.js";

function candidate(overrides: Partial<QaCheckCandidate>): QaCheckCandidate {
  return {
    command: ["node", "-e", "process.exit(0)"],
    confidence: "high",
    cwd: process.cwd(),
    evidence: [],
    id: "unit",
    kind: "unit-test",
    safety: "safe",
    ...overrides,
  };
}

describe("QA check runner", () => {
  it("skips checks when execution is disabled", async () => {
    const result = await runQaChecks({
      allowExecution: false,
      candidates: [candidate({})],
    });

    expect(result.executedChecks).toHaveLength(0);
    expect(result.skippedChecks[0]?.reason).toContain("disabled");
  });

  it("skips blocked candidates", async () => {
    const result = await runQaChecks({
      allowExecution: true,
      candidates: [
        candidate({
          safety: "blocked",
          skipReason: "unsafe command",
        }),
      ],
    });

    expect(result.executedChecks).toHaveLength(0);
    expect(result.skippedChecks[0]?.reason).toBe("unsafe command");
  });

  it("executes safe candidates and records command evidence", async () => {
    const result = await runQaChecks({
      allowExecution: true,
      candidates: [
        candidate({
          command: ["node", "-e", "console.log('passed')"],
        }),
      ],
      timeoutMs: 10_000,
    });

    expect(result.skippedChecks).toHaveLength(0);
    expect(result.executedChecks[0]).toMatchObject({
      status: "passed",
      exitCode: 0,
    });
    expect(result.executedChecks[0]?.evidence[0]?.excerpt).toContain("passed");
  });
});
