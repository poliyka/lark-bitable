# CLI Contract: Mode-Aware QA and Developer Workflows

## Common Output Contract

All commands keep the existing human-readable output and `--json` structured
output behavior. Mode-aware commands add these structured fields where
applicable:

- `mode.active`: `QA`, `Developer`, or null when not configured.
- `mode.source`: `explicit`, `defaulted`, or `invalid`.
- `ownerCriteria`: Owner field, requested value, source, and applied status when
  owner filtering is applied or requested.
- `executedChecks`: QA checks that actually ran.
- `skippedChecks`: QA checks or check opportunities that did not run, with
  reasons.
- `evidence`: Source references supporting factual claims.
- `nextSafeCommand`: The next command a human or AI agent can run without
  guessing missing setup.

Commands must not print raw access tokens, refresh tokens, or app secrets.
Commands must not report assumptions as facts.

## Command: configure

**Purpose**: Store common Lark source configuration and mode-specific workflow
settings.

**New inputs**:

- `--mode QA|Developer`: Set the active workflow mode non-interactively.
- `--owner-field <field>`: Set the common owner field mapping.
- `--default-owner <owner>`: Store the default owner for the active mode.
- Existing inputs for source URL, Lark app settings, status field, priority
  field, title field, actionable status, and priority ordering remain valid.

**Guided behavior**:

- Running `lark-bitable configure` with no arguments prompts for missing common
  setup and mode setup.
- Already stored values appear as defaults that the user can keep by pressing
  Enter.
- Mode is chosen from numbered choices: `QA` and `Developer`.
- Field mappings use discovered Bitable fields and numbered choices. Humans
  should not be asked to type field names when field discovery succeeds.
- Owner field mapping is optional and may be left blank in guided configure.
- Guided configure does not prompt for default owner. Default owner is updated
  only when `--default-owner` is passed. If a default owner exists without an
  owner field, it is saved as inactive preference data and is not applied until
  an owner field is configured.

**Structured output**:

- Active source summary.
- Active mode and whether it was changed.
- Field mapping summary, including owner field when configured.
- Mode-specific default owner summary without secrets.
- Storage path `~/.lark-bitable/config.json`.
- Field discovery status and remediation when discovery is blocked.

**Failure behavior**:

- Invalid mode values fail before mutating existing config.
- Missing owner field or blank default owner does not fail configure.
- Field discovery failures in guided mode stop with remediation instead of
  asking humans to type field names.

## Command: valid

**Purpose**: Validate global, inspect, triage, research, or QA verification
readiness.

**New inputs**:

- `--workflow verify`: Validate QA verification prerequisites.
- Existing workflow values `global`, `inspect`, `triage`, and `research` remain
  valid.
- `--owner <owner>`: Validate an owner-filtered run.

**Structured output**:

- Active mode and mode source.
- Checked common prerequisites: install, bootstrap, auth, source, Lark access.
- Checked mode prerequisites.
- Checked owner prerequisites when owner filtering is requested or defaulted.
- `status`: `ok`, `partial`, or `error`.
- Blocking issues, partial issues, remediation steps, evidence, and next safe
  command.

**Failure behavior**:

- Missing or unsupported mode blocks mode-specific workflows.
- `--workflow verify` blocks unless active mode is `QA`.
- Owner filtering requested without an owner field is reported as not applied
  with configure guidance, but it does not block the workflow.
- Network-only or live-Lark uncertainty reports `partial` unless another
  required prerequisite is already blocked.

## Command: help

**Purpose**: Show human-readable and AI-usable help for shared and mode-specific
commands.

**New behavior**:

- Global help shows active mode when configured.
- QA mode help includes `verify`, safe check discovery, executed checks, skipped
  checks, manual QA steps, owner focus, and evidence-backed QA reports.
- Developer mode help includes list/search/filter/triage/research, actionable
  status, priority sorting, owner filtering, and evidence-backed research.
- Every command-specific help entry includes purpose, human usage, AI usage,
  inputs, outputs, common failures, examples, and next steps.

**Failure behavior**:

- Unknown command help returns an error and lists valid command names.

## Command: doctor

**Purpose**: Validate local install, bootstrap skill, auth, source presence,
Lark app settings, and configure mapping completeness.

**Structured output**:

