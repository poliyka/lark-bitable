# CLI Contract: Lark Bitable CLI for AI Bug Triage

## Output Contract

All commands support human-readable output. Commands that feed AI agents also
support structured output with these common metadata fields:

- `command`: Command invoked.
- `status`: `ok`, `partial`, or `error`.
- `source`: Configured app token, table id, optional view id, and retrieval time
  when table data is involved.
- `evidence`: Source references that support factual claims.
- `issues`: Missing prerequisites, validation errors, or unresolved conflicts.
- `auth`: Redacted login readiness status when a command depends on Lark API
  access.

Commands must not report assumptions as facts. Unknowns must be included in
`issues` or explicit assumptions sections.
Commands must never print raw access tokens or refresh tokens.

## Command: help

**Purpose**: Show global workflow or command-specific help.

**Inputs**:

- Optional command name.

**Outputs**:

- Recommended workflow from bootstrap through research report.
- Command purpose, required inputs, options, output format, examples, and common
  failures.
- Human-readable sections for human usage, AI usage, inputs, outputs, common
  failures, next steps, and examples for every command module, including `help`
  itself.

**Failure behavior**:

- Unknown command names return a non-zero status and list valid command names.

## Command: doctor

**Purpose**: Bootstrap/self-check command for AI agents and users.

**Inputs**:

- Optional structured output flag.

**Outputs**:

- CLI command path or invocation method.
- CLI version or health status.
- Whether bootstrap skill guidance is installed.
- Whether active source configuration exists.
- Whether Lark login/auth prerequisites are present enough to attempt access,
  including redacted auth file path and readiness status.
- Issues that block table access.

**Failure behavior**:

- Missing CLI, missing bootstrap skill, missing configuration, missing
  authorization, expired or invalid auth state, or conflicting CLI versions
  return `partial` or `error` and prevent table access.

## Command: lark

**Purpose**: Authorize or clear Lark API access through the single
`lark-bitable` binary.

**Inputs**:

- `--login` or `--logout`.
- Login mode: `--auth-mode sso` or `--auth-mode code`.
- Lark app/domain/account information configured by `configure` or provided
  explicitly for the selected authorization flow.
- For SSO mode, the redirect URI must be the OAuth Redirect URL registered in
  Lark Developer Console > Security Settings. It must match exactly, including
  host, port, and path. The app event callback URL is not an OAuth login
  redirect URI.
- For local SSO mode, the CLI starts a local callback server when the configured
  redirect URI uses `http://127.0.0.1:<port>/...` or
  `http://localhost:<port>/...`.
- Browser callback received by the local server, pasted authorization code, or
  equivalent interactive completion signal.

**Outputs**:

- Redacted account/app/domain summary.
- Auth file path `~/.lark-bitable-cli/auth.json`.
- Token readiness status and expiration metadata.
- For SSO login, local callback metadata and the generated authorization URL.

**Failure behavior**:

- Missing login/logout action, canceled login, missing SSO configuration,
  missing callback code, failed callback/code exchange, missing scopes, or auth
  file write failure returns an error and does not report API access as ready.
- If SSO configuration is missing, remediation points to `configure` so the
  user can store Lark app credentials before login.
- Raw access tokens and refresh tokens are never printed.
- Confirmation that local auth state was removed or was already absent.

**Failure behavior**:

- File permission failures return an error with remediation text and no raw token
  values.

## Command: valid

**Purpose**: Validate whether current setup can run the requested workflow and
guide users through missing configuration.

**Inputs**:

- Optional workflow scope: `global`, `inspect`, `triage`, or `research`.
- Optional flag to start guided remediation for fixable configuration gaps.
- Optional structured output flag.

**Outputs**:

- Readiness status: `ready`, `partial`, or `blocked`.
- Checked prerequisites, including CLI install, bootstrap skill, Lark login,
  auth freshness, active Bitable source, field mappings, live access, and
  selected bug context when relevant.
- Blocking and partial issues.
- Remediation command or guided setup action for each issue.
- Next safe command when ready or after the first remediation step.

**Failure behavior**:

- Missing or invalid prerequisites return `blocked`.
- Network or live Lark verification failures return `partial` unless another
  required prerequisite is already blocked.
- Raw access tokens and refresh tokens are never printed.

## Command: configure

**Purpose**: Store or manage the active Lark Base/Bitable source.

**Inputs**:

- Lark Base/Bitable URL.
- Optional Lark app id, app secret, domain, OAuth redirect URI, local callback
  port, and scopes.
- Optional source name.
- Optional field mappings for status, priority, title, owner, reproduction,
  expected behavior, actual behavior, links, and notes.
- Optional actionable status value, defaulting to `待處理`.
- Optional priority ordering.

