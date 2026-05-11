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
    "lark-media",
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

export const workflowModeSchema = z.enum(["QA", "Developer"]);

export const modeConfigSchema = z.object({
  checkPolicy: z.enum(["auto", "manual-only", "report-only"]).optional(),
  defaultOwner: z.string().min(1).optional(),
  updatedAt: isoTimestampSchema,
});

export const workflowConfigSchema = z.object({
  activeMode: workflowModeSchema.default("Developer"),
  configuredAt: isoTimestampSchema,
  configuredBy: z.string().min(1).optional(),
  modeConfigs: z
    .object({
      QA: modeConfigSchema.optional(),
      Developer: modeConfigSchema.optional(),
    })
    .default({}),
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
  mode: workflowModeSchema.optional(),
  selectionEvidence: z.record(z.string(), z.unknown()),
  candidateSnapshot: z.record(z.string(), z.unknown()),
});

export const ownerCriteriaSchema = z.object({
  applied: z.boolean(),
  field: z.string().min(1).nullable(),
  matchedRecords: z.number().int().min(0).default(0),
  mode: workflowModeSchema,
  notAppliedReason: z
    .enum([
      "missing-owner-field",
      "empty-owner-value",
      "default-owner-disabled",
    ])
    .optional(),
  source: z.enum(["command", "mode-default", "none"]),
  totalRecordsBeforeFilter: z.number().int().min(0).default(0),
  value: z.string().min(1).optional(),
});

export const queryLimitSchema = z.object({
  appliedAfter: z.array(z.string().min(1)).default([]),
  hasMore: z.union([z.boolean(), z.literal("unknown")]).default("unknown"),
  limit: z.number().int().positive(),
  returned: z.number().int().min(0),
  source: z.enum(["command", "default"]),
});

export const qaCheckCandidateSchema = z.object({
  command: z.array(z.string().min(1)).default([]),
  confidence: z.enum(["high", "medium", "low"]),
  cwd: z.string().min(1),
  evidence: z.array(researchEvidenceSchema).default([]),
  id: z.string().min(1),
  kind: z.enum([
    "unit-test",
    "integration-test",
    "e2e-test",
    "lint",
    "typecheck",
    "other",
  ]),
  safety: z.enum(["safe", "needs-confirmation", "blocked"]),
  skipReason: z.string().min(1).optional(),
});

export const executedQaCheckSchema = z.object({
  candidateId: z.string().min(1),
  command: z.array(z.string().min(1)).min(1),
  cwd: z.string().min(1),
  evidence: z.array(researchEvidenceSchema).default([]),
  exitCode: z.number().int().nullable(),
  finishedAt: isoTimestampSchema,
  outputExcerpt: z.string().default(""),
  startedAt: isoTimestampSchema,
  status: z.enum(["passed", "failed", "error"]),
});

export const skippedQaCheckSchema = z.object({
  candidateId: z.string().min(1).optional(),
  evidence: z.array(researchEvidenceSchema).default([]),
  manualNextStep: z.string().min(1),
  reason: z.string().min(1),
});

export const qaVerificationResultSchema = z.object({
  assumptions: z.array(z.string().min(1)).default([]),
  checkCandidates: z.array(qaCheckCandidateSchema).default([]),
  evidence: z.array(researchEvidenceSchema).default([]),
  executedChecks: z.array(executedQaCheckSchema).default([]),
  manualNextSteps: z.array(z.string().min(1)).default([]),
  mode: z.literal("QA"),
  nextActions: z.array(z.string().min(1)).default([]),
  observedFacts: z.array(z.string().min(1)).default([]),
  ownerCriteria: ownerCriteriaSchema.optional(),
  risks: z.array(z.string().min(1)).default([]),
  skippedChecks: z.array(skippedQaCheckSchema).default([]),
  taskSummary: z.record(z.string(), z.unknown()),
  workspaceEvidence: z.array(researchEvidenceSchema).default([]),
});

export const writeFieldChangeSchema = z.object({
  fieldName: z.string().min(1),
  requestedValue: z.unknown(),
  previousValue: z.unknown().optional(),
  resultValue: z.unknown().optional(),
  status: z.enum(["pending", "changed", "unchanged", "rejected", "unknown"]),
  validationIssues: z.array(issueSchema).default([]),
});

