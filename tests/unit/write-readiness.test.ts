import { describe, expect, it } from "vitest";

import { evaluateWriteReadiness } from "../../src/write/readiness.js";

describe("write readiness", () => {
  it("blocks when auth or source is missing", () => {
    expect(
      evaluateWriteReadiness({
        authReady: false,
        sourceConfigured: true,
      }),
    ).toMatchObject({
      status: "blocked",
      blockingIssues: [expect.objectContaining({ code: "missing-auth" })],
    });

    expect(
      evaluateWriteReadiness({
        authReady: true,
        sourceConfigured: false,
      }),
    ).toMatchObject({
      status: "blocked",
      blockingIssues: [expect.objectContaining({ code: "missing-source" })],
    });
  });

  it("reports unknown write permission as partial", () => {
    expect(
      evaluateWriteReadiness({
        authReady: true,
        sourceConfigured: true,
        writePermissionStatus: "unknown",
      }),
    ).toMatchObject({
      status: "partial",
      partialIssues: [
        expect.objectContaining({ code: "write-permission-unverified" }),
      ],
    });
  });

  it("blocks when field metadata or target records cannot be read", () => {
    expect(
      evaluateWriteReadiness({
        authReady: true,
        fieldsReadable: false,
        sourceConfigured: true,
      }),
    ).toMatchObject({
      status: "blocked",
      blockingIssues: [expect.objectContaining({ code: "fields-unreadable" })],
    });

    expect(
      evaluateWriteReadiness({
        authReady: true,
        sourceConfigured: true,
        targetRecordReadable: false,
        writePermissionStatus: "verified",
      }),
    ).toMatchObject({
      status: "blocked",
      blockingIssues: [
        expect.objectContaining({ code: "target-record-unreadable" }),
      ],
    });
  });
});