- `configPath`: actual configuration path read by the CLI.
- `authPath`: actual auth path read by the CLI.
- `sourceConfigured`: whether an active Bitable source exists.
- `larkAppConfigured`: whether app id/secret/redirect settings exist.
- `configureMappingsReady`: whether required bug mappings are complete.
- `missingConfigureMappings`: missing mapping flags such as `status-field`,
  `priority-field`, or `title-field`.

**Failure behavior**:

- Source-only configuration is partial if required mappings are missing.
- Missing Lark app settings are partial because token refresh and guided field
  discovery may fail.

## Shared Owner Filtering Contract

Applies to record discovery commands:

- `list`
- `search`
- `filter`
- `triage`
- `verify` when it selects or validates a task from table records

**Inputs**:

- `--owner <owner>`: Filter by owner for this run.
- `--no-default-owner`: Ignore the stored default owner for this run when a
  default exists.

**Precedence**:

- Command-level `--owner` wins.
- Otherwise the active mode default owner applies.
- `--no-default-owner` disables the stored default only for the current run.

**Structured output**:

- `ownerCriteria.field`
- `ownerCriteria.value`
- `ownerCriteria.source`
- `ownerCriteria.applied`
- `ownerCriteria.notAppliedReason`
- `ownerCriteria.matchedRecords`
- `ownerCriteria.totalRecordsBeforeFilter`

**Not-applied behavior**:

- If owner filtering is requested or defaulted and no owner field is configured,
  the command continues without owner filtering, returns unfiltered results, and
  sets `ownerCriteria.applied=false` with `notAppliedReason=missing-owner-field`.
- Empty owner-filtered results return `partial` with criteria shown; the command
  must not silently broaden to all owners.

## Shared Query Limit Contract

Applies to record discovery and query commands:

- `list`
- `search`
- `filter`
- `triage`
- `verify` when it discovers or validates table records before verification

**Inputs**:

- `--limit <positive-integer>`: Maximum records or candidates to return after
  query criteria are applied.

**Behavior**:

- Limit is applied after owner criteria, field filters, text search, actionable
  status filtering, and priority sorting.
- Commands include limit metadata in output, including requested limit, returned
  count, and `hasMore` when known.
- Invalid limits such as zero, negative values, or non-integers return an error
  with remediation.

## Command: list

**Purpose**: List records from the active source with optional owner focus.

**New inputs**:

- `--owner <owner>`
- `--no-default-owner`
- `--limit <positive-integer>`

**Outputs**:

- Existing record list, pagination, and source metadata.
- Owner criteria when applied, requested, skipped, or unavailable.
- Limit metadata.

## Command: schema

**Purpose**: Inspect the configured table schema before an AI agent guesses
field names, status values, owner fields, or filter criteria.

**Inputs**:

- No required input for the human header view.
- `--sample-limit <positive-integer>`: Maximum records to sample for observed
  non-empty counts and rendered sample values. Default: `20`; used by JSON
  output.
- `--json`: Emit structured output.

**Human output**:

- Without `--json`, output only command status plus numbered field headers.

**Structured output**:

- `fields[]`: field name, field type, UI type, select/multi-select options when
  available, non-empty sample count, and up to 10 observed rendered values.
- `mappings`: configured status, actionable status, priority, title, owner, and
  optional detail-field mappings.
- `sample`: requested limit, records read, and sampled record count.
- `nextSafeCommands`: suggested inspect/triage/detail commands.

**Failure behavior**:

- Missing source/auth uses the same read prerequisite failures as record
  commands.
- Invalid sample limit fails with remediation.

**Agent rule**:

- If current context does not already show the exact table shape, agents must
  run `lark-bitable schema --json` before choosing field names, status values,
  or owner filters.

## Command: search

**Purpose**: Search visible text-like fields with optional owner focus.

**New inputs**:

- `--owner <owner>`
- `--no-default-owner`
- `--limit <positive-integer>`

**Outputs**:

- Existing query, matching records, matched fields, and source metadata.
- Owner criteria when applied, requested, skipped, or unavailable.
- Limit metadata.

## Command: filter

**Purpose**: Return records matching field criteria with optional owner focus.

**New inputs**:

- `--owner <owner>`
- `--no-default-owner`
- `--limit <positive-integer>`

**Outputs**:

