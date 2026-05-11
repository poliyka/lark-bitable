# Data Model: Lark Bitable CLI for AI Bug Triage

## Bitable Source Configuration

Represents the active Lark Base/Bitable source selected by the user.

**Storage path**: `~/.lark-bitable-cli/config.json`.

**Fields**:

- `name`: Optional human-readable configuration name.
- `sourceUrl`: Original user-provided Lark Base/Bitable URL.
- `appToken`: Parsed Base/Bitable app token.
- `tableId`: Parsed or configured table identifier.
- `viewId`: Parsed or configured view identifier.
- `statusField`: Field name used for actionable status filtering.
- `actionableStatus`: Status value treated as actionable; defaults to `待處理`.
- `priorityField`: Field name used for priority sorting.
- `priorityOrder`: Optional ordered list of priority labels from highest to lowest.
- `fieldAliases`: Optional aliases for title, owner, reproduction steps,
  expected behavior, actual behavior, links, and notes.
- `updatedAt`: ISO timestamp for last configuration change.

**Validation rules**:

- `sourceUrl`, `appToken`, and `tableId` are required before table access.
- Source configuration, Lark app settings, and triage selection state are stored
  under `~/.lark-bitable-cli/config.json`, outside the current repository.
- `viewId` is optional only when the user intentionally configures table-wide
  access.
- `actionableStatus` defaults to `待處理` when not provided.
- Field names and aliases must be non-empty strings when present.

## Lark Access State

Represents whether the CLI has enough user-provided authorization context to
read the configured source.

**Fields**:

- `authMode`: Selected Lark authorization mode for the CLI run.
- `tenantOrUserContext`: Redacted description of the active credential context.
- `lastCheckedAt`: ISO timestamp for the last auth self-check.
- `status`: `ready`, `missing`, `expired`, or `failed`.
- `evidence`: Command output or runtime observation supporting the status.

**Validation rules**:

- Credentials are never written into generated research reports.
- Self-check failures must include remediation text before any table query runs.

## Lark Auth Session

Represents the locally stored login state created by interactive `lark-bitable lark --login`.

**Fields**:

- `storagePath`: Default path `~/.lark-bitable-cli/auth.json`.
- `domain`: Lark domain or region used for authorization.
- `accountLabel`: Redacted account or tenant display label.
- `appIdentity`: Redacted app identity used for authorization.
- `scopes`: Granted or requested scopes needed for Bitable access.
- `accessToken`: Secret access token value.
- `refreshToken`: Secret refresh token value when available.
- `expiresAt`: ISO timestamp for access token expiration.
- `refreshExpiresAt`: Optional ISO timestamp for refresh token expiration.
- `status`: `ready`, `missing`, `expired`, `invalid`, or `insufficient-scope`.
- `updatedAt`: ISO timestamp for last successful auth write.

**Validation rules**:

- `accessToken` and `refreshToken` must never be printed in normal output,
  research reports, AI-facing evidence, or error messages.
- Auth state must be stored outside the current repository.
- API commands may run only when status is `ready` or when token refresh succeeds
  before the API call.
- Missing, malformed, expired, invalid, or insufficient-scope auth state must
  fail closed and instruct the user to run `lark-bitable lark --login`.
- Logout removes stored token state and resets status to `missing`.

## Bitable Record

Represents a row retrieved from the configured table or view.

**Fields**:

- `recordId`: Stable Lark record identifier.
- `fields`: Key/value map of visible field names and values.
- `source`: Source metadata containing app token, table id, view id, and
  retrieval timestamp.
- `matchedFields`: Field names that matched a search or filter operation.

**Validation rules**:

- `recordId` and `source` are required for AI-citable output.
- Field values may be strings, numbers, booleans, arrays, objects, or empty
  values, but rendered output must be stable and explicit about empty values.

## Bug Candidate

Represents a Bitable record interpreted as a bug item.

**Fields**:

- `record`: Source Bitable record.
- `title`: Title or summary field.
- `status`: Configured status field value.
- `priority`: Configured priority field value.
- `owner`: Optional owner or assignee field value.
- `reproductionSteps`: Optional reproduction details.
- `expectedBehavior`: Optional expected behavior.
- `actualBehavior`: Optional actual behavior or error description.
- `links`: Optional related links.
- `missingFields`: Required or recommended bug fields absent from the record.

**Validation rules**:

- Candidates included in guided triage must match the configured actionable
  status.
- Priority sorting uses `priorityOrder` when provided; otherwise records with
  unknown priority sort after records with known priority.
- Missing fields must be reported instead of inferred.