export const writeOperationSchema = z.object({
  operationId: z.string().min(1),
  type: z.enum(["create", "update"]),
  source: sourceMetadataSchema,
  targetRecordId: z.string().min(1).optional(),
  requestedFields: z.record(z.string(), z.unknown()),
  fieldChanges: z.array(writeFieldChangeSchema),
  previewedAt: isoTimestampSchema,
  commitState: z.enum(["previewed", "confirmed-request", "not-requested"]),
  clientToken: z.string().min(1).optional(),
  requestedBy: z.enum(["human", "agent", "unknown"]).optional(),
});

export const writePreviewSchema = z.object({
  operation: writeOperationSchema,
  source: sourceMetadataSchema,
  targetRecord: bitableRecordSchema.optional(),
  fieldChanges: z.array(writeFieldChangeSchema),
  warnings: z.array(z.string().min(1)).default([]),
  commitRequired: z.boolean(),
  wouldWrite: z.boolean(),
});

export const writeResultSchema = z.object({
  operationId: z.string().min(1),
  type: z.enum(["create", "update"]),
  commitState: z.enum(["previewed", "committed", "blocked", "not-requested"]),
  confirmationStatus: z.enum([
    "not-written",
    "confirmed",
    "failed",
    "partial",
    "unknown",
  ]),
  targetRecordId: z.string().min(1).optional(),
  clientToken: z.string().min(1).optional(),
  fieldChanges: z.array(writeFieldChangeSchema),
  createdRecord: bitableRecordSchema.optional(),
  updatedRecord: bitableRecordSchema.optional(),
  issues: z.array(issueSchema).default([]),
  warnings: z.array(z.string().min(1)).default([]),
  evidence: z.array(researchEvidenceSchema).default([]),
  nextActions: z.array(z.string().min(1)).default([]),
});

export const writeReadinessSchema = z.object({
  sourceConfigured: z.boolean(),
  authReady: z.boolean(),
  fieldsReadable: z.union([z.boolean(), z.literal("unknown")]),
  targetRecordReadable: z.union([z.boolean(), z.literal("unknown")]),
  writePermissionStatus: z.enum(["verified", "missing", "failed", "unknown"]),
  blockingIssues: z.array(issueSchema).default([]),
  partialIssues: z.array(issueSchema).default([]),
  status: z.enum(["ready", "partial", "blocked"]),
  nextSafeCommand: z.string().min(1).optional(),
});

export const writeEvidenceSchema = researchEvidenceSchema;

export const validationResultSchema = z.object({
  workflow: z.enum([
    "global",
    "inspect",
    "triage",
    "research",
    "verify",
    "write",
  ]),
  status: z.enum(["ready", "partial", "blocked"]),
  checkedPrerequisites: z.array(z.string().min(1)),
  blockingIssues: z.array(issueSchema).default([]),
  partialIssues: z.array(issueSchema).default([]),
  remediationSteps: z.array(z.string().min(1)).default([]),
  nextSafeCommand: z.string().min(1).optional(),
  evidence: z.array(researchEvidenceSchema).default([]),
  activeMode: workflowModeSchema.optional(),
  modeSource: z.enum(["explicit", "defaulted", "invalid"]).optional(),
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
export type WorkflowMode = z.infer<typeof workflowModeSchema>;
export type ModeConfig = z.infer<typeof modeConfigSchema>;
export type WorkflowConfig = z.infer<typeof workflowConfigSchema>;
export type LarkAuthSession = z.infer<typeof authSessionSchema>;
export type LarkAppConfig = z.infer<typeof larkAppConfigSchema>;
export type BitableRecord = z.infer<typeof bitableRecordSchema>;
export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;
export type BugCandidate = z.infer<typeof bugCandidateSchema>;
export type TriageSelection = z.infer<typeof triageSelectionSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ResearchReport = z.infer<typeof researchReportSchema>;
export type OwnerCriteria = z.infer<typeof ownerCriteriaSchema>;
export type QueryLimit = z.infer<typeof queryLimitSchema>;
export type QaCheckCandidate = z.infer<typeof qaCheckCandidateSchema>;
export type ExecutedQaCheck = z.infer<typeof executedQaCheckSchema>;
export type SkippedQaCheck = z.infer<typeof skippedQaCheckSchema>;
export type QaVerificationResult = z.infer<typeof qaVerificationResultSchema>;
export type WriteFieldChange = z.infer<typeof writeFieldChangeSchema>;
export type WriteOperation = z.infer<typeof writeOperationSchema>;
export type WritePreview = z.infer<typeof writePreviewSchema>;
export type WriteResult = z.infer<typeof writeResultSchema>;
export type WriteReadiness = z.infer<typeof writeReadinessSchema>;
export type WriteEvidence = z.infer<typeof writeEvidenceSchema>;
