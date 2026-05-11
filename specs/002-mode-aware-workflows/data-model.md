# Data Model: Mode-Aware QA and Developer Workflows

## Workflow Mode

Represents the active user intent for CLI behavior.

**Fields**:

- `value`: `QA` or `Developer`.
- `configuredAt`: ISO timestamp for the last explicit mode change.
- `configuredBy`: Optional source of the change, such as `configure` or command
  flag.

**Validation rules**:

- User-facing structured output must expose exactly `QA` or `Developer`.
- Missing mode resolves to `Developer` only for existing backward-compatible
  workflows; `valid` must still report whether the value was explicit or
  defaulted.
- Unsupported or malformed values are blocked with remediation to run guided
  configure.

## Mode Configuration

Represents mode-specific settings layered on top of the common Bitable source
configuration.

**Storage path**: `~/.lark-bitable/config.json`.

**Fields**:

- `activeMode`: Workflow Mode.
- `modeConfigs.QA.defaultOwner`: Optional owner value applied to QA discovery and
  verification commands when no command-level owner is supplied and an owner
  field is configured.
- `modeConfigs.QA.checkPolicy`: Optional QA check policy. Initial values:
  `auto`, `manual-only`, or `report-only`.
- `modeConfigs.Developer.defaultOwner`: Optional owner value applied to
  Developer discovery commands when no command-level owner is supplied and an
  owner field is configured.
- `fieldAliases.owner`: Optional common Lark Bitable field name used as the
  owner field.
- `updatedAt`: ISO timestamp for the last mode-config update.

**Relationships**:

- Uses the existing Bitable Source Configuration for source URL, app token,
  table id, view id, status field, priority field, title field, and field
  aliases.
- Uses Lark Auth Session for API access.

**Validation rules**:

- Changing `activeMode` must not clear source, auth, Lark app settings, common
  field mappings, or last selection unless the user explicitly requests a clear.
- `defaultOwner` may be omitted. If it exists without `fieldAliases.owner`, it
  is stored as inactive preference data and must not be applied until an owner
  field is configured.
- QA `checkPolicy=auto` still requires per-command evidence and safety
  screening before executing any command.

## Owner Criterion

Represents an owner filter applied to record discovery.

**Fields**:

- `field`: Configured owner field name, or null when no owner field is
  configured.
- `value`: Owner value supplied by command flag or stored default.
- `source`: `command`, `mode-default`, or `none`.
- `mode`: Active Workflow Mode when criteria were resolved.
- `applied`: Boolean indicating whether filtering changed the result set.
- `notAppliedReason`: Optional reason such as `missing-owner-field`,
  `empty-owner-value`, or `default-owner-disabled`.

**Validation rules**:

- Command-level owner overrides stored mode default for the current run only.
- Owner filtering requested by command or default requires `fieldAliases.owner`
  to apply filtering.
- Missing owner field does not block record discovery. The command returns
  unfiltered records and records `applied=false` with `notAppliedReason`.
- Output must include owner criteria whenever filtering is applied, requested,
  skipped, or unavailable.

## Owner Match Result

Represents how one record was evaluated against owner criteria.

**Fields**:

- `recordId`: Bitable record id.
- `field`: Owner field name.
- `requestedOwner`: Owner Criterion value.
- `visibleValues`: Extracted visible labels from the owner field.
- `matched`: Boolean.

**Validation rules**:

- Matching uses visible labels when available, including plain strings, people
  field names/emails/display names, select labels, and multi-select labels.
- Matching is exact and case-sensitive for the initial implementation.
- Empty owner cells never match a non-empty requested owner.
- Internal IDs may be included as evidence only when no visible label exists,
  but reports must mark that limitation.

## Record Query Limit

Represents the maximum number of records or candidates a query command returns.

**Fields**:

- `limit`: Positive integer requested by the user or defaulted by the command.
- `source`: `command` or `default`.
- `appliedAfter`: Ordered criteria applied before limiting, such as owner
  filtering, field filtering, text search, actionable status filtering, and
  priority sorting.
- `returned`: Number of records or candidates returned.
- `hasMore`: Boolean or `unknown`, indicating whether more matching items exist
  beyond the returned set.

**Validation rules**:

- `limit` must be a positive integer.
- Limit is applied after filtering, searching, owner criteria, actionable status
  criteria, and sorting.
- Output must include limit metadata for supported query commands.
- Invalid limits must fail with remediation instead of silently using a default.

## Selected Task

Represents the Bitable record selected for Developer research or QA
verification.

**Fields**:

- `selectedRecordId`: Stable Lark record id.
- `selectedAt`: ISO timestamp.
- `mode`: Workflow Mode at selection time.
- `selectionEvidence`: Criteria used to show or select the record, including
  status, priority, owner criteria, search/filter criteria, limit metadata, and
  displayed record ids.
- `candidateSnapshot`: Selected record fields needed for report continuity.

**Validation rules**:

- A selection made in one mode may be reused in another only if the command
  output explicitly states the original mode and current mode.
- If the live record is no longer readable, reports may use the snapshot but
  must mark live verification as failed or not run.
