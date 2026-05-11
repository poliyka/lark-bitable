import { describe, expect, it } from "vitest";

import {
  assertClaimsHaveEvidence,
  redactSecrets,
  resetEvidenceIds,
  toEvidence,
} from "../../src/reporting/evidence.js";

describe("evidence model", () => {
  it("creates evidence for all supported types and statuses", () => {
    resetEvidenceIds();
    const evidence = [
      toEvidence({
        type: "bug-record",
        reference: "recA",
        excerpt: "bug summary",
        status: "verified",
      }),
      toEvidence({
        type: "repository-file",
        reference: "src/file.ts",
        excerpt: "code excerpt",
        status: "partial",
      }),
      toEvidence({
        type: "command-output",
        reference: "pnpm test",
        excerpt: "not run",
        status: "not-run",
      }),
    ];

    expect(evidence.map((item) => item.id)).toEqual(["E1", "E2", "E3"]);
  });

  it("redacts token-shaped secrets and detects unsupported factual claims", () => {
    expect(redactSecrets("accessToken=abc refresh_token=def")).not.toContain(
      "abc",
    );
    expect(() => assertClaimsHaveEvidence(["Fact [E1]"], ["E1"])).not.toThrow();
    expect(() => assertClaimsHaveEvidence(["Fact"], ["E1"])).toThrow(
      "without evidence",
    );
  });
});