## Triage Selection

Represents the user's selected bug candidate for investigation.

**Fields**:

- `selectedRecordId`: Record id chosen by the user.
- `selectedAt`: ISO timestamp for selection.
- `selectionEvidence`: Filter criteria, sort criteria, and displayed candidate
  list used when the user selected the item.
- `candidateSnapshot`: Snapshot of the selected bug candidate used for research.

**Validation rules**:

- Selection must cite the source table/view and retrieval time.
- If the selected record cannot be re-read later, the report must mark the
  selection as based on the stored snapshot.

## Research Evidence

Represents a factual source used in a research report.

**Fields**:

- `type`: `bug-record`, `repository-file`, `command-output`, `user-input`, or
  `runtime-observation`.
- `reference`: Record id, file path, command, user message, or observation label.
- `excerpt`: Short relevant summary or excerpt.
- `collectedAt`: ISO timestamp.
- `status`: `verified`, `partial`, `failed`, or `not-run`.

**Validation rules**:

- Every factual report claim must reference at least one evidence item.
- Failed or skipped checks must remain visible in the report.

## Research Report

Represents the first AI-facing investigation output for a selected bug.

**Fields**:

- `bugSummary`: Selected bug title and record identity.
- `observedFacts`: Claims directly supported by evidence.
- `assumptions`: Unverified assumptions and why they were needed.
- `analysis`: Reasoning based on observed facts.
- `likelyCauses`: Candidate causes with confidence and evidence references.
- `recommendedFixes`: Suggested fixes with affected areas and rationale.
- `risks`: Risks, unknowns, and missing evidence.
- `nextActions`: Concrete follow-up steps.
- `evidence`: List of Research Evidence items.

**Validation rules**:

- Likely causes must not be marked confirmed unless supported by repository and
  bug-record evidence.
- Reports must preserve caveats from missing or partial evidence.

## Bootstrap Skill

Represents the AI-facing installation and usage guidance shipped with the tool.

**Fields**:

- `skillName`: Name used by the agent skill system.
- `installInstructions`: Steps for installing or linking the skill.
- `workflowSummary`: Configure, inspect, triage, research/report sequence.
- `selfCheckCommand`: CLI command used to verify install/config/auth readiness.
- `supportedCommands`: Command list and brief purpose for each command.
- `evidenceRules`: Report and output citation rules from the constitution.

**Validation rules**:

- Skill instructions must tell the AI agent how to verify the CLI command path
  and version or health status.
- Skill instructions must tell the AI to stop on missing prerequisites.
- Skill command examples must match CLI help output.

## Install State

Represents the result of bootstrap setup and self-check.

**Fields**:

- `cliCommand`: Exact command or path the AI agent will invoke.
- `cliVersion`: Version or health status reported by the CLI.
- `skillInstalled`: Boolean indicating whether bootstrap guidance is present.
- `configReady`: Boolean indicating whether a source is configured.
- `authReady`: Boolean indicating whether Lark access can be attempted.
- `authPath`: Redacted auth file path, defaulting to
  `~/.lark-bitable-cli/auth.json`.
- `authStatus`: `ready`, `missing`, `expired`, `invalid`, or
  `insufficient-scope`.
- `issues`: Missing or conflicting prerequisites.
- `checkedAt`: ISO timestamp.

**Validation rules**:

- Any missing CLI, skill, config, or auth prerequisite prevents table access.
- Multiple CLI versions must be reported as a conflict unless one active command
  is explicitly selected.

## Validation Result

Represents the output of `valid` for global or workflow-scoped readiness.

**Fields**:

- `workflow`: `global`, `inspect`, `triage`, or `research`.
- `status`: `ready`, `partial`, or `blocked`.
- `checkedPrerequisites`: List of install, bootstrap, auth, source,
  authorization, field mapping, and selection checks that were evaluated.
- `blockingIssues`: Issues that prevent the workflow from running.
- `partialIssues`: Checks that could not be completed, such as live Lark access
  blocked by network failure.
- `remediationSteps`: Concrete commands or guided setup actions for each issue.
- `nextSafeCommand`: Command the user or AI can run next when ready or after the
  first remediation.
- `evidence`: Redacted evidence supporting each readiness result.
- `checkedAt`: ISO timestamp.

**Validation rules**:

- `ready` is allowed only when every required prerequisite for the workflow is
  verified.
- `partial` is required when validation is inconclusive or skipped.
- `blocked` is required when any required prerequisite is missing or invalid.
- Remediation steps must be actionable and must not expose raw secrets.