- Selection evidence must not include raw access tokens, refresh tokens, or app
  secrets.

## QA Check Candidate

Represents a check discovered from workspace evidence before execution.

**Fields**:

- `id`: Stable candidate id for the verification run.
- `kind`: `unit-test`, `integration-test`, `e2e-test`, `lint`, `typecheck`, or
  `other`.
- `command`: Command and arguments proposed for execution.
- `cwd`: Working directory for the command.
- `evidence`: Evidence references that justify why the command is relevant.
- `confidence`: `high`, `medium`, or `low`.
- `safety`: `safe`, `needs-confirmation`, or `blocked`.
- `skipReason`: Required when `safety` is `blocked` or confidence is too low.

**Validation rules**:

- A candidate cannot execute unless `safety=safe` and at least one workspace
  evidence item supports it.
- Commands with destructive or deployment-like behavior are blocked.
- Low-confidence checks are reported as skipped unless the user explicitly
  provides a command in a future extension.

## Executed QA Check

Represents a check that `verify` actually ran.

**Fields**:

- `candidateId`: Link to QA Check Candidate.
- `command`: Exact command executed.
- `cwd`: Working directory.
- `startedAt`: ISO timestamp.
- `finishedAt`: ISO timestamp.
- `exitCode`: Process exit code or null if the process did not start.
- `status`: `passed`, `failed`, or `error`.
- `outputExcerpt`: Redacted stdout/stderr excerpt.
- `evidence`: Evidence references for command output.

**Validation rules**:

- Passing or failing status must be based on exit code and command output.
- Output excerpts must be redacted for secrets.
- A failed check is an observed fact, but its root cause remains analysis unless
  separate evidence confirms it.

## Skipped QA Check

Represents a check opportunity that was not executed.

**Fields**:

- `candidateId`: Optional link to a QA Check Candidate.
- `reason`: Human-readable skip reason.
- `evidence`: Evidence references supporting the skip reason.
- `manualNextStep`: Recommended manual verification action.

**Validation rules**:

- Skipped checks are required when no safe automated check can be identified.
- Skipped checks must not be described as passed or failed.

## QA Verification Result

Represents the QA mode report for a selected task.

**Fields**:

- `taskSummary`: Selected record id, title, status, priority, owner, and source
  metadata when available.
- `mode`: `QA`.
- `ownerCriteria`: Owner Criterion when applied, requested, skipped, or
  unavailable.
- `workspaceEvidence`: Repository files or command observations used to discover
  checks.
- `checkCandidates`: QA Check Candidate list.
- `executedChecks`: Executed QA Check list.
- `skippedChecks`: Skipped QA Check list.
- `observedFacts`: Evidence-backed facts.
- `assumptions`: Unverified assumptions.
- `risks`: Risks and missing evidence.
- `manualNextSteps`: Manual QA actions.
- `nextActions`: Follow-up commands or investigation steps.
- `evidence`: Full evidence list.

**Validation rules**:

- The result must cite the selected task record.
- Each executed check must cite command-output evidence.
- Workspace evidence repeated by several check candidates should be deduplicated
  in the final evidence list so reports do not overstate how many separate
  sources were inspected.
- Media references found in the selected record are `lark-media` evidence with
  `status=not-run` until the file is downloaded through the authenticated media
  command and inspected.
- If no checks execute, at least one skipped check with reason and manual next
  step is required.
- Conclusions must keep verified observations separate from assumptions and
  recommendations.

## Developer Research Result

Represents the existing Developer mode research report with owner-aware
discovery metadata.

**Fields**:

- Existing research report fields: bug summary, observed facts, assumptions,
  analysis, likely causes, recommended fixes, risks, next actions, and evidence.
- `mode`: `Developer`.
- `ownerCriteria`: Owner Criterion when applied, requested, skipped, or
  unavailable during selection or discovery.

**Validation rules**:

- Existing evidence requirements remain unchanged.
- Owner criteria must be preserved when they influenced which bug was selected.

## Mode-Aware Validation Result

Extends the existing validation result with mode-specific readiness.

**Fields**:

- `workflow`: `global`, `inspect`, `triage`, `research`, or `verify`.
- `activeMode`: Workflow Mode or a missing/invalid marker.
- `modeSource`: `explicit`, `defaulted`, or `invalid`.
- `ownerFieldReady`: Boolean.
- `ownerDefaultReady`: Boolean or `not-configured`.
- `qaCheckDiscoveryReady`: Boolean or `not-applicable`.
- Existing fields: `status`, `checkedPrerequisites`, `blockingIssues`,
  `partialIssues`, `remediationSteps`, `nextSafeCommand`, `evidence`,
  `checkedAt`.

**Validation rules**:

- `verify` requires `activeMode=QA` unless a future explicit override is added.
- `research` remains Developer-oriented and should warn when active mode is QA
  unless the user explicitly proceeds.
- Owner filtering without owner field is a non-blocking readiness note or
  partial issue; it must not prevent record discovery.
- `ready` is allowed only when every required prerequisite for the requested
  workflow is verified.