**Outputs**:

- Parsed app token, table id, and optional view id.
- Active source summary.
- Field mapping summary.
- Redacted Lark app settings, including stored OAuth redirect URI and secret
  state but never the app secret.
- Storage path `~/.lark-bitable-cli/config.json`; existing legacy config is
  migrated into this unified CLI directory when the default store is opened.
- Field discovery status. Interactive configure uses Lark app credentials to
  read table fields and present numbered choices for field mappings. The
  actionable status value is chosen from discovered status options or existing
  record values. If discovery is denied or inconclusive, interactive configure
  stops with remediation instead of asking humans to type field names.
  Field discovery uses `tenant_access_token`, so remediation must distinguish it
  from browser login: missing Lark scope code `99991672` should point users to
  application-identity `base:field:read` for field metadata and
  application-identity `bitable:app:readonly` for Bitable record reads used when
  deriving existing status values, followed by app version publishing and
  enterprise approval when required. User-identity `bitable:app:readonly` is a
  separate browser login requirement and does not satisfy application-identity
  configure calls.

**Failure behavior**:

- Invalid URL shape, missing required identity parts, or conflicting replacement
  state returns an error and keeps previous configuration unchanged.

## Command: list

**Purpose**: List records from the active source.

**Inputs**:

- Optional field selection.
- Optional page size or limit.
- Optional structured output flag.

**Outputs**:

- Records with stable record identifiers, selected field values, source
  metadata, retrieval time, and pagination status.

**Failure behavior**:

- Missing login, expired auth, authorization failure, inaccessible table/view, or
  empty result set is reported with remediation text.

## Command: get

**Purpose**: Retrieve one record by stable record id or selectable row reference.

**Inputs**:

- Record id or selection reference.
- Optional structured output flag.

**Outputs**:

- Full visible field values for the record.
- Source metadata and retrieval evidence.

**Failure behavior**:

- Missing login, missing record id, unknown record, inaccessible source, or
  ambiguous selection returns an error.

## Command: filter

**Purpose**: Return records matching field criteria.

**Inputs**:

- Field name.
- Comparison operator.
- Value.
- Optional structured output flag.

**Outputs**:

- Matching records.
- Criteria applied.
- Source metadata and retrieval time.

**Failure behavior**:

- Missing login, unknown field, unsupported comparison, empty result, or
  inaccessible source is reported explicitly.

## Command: search

**Purpose**: Search visible text-like fields.

**Inputs**:

- Search query.
- Optional selected fields.
- Optional structured output flag.

**Outputs**:

- Matching records.
- Matched field names.
- Source metadata and retrieval time.

**Failure behavior**:

- Missing login, empty query, no matches, or inaccessible source returns a clear
  status and remediation text where applicable.

## Command: triage

**Purpose**: Guide the user or AI agent through actionable bug selection.

**Inputs**:

- Optional status field override.
- Optional actionable status override.
- Optional priority field/order override.
- Optional structured output flag.

**Outputs**:

- Candidate list filtered to actionable status.
- Priority sort criteria.
- Numbered choices for interactive mode.
- Selected candidate snapshot and selection evidence after user selection.

**Failure behavior**:

- Missing login, missing status or priority field mapping, no actionable records,
  or ambiguous priority ordering returns a non-destructive issue report.

## Command: research

**Purpose**: Produce the first AI-facing research report for the selected bug.

**Inputs**:

- Selected record id or previous triage selection.
- Optional report output path.
- Optional structured output flag.

**Outputs**:

- Research report with sections for bug summary, observed facts, assumptions,
  analysis, likely causes, recommended fixes, risks, next actions, and evidence.
- Report path when written to disk.

**Failure behavior**:

- Missing login, missing selection, insufficient evidence, skipped repository
  checks, or missing bug fields must be reported as unresolved, not converted
  into confirmed facts.

## Bootstrap Skill Contract

The bootstrap skill shipped with the project must instruct AI agents to:

- Run `doctor` before any table access.
- Run `valid` before workflow-specific table operations when setup may be
  incomplete.
- Stop when `doctor` or `valid` reports missing CLI, missing skill, missing
  config, missing Lark login, expired/invalid auth, missing authorization, or
  version conflicts.
- Run `lark-bitable lark --login` when auth status is missing, expired, invalid, or
  insufficient for the configured Bitable source.
- Run `configure` only with user-provided Lark URLs and authorization context.
- Use `list`, `get`, `filter`, and `search` for inspection.
- Use `triage` to select actionable bugs.
- Use `research` to produce evidence-backed reports.
- Preserve report caveats and cite command output or repository evidence.

Bootstrap examples must be kept consistent with command-specific help output.
