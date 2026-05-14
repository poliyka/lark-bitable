import { z } from "zod";

import {
  auditCommandStatusSchema,
  issueSchema,
  persistedResearchReportSchema,
  validationResultSchema,
  workflowModeSchema,
} from "../config/schema.js";

export const dashboardDataSourceSchema = z.enum([
  "live",
  "file-backed",
  "cached",
  "missing",
  "partial",
  "failed",
]);

export const dashboardApiStatusSchema = z.enum(["ok", "partial", "error"]);

export const apiEnvelopeSchema = z.object({
  status: dashboardApiStatusSchema.default("ok"),
  dataSource: dashboardDataSourceSchema.default("live"),
  issues: z.array(issueSchema).default([]),
  data: z.unknown().optional(),
});

export const dashboardBindingSchema = z.object({
  host: z.string().min(1),
  requestedPort: z.number().int().min(0).max(65535),
  port: z.number().int().min(0).max(65535),
  origin: z.string().url(),
  startedAt: z.string().datetime(),
  status: z.enum(["starting", "ready", "failed"]),
  failure: issueSchema.optional(),
});

export const languageCodeSchema = z.enum(["zh-TW", "en"]);

export const languagePreferenceSchema = z.object({
  value: languageCodeSchema,
  source: z
    .enum(["web-cache", "browser-preference", "default"])
    .default("default"),
  updatedAt: z.string().datetime().optional(),
});

export const configDraftInputSchema = z.object({
  sourceUrl: z.string().min(1),
  sourceName: z.string().min(1).optional(),
  mode: workflowModeSchema.default("Developer"),
  larkAppId: z.string().min(1).optional(),
  larkAppSecret: z.string().min(1).optional(),
  larkDomain: z.string().min(1).default("larksuite.com"),
  redirectUri: z.string().url().optional(),
  callbackPort: z.number().int().min(0).max(65535).default(14543),
  scopes: z.array(z.string().min(1)).default(["bitable:app:readonly"]),
  statusField: z.string().min(1).optional(),
  priorityField: z.string().min(1).optional(),
  titleField: z.string().min(1).optional(),
  ownerField: z.string().min(1).optional(),
  actionableStatus: z.string().min(1).default("待處理"),
  defaultOwner: z.string().min(1).optional(),
});

export const configDraftViewSchema = configDraftInputSchema
  .omit({ larkAppSecret: true })
  .extend({
    larkAppSecretState: z
      .enum(["missing", "provided", "stored-redacted"])
      .default("missing"),
    validation: validationResultSchema.optional(),
  });

export const authStateSchema = z.object({
  status: z.enum([
    "ready",
    "missing",
    "expired",
    "invalid",
    "insufficient-scope",
    "waiting",
    "canceled",
    "failed",
  ]),
  domain: z.string().min(1).optional(),
  accountLabel: z.string().min(1).optional(),
  scopes: z.array(z.string().min(1)).default([]),
  expiresAt: z.string().datetime().optional(),
  storagePath: z.string().min(1).optional(),
  issues: z.array(issueSchema).default([]),
});

export const auditQuerySchema = z.object({
  command: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  hasError: z.coerce.boolean().optional(),
  hasEvidence: z.coerce.boolean().optional(),
  issueCode: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  mode: workflowModeSchema.optional(),
  source: z.string().min(1).optional(),
  status: auditCommandStatusSchema.optional(),
  text: z.string().min(1).optional(),
  to: z.string().datetime().optional(),
});

export const playgroundCommandSchema = z.enum([
  "valid",
  "schema",
  "list",
  "get",
  "filter",
  "search",
  "triage",
  "research",
  "verify",
  "write",
]);

export const playgroundRunRequestSchema = z.object({
  command: playgroundCommandSchema,
  confirmWrite: z.boolean().default(false),
  parameters: z.record(z.string(), z.unknown()).default({}),
});

export const researchReportSummarySchema = z.object({
  reportId: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  selectedRecordId: z.string().min(1).nullable().optional(),
  evidenceCount: z.number().int().min(0),
  canonicalPath: z.string().min(1),
  outputLinkStatus: persistedResearchReportSchema.shape.outputLinkStatus,
});

export type ApiEnvelope = z.infer<typeof apiEnvelopeSchema>;
export type ConfigDraftInput = z.infer<typeof configDraftInputSchema>;
export type ConfigDraftView = z.infer<typeof configDraftViewSchema>;
export type DashboardBinding = z.infer<typeof dashboardBindingSchema>;
export type DashboardDataSource = z.infer<typeof dashboardDataSourceSchema>;
export type DashboardStatus = z.infer<typeof dashboardApiStatusSchema>;
export type LanguageCode = z.infer<typeof languageCodeSchema>;
export type PlaygroundCommand = z.infer<typeof playgroundCommandSchema>;
export type PlaygroundRunRequest = z.infer<typeof playgroundRunRequestSchema>;
export type ResearchReportSummary = z.infer<typeof researchReportSummarySchema>;
