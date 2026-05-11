import { z } from "zod";

export const isoTimestampSchema = z
  .string()
  .datetime()
  .default(() => new Date().toISOString());

export const issueSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  remediation: z.string().min(1).optional(),
});

export const evidenceStatusSchema = z.enum([
  "verified",
  "partial",
  "failed",
  "not-run",
]);

export const researchEvidenceSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum([
    "bug-record",
    "repository-file",
    "command-output",
    "user-input",
    "runtime-observation",
  ]),
  reference: z.string().min(1),
  excerpt: z.string().min(1),
  collectedAt: isoTimestampSchema,
  status: evidenceStatusSchema,
});

export const sourceMetadataSchema = z.object({
  appToken: z.string().min(1),
  tableId: z.string().min(1),
  viewId: z.string().min(1).optional(),
  retrievedAt: isoTimestampSchema,
});

export const bitableSourceSchema = z.object({
  name: z.string().min(1).optional(),
  sourceUrl: z.string().url(),
  appToken: z.string().min(1),
  tableId: z.string().min(1),
  viewId: z.string().min(1).optional(),
  statusField: z.string().min(1).optional(),
  actionableStatus: z.string().min(1).default("待處理"),
  priorityField: z.string().min(1).optional(),
  priorityOrder: z.array(z.string().min(1)).optional(),
  fieldAliases: z
    .object({
      title: z.string().min(1).optional(),
      owner: z.string().min(1).optional(),
      reproductionSteps: z.string().min(1).optional(),
      expectedBehavior: z.string().min(1).optional(),
      actualBehavior: z.string().min(1).optional(),
      links: z.string().min(1).optional(),
      notes: z.string().min(1).optional(),
    })
    .default({}),
  updatedAt: isoTimestampSchema,
});

export const authSessionSchema = z.object({
  storagePath: z.string().min(1),
  domain: z.string().min(1).optional(),
  accountLabel: z.string().min(1).optional(),
  appIdentity: z.string().min(1).optional(),
  scopes: z.array(z.string().min(1)).default([]),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.string().datetime(),
  refreshExpiresAt: z.string().datetime().optional(),
  status: z.enum([
    "ready",
    "missing",
    "expired",
    "invalid",
    "insufficient-scope",
  ]),
  updatedAt: isoTimestampSchema,
});

export const larkAppConfigSchema = z.object({
  appId: z.string().min(1),
  appSecret: z.string().min(1),
  callbackPort: z.number().int().min(0).max(65535).default(14543),
  domain: z.string().min(1).default("larksuite.com"),
  redirectUri: z.string().url().optional(),
  scopes: z.array(z.string().min(1)).default(["bitable:app:readonly"]),
  updatedAt: isoTimestampSchema,
});

export const larkAccessStateSchema = z.object({
  authMode: z.string().min(1).optional(),
  tenantOrUserContext: z.string().min(1).optional(),
  lastCheckedAt: isoTimestampSchema,
  status: z.enum(["ready", "missing", "expired", "failed"]),
  evidence: z.array(researchEvidenceSchema).default([]),
});

export const bitableRecordSchema = z.object({
  recordId: z.string().min(1),
  fields: z.record(z.string(), z.unknown()),
  source: sourceMetadataSchema,
  matchedFields: z.array(z.string().min(1)).default([]),
});

export const bugCandidateSchema = z.object({
  record: bitableRecordSchema,
  title: z.string().min(1).optional(),
  status: z.unknown().optional(),
  priority: z.unknown().optional(),
  owner: z.unknown().optional(),
  reproductionSteps: z.unknown().optional(),
  expectedBehavior: z.unknown().optional(),
  actualBehavior: z.unknown().optional(),
  links: z.unknown().optional(),
  missingFields: z.array(z.string().min(1)).default([]),
});

export const triageSelectionSchema = z.object({
  selectedRecordId: z.string().min(1),
  selectedAt: isoTimestampSchema,
  selectionEvidence: z.record(z.string(), z.unknown()),
  candidateSnapshot: z.record(z.string(), z.unknown()),
});

export const validationResultSchema = z.object({
  workflow: z.enum(["global", "inspect", "triage", "research"]),
  status: z.enum(["ready", "partial", "blocked"]),
  checkedPrerequisites: z.array(z.string().min(1)),
  blockingIssues: z.array(issueSchema).default([]),
  partialIssues: z.array(issueSchema).default([]),
  remediationSteps: z.array(z.string().min(1)).default([]),
  nextSafeCommand: z.string().min(1).optional(),
  evidence: z.array(researchEvidenceSchema).default([]),
  checkedAt: isoTimestampSchema,
});

export const researchReportSchema = z.object({
  bugSummary: z.string().min(1),
  observedFacts: z.array(z.string().min(1)).default([]),
  assumptions: z.array(z.string().min(1)).default([]),
  analysis: z.array(z.string().min(1)).default([]),
  likelyCauses: z.array(z.string().min(1)).default([]),
  recommendedFixes: z.array(z.string().min(1)).default([]),
  risks: z.array(z.string().min(1)).default([]),
  nextActions: z.array(z.string().min(1)).default([]),
  evidence: z.array(researchEvidenceSchema).default([]),
});

export type Issue = z.infer<typeof issueSchema>;
export type ResearchEvidence = z.infer<typeof researchEvidenceSchema>;
export type BitableSource = z.infer<typeof bitableSourceSchema>;
export type LarkAuthSession = z.infer<typeof authSessionSchema>;
export type LarkAppConfig = z.infer<typeof larkAppConfigSchema>;
export type BitableRecord = z.infer<typeof bitableRecordSchema>;
export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;
export type BugCandidate = z.infer<typeof bugCandidateSchema>;
export type TriageSelection = z.infer<typeof triageSelectionSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ResearchReport = z.infer<typeof researchReportSchema>;
