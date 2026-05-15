import { z } from "zod";

import {
  auditCommandStatusSchema,
  issueSchema,
  isoTimestampSchema,
} from "../config/schema.js";
import { redactDashboardPayload } from "./redaction.js";

export const dashboardLiveDataSourceSchema = z.enum([
  "live",
  "file-backed",
  "cached",
  "missing",
  "partial",
  "failed",
  "stale",
  "reconnecting",
]);

export const dashboardSurfaceSchema = z.enum([
  "shell",
  "overview",
  "config",
  "auth",
  "audit",
  "playground",
  "research",
  "table",
]);

export const dashboardLiveTriggerSchema = z.enum([
  "terminal",
  "dashboard",
  "system",
]);

export const dashboardLivePhaseSchema = z.enum([
  "started",
  "progress",
  "completed",
  "partial",
  "blocked",
  "failed",
  "canceled",
  "timeout",
]);

export const dashboardLiveCommandStatusSchema = z.enum([
  "running",
  "ok",
  "partial",
  "error",
]);

export const dashboardRuntimeSessionSchema = z.object({
  deliveryToken: z.string().min(1),
  host: z.string().min(1),
  lastHeartbeatAt: isoTimestampSchema,
  origin: z.string().url(),
  pid: z.number().int().positive(),
  port: z.number().int().min(0).max(65535),
  runtimePath: z.string().min(1),
  sessionId: z.string().min(1),
  startedAt: isoTimestampSchema,
});

export const commandEventIngressSchema = z.object({
  changedSurfaces: z.array(dashboardSurfaceSchema).min(1),
  command: z.string().min(1),
  commandRunId: z.string().min(1),
  dataSource: z.literal("live").default("live"),
  durationMs: z.number().int().min(0).nullable().optional(),
  evidenceCount: z.number().int().min(0).default(0),
  finishedAt: z.string().datetime().nullable().optional(),
  issues: z.array(issueSchema).default([]),
  phase: dashboardLivePhaseSchema,
  startedAt: z.string().datetime().optional(),
  status: z.union([auditCommandStatusSchema, z.literal("running")]).optional(),
  trigger: dashboardLiveTriggerSchema,
});

export const liveConnectedPayloadSchema = z.object({
  binding: z.object({
    host: z.string().min(1),
    origin: z.string().url(),
    port: z.number().int().min(0).max(65535),
  }),
  catchUpRequired: z.boolean().default(true),
  clientId: z.string().min(1),
  sessionId: z.string().min(1),
  surfaces: z.array(dashboardSurfaceSchema).min(1),
});

export const stateInvalidationPayloadSchema = z.object({
  reason: z.string().min(1),
  resources: z.array(z.string().min(1)).default([]),
  sourceEventId: z.string().min(1).optional(),
  surfaces: z.array(dashboardSurfaceSchema).min(1),
});

export const liveStalePayloadSchema = z.object({
  reason: z.string().min(1),
  retryAfterMs: z.number().int().min(0).optional(),
});

export const liveCatchupRequiredPayloadSchema = z.object({
  reason: z.string().min(1),
  surfaces: z.array(dashboardSurfaceSchema).min(1),
});

export const clientViewStatePayloadSchema = z.object({
  activePage: z.string().min(1).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  lastProcessedSequence: z.number().int().positive().optional(),
  selectedId: z.string().min(1).optional(),
});

export const liveMessageTypeSchema = z.enum([
  "live.connected",
  "command.activity",
  "state.invalidate",
  "live.stale",
  "live.catchup-required",
  "live.error",
]);

export const liveMessageEnvelopeSchema = z.object({
  createdAt: z.string().datetime(),
  dataSource: dashboardLiveDataSourceSchema.default("live"),
  eventId: z.string().min(1),
  payload: z.unknown(),
  sequence: z.number().int().positive(),
  type: liveMessageTypeSchema,
});

export const liveIngressAcceptedResponseSchema = z.object({
  data: z.object({
    accepted: z.literal(true),
    eventId: z.string().min(1),
    sequence: z.number().int().positive(),
  }),
  dataSource: dashboardLiveDataSourceSchema.default("live"),
  issues: z.array(issueSchema).default([]),
  status: z.literal("ok"),
});

