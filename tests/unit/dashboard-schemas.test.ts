import { describe, expect, it } from "vitest";

import {
  apiEnvelopeSchema,
  dashboardBindingSchema,
  languagePreferenceSchema,
  playgroundRunRequestSchema,
  researchReportSummarySchema,
} from "../../src/dashboard/schemas.js";

describe("dashboard schemas", () => {
  it("validates dashboard binding and API envelope contracts", () => {
    const binding = dashboardBindingSchema.parse({
      host: "127.0.0.1",
      requestedPort: 48731,
      port: 48732,
      origin: "http://127.0.0.1:48732",
      startedAt: "2026-05-14T00:00:00.000Z",
      status: "ready",
    });

    expect(apiEnvelopeSchema.parse({ data: binding }).status).toBe("ok");
  });

  it("validates playground requests and language preferences", () => {
    expect(
      playgroundRunRequestSchema.parse({
        command: "write",
        confirmWrite: false,
        parameters: { op: "create" },
      }).command,
    ).toBe("write");

    expect(languagePreferenceSchema.parse({ value: "zh-TW" }).value).toBe(
      "zh-TW",
    );
  });

  it("validates research report summaries", () => {
    expect(
      researchReportSummarySchema.parse({
        canonicalPath: "/tmp/research.json",
        createdAt: "2026-05-14T00:00:00.000Z",
        evidenceCount: 2,
        name: "research",
        outputLinkStatus: "linked",
        reportId: "research-20260514T000000000Z",
        selectedRecordId: "recLogin",
      }).evidenceCount,
    ).toBe(2);
  });
});
