import { describe, expect, it } from "vitest";

import {
  commandEventIngressSchema,
  defaultChangedSurfacesForCommand,
  isLiveSequenceNewer,
  liveMessageEnvelopeSchema,
  redactLiveCommandEvent,
} from "../../src/dashboard/live-events.js";

describe("dashboard live events", () => {
  it("parses ingress envelopes and redacts secret-like values", () => {
    const event = redactLiveCommandEvent({
      changedSurfaces: ["shell", "overview", "research", "audit"],
      command: "research",
      commandRunId: "run_01",
      dataSource: "live",
      durationMs: 245,
      evidenceCount: 1,
      finishedAt: "2026-05-15T00:00:03.000Z",
      issues: [
        {
          code: "bad-token",
          message: "authorization=Bearer live-token",
          remediation: "replace appSecret=secret-value",
        },
      ],
      phase: "completed",
      startedAt: "2026-05-15T00:00:01.000Z",
      status: "ok",
      trigger: "terminal",
    });

    expect(commandEventIngressSchema.parse(event).phase).toBe("completed");
    expect(JSON.stringify(event)).not.toContain("live-token");
    expect(JSON.stringify(event)).not.toContain("secret-value");
  });

  it("maps supported commands to the narrowest default surfaces", () => {
    expect(defaultChangedSurfacesForCommand("valid")).toEqual([
      "shell",
      "overview",
      "audit",
    ]);
    expect(defaultChangedSurfacesForCommand("research")).toEqual([
      "shell",
      "overview",
      "research",
      "audit",
    ]);
    expect(defaultChangedSurfacesForCommand("dashboard")).toEqual([
      "shell",
      "overview",
    ]);
  });

  it("accepts only strictly newer live sequences", () => {
    const envelope = liveMessageEnvelopeSchema.parse({
      createdAt: "2026-05-15T00:00:00.000Z",
      dataSource: "live",
      eventId: "evt_01",
      payload: { reason: "audit entry updated" },
      sequence: 42,
      type: "state.invalidate",
    });

    expect(isLiveSequenceNewer(undefined, envelope.sequence)).toBe(true);
    expect(isLiveSequenceNewer(envelope.sequence, envelope.sequence)).toBe(
      false,
    );
    expect(isLiveSequenceNewer(envelope.sequence, envelope.sequence - 1)).toBe(
      false,
    );
    expect(isLiveSequenceNewer(envelope.sequence, envelope.sequence + 1)).toBe(
      true,
    );
  });
});