const commandSurfaceMap: Record<string, DashboardSurface[]> = {
  configure: ["shell", "overview", "config", "table", "audit"],
  dashboard: ["shell", "overview"],
  filter: ["shell", "overview", "table", "audit"],
  get: ["shell", "overview", "table", "audit"],
  list: ["shell", "overview", "table", "audit"],
  login: ["shell", "overview", "auth", "table", "audit"],
  logout: ["shell", "overview", "auth", "table", "audit"],
  research: ["shell", "overview", "research", "audit"],
  schema: ["shell", "overview", "config", "table", "audit"],
  search: ["shell", "overview", "table", "audit"],
  triage: ["shell", "overview", "table", "audit"],
  valid: ["shell", "overview", "audit"],
  verify: ["shell", "overview", "audit"],
  write: ["shell", "overview", "table", "audit"],
};

const surfaceResourceHints: Record<DashboardSurface, string[]> = {
  audit: ["/api/audit"],
  auth: ["/api/auth/logout", "/api/status"],
  config: ["/api/config", "/api/status"],
  overview: ["/api/status"],
  playground: ["/api/playground/run"],
  research: ["/api/research"],
  shell: ["/api/status"],
  table: ["/api/table/schema", "/api/table/records"],
};

export function defaultChangedSurfacesForCommand(
  command: string,
): DashboardSurface[] {
  return commandSurfaceMap[command] ?? ["shell", "overview"];
}

export function resourceHintsForSurfaces(
  surfaces: DashboardSurface[],
): string[] {
  return [
    ...new Set(surfaces.flatMap((surface) => surfaceResourceHints[surface])),
  ];
}

export function redactLiveCommandEvent(
  input: z.input<typeof commandEventIngressSchema>,
): CommandEventIngress {
  return commandEventIngressSchema.parse(redactDashboardPayload(input));
}

export function buildStateInvalidationPayload(input: {
  reason: string;
  sourceEventId?: string;
  surfaces: DashboardSurface[];
}): StateInvalidationPayload {
  return stateInvalidationPayloadSchema.parse({
    reason: input.reason,
    resources: resourceHintsForSurfaces(input.surfaces),
    sourceEventId: input.sourceEventId,
    surfaces: input.surfaces,
  });
}

export function isLiveSequenceNewer(
  lastProcessedSequence: number | null | undefined,
  nextSequence: number,
): boolean {
  return (
    typeof lastProcessedSequence !== "number" ||
    nextSequence > lastProcessedSequence
  );
}

export type ClientViewStatePayload = z.infer<
  typeof clientViewStatePayloadSchema
>;
export type CommandEventIngress = z.infer<typeof commandEventIngressSchema>;
export type DashboardLiveDataSource = z.infer<
  typeof dashboardLiveDataSourceSchema
>;
export type DashboardLivePhase = z.infer<typeof dashboardLivePhaseSchema>;
export type DashboardLiveMessageEnvelope = z.infer<
  typeof liveMessageEnvelopeSchema
>;
export type DashboardLiveTrigger = z.infer<typeof dashboardLiveTriggerSchema>;
export type DashboardLiveCommandStatus = z.infer<
  typeof dashboardLiveCommandStatusSchema
>;
export type DashboardRuntimeSession = z.infer<
  typeof dashboardRuntimeSessionSchema
>;
export type DashboardSurface = z.infer<typeof dashboardSurfaceSchema>;
export type LiveCatchupRequiredPayload = z.infer<
  typeof liveCatchupRequiredPayloadSchema
>;
export type LiveConnectedPayload = z.infer<typeof liveConnectedPayloadSchema>;
export type LiveIngressAcceptedResponse = z.infer<
  typeof liveIngressAcceptedResponseSchema
>;
export type LiveStalePayload = z.infer<typeof liveStalePayloadSchema>;
export type StateInvalidationPayload = z.infer<
  typeof stateInvalidationPayloadSchema
>;