- Existing filter criteria and matching records.
- Owner criteria when applied, requested, skipped, or unavailable.
- Limit metadata.

## Command: triage

**Purpose**: Guide actionable task or bug selection, mode-aware.

**New inputs**:

- `--owner <owner>`
- `--no-default-owner`
- `--limit <positive-integer>`

**Developer behavior**:

- Preserve existing actionable-status filtering and priority sorting.
- Include owner criteria in selection evidence when applied, requested,
  skipped, or unavailable.
- Store selected task with `mode=Developer`.

**QA behavior**:

- Use the same source records and owner criteria to focus task selection when
  owner filtering is available; otherwise continue without owner filtering and
  mark it as not applied.
- Store selected task with `mode=QA`.
- Recommend `lark-bitable verify` as the next safe command after selection.

**Failure behavior**:

- No actionable records remains a `partial` result with criteria.
- Owner field missing while owner filtering is requested produces a
  not-applied owner criteria note and continues without owner filtering.

## Command: research

**Purpose**: Produce Developer mode bug research report.

**New behavior**:

- Structured output includes `mode=Developer`.
- If active mode is `QA`, the command warns that `verify` is the QA workflow and
  requires explicit user action to continue in a future implementation task.
- Owner criteria from selection evidence are preserved in the report when they
  influenced selection.

**Failure behavior**:

- Existing missing-selection and insufficient-evidence failures remain.
- Reports must not convert owner filtering criteria into proof of root cause.

## Command: verify

**Purpose**: QA mode task verification for a selected or specified Bitable task.

**Inputs**:

- Optional `recordId`; when omitted, use the last selected task.
- `--owner <owner>` and `--no-default-owner` when selecting/validating from
  records.
- `--limit <positive-integer>` when validating the requested task against the
  owner-filtered table record set before verification.
- `--checks auto|none|unit|integration|e2e`: Check selection scope. Default:
  `auto`.
- `--out <path>`: Write the QA verification report.
- `--json`: Emit structured output.

**Workflow**:

1. Validate active mode is `QA`.
2. Resolve owner criteria and validate the requested record against the
   owner-filtered table record set when owner filtering is applied.
3. Load selected task or requested record.
4. Capture task summary, media references, owner criteria, limit metadata, and
   source metadata.
5. Inspect workspace evidence for test/check candidates.
6. Reject unsafe, destructive, unsupported, or unrelated commands.
7. Execute only safe candidates when `--checks` allows execution.
8. Record skipped checks and manual next steps when checks are not run.
9. Emit or write a QA verification result with deduplicated evidence.

**Structured output**:

- `taskSummary`
- `ownerCriteria`
- `workspaceEvidence`
- `checkCandidates`
- `executedChecks`
- `skippedChecks`
- `observedFacts`
- `assumptions`
- `risks`
- `manualNextSteps`
- `nextActions`
- `evidence`

**Failure behavior**:

- Active mode is not `QA`: blocked with remediation to configure QA mode.
- No record id and no previous selection: blocked with remediation to run
  triage or provide a record id.
- Owner filtering is applied and the requested record is outside the filtered
  owner set: blocked with remediation to use `--no-default-owner`, choose a
  record from the owner-filtered list, or configure the correct owner default.
- No safe automated checks: `partial` with skipped checks and manual next steps.
- Check failure: `partial` or `error` depending on command failure type, with
  failed output recorded as evidence but root cause kept as analysis.
- Unsafe command candidate: skipped with explicit reason.

## Bootstrap Skill Contract

The bootstrap skill must teach agents to:

- Run `lark-bitable doctor` before table access.
- Run `lark-bitable valid --workflow <scope>` before mode-specific work.
- Inspect active mode before choosing `research` or `verify`.
- Use `triage` then `research` in Developer mode.
- Use `triage` then `verify` in QA mode.
- Apply `--owner` only when owner filtering is needed. If the owner field is
  missing, continue with the command but mark owner filtering as not applied.
- Use `--limit` for candidate-listing commands and only with positive integers.
- Run `get <record-id>` before Developer research; list/triage/search/filter
  summaries are not complete record evidence.
- Download Lark media through `media download` with the stored auth token before
  making factual claims about image or attachment contents.
- Never treat skipped QA checks or assumptions as verified facts.
