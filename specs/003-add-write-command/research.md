# Research: Write Command for Bitable Content

## Evidence Sources

- User request on 2026-05-11 requires adding a `write` command that can edit and
  add table content.
- [spec.md](./spec.md) defines functional requirements FR-001 through FR-022,
  report accuracy criteria RA-001 through RA-003, and success criteria SC-001
  through SC-007.
- `package.json` shows the current TypeScript/oCLIF/Vitest stack, Node `>=22`,
  and existing scripts `build`, `test`, `format:check`, and
  `quickstart:validate`.
- `src/cli/base-command.ts` and `src/cli/output.ts` define the current command
  output contract and secret redaction boundary.
- `src/cli/shared-records.ts` is the existing shared path for loading auth,
  config, source, mode, and records for table commands.
- `src/config/schema.ts` currently defines source, auth, workflow mode,
  validation, evidence, owner criteria, query limits, QA verification, and
  research report schemas.
- `src/config/readiness.ts` currently supports workflow readiness for global,
  inspect, triage, research, and verify.
- `src/lark/client.ts` currently adapts the official SDK for record list/get,
  field list, and media download through a mockable transport seam.
- Installed `@larksuiteoapi/node-sdk` type definitions expose
  `bitable.appTableRecord.create` and `bitable.appTableRecord.update` methods
  with single-record payloads and responses.
- Official Feishu Open Platform docs for record create and update are available
  at `https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/create`
  and `https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/update`.

## Decisions

### Decision: Implement one top-level `write` command with explicit operation

**Rationale**: The user asked for a `write` command. A single command with
`--op create|update` keeps the command discoverable while preventing ambiguous
behavior. `update` requires `--record-id`; `create` must reject `--record-id`
unless a future feature adds upsert semantics.

**Alternatives considered**:

- `write create` and `write update` topic commands: valid oCLIF shape, but it
  creates two command help pages before the core behavior is large enough to
  need separate adapters.
- Infer create/update from the presence of a record id: rejected because a
  missing record id could silently create content when the user intended an
  update.

### Decision: Preview is the default; `--confirm` is required to mutate content

**Rationale**: This feature introduces shared table writes into a CLI used by
humans and AI agents. Preview-first behavior satisfies the spec's explicit
commitment requirement and makes non-interactive usage safe by default. Without
`--confirm`, the command reports `commitState=previewed` and performs no write.

**Alternatives considered**:

- Prompt interactively after preview: deferred because deterministic
  non-interactive behavior is more important for AI consumers and tests.
- Commit by default and add `--dry-run`: rejected because it increases the risk
  of accidental table changes.

### Decision: Support repeated scalar fields and structured JSON fields

**Rationale**: Humans need a simple form for common text/status updates, while
Lark field values may require structured objects or arrays for people, links,
attachments, dates, locations, or select-like fields. The first command surface
supports repeated `--field "Name=value"` and `--fields-json '{"Name":value}'`.
`--field` parses the value as JSON when it is valid JSON; otherwise it treats the
value as a string.

**Alternatives considered**:

- Only `--fields-json`: rejected because it is cumbersome for simple human
  updates.
- Only repeated `--field`: rejected because it cannot reliably represent
  complex Bitable field values.

### Decision: Use single-record create/update endpoints through `LarkClient`

**Rationale**: The spec asks for creating and editing table content, not batch
processing. The installed SDK and official docs expose single-record create and
update operations. Keeping writes behind the existing transport seam enables
fixture-based tests without live Lark access.

**Alternatives considered**:

- Use batch create/update for all writes: rejected for v1 because it complicates
  result classification and exceeds the requested single-record user journeys.
- Issue raw HTTP calls outside the SDK: rejected because the project already
  centralizes Lark access through the SDK adapter and auth headers.

### Decision: Create supports optional idempotency token

**Rationale**: The SDK create payload supports a `client_token` parameter. A
user-provided `--client-token` gives AI agents and automation a way to retry a
create after an unknown outcome without intentionally creating duplicates. If
omitted, the command generates a token for committed creates and reports it in
structured output.

**Alternatives considered**:

- No idempotency token: rejected because network interruption is an explicit
  edge case and duplicate creates are expensive in shared task tables.
- Deterministic token from field values only: rejected because two intentional
  creates with the same fields could be treated as duplicates.

### Decision: Validate table fields before committed writes

**Rationale**: Unknown field names can be caught before mutation by reading the
current table fields. This supports FR-007 and gives users actionable feedback.
Field discovery also provides select/multi-select options when available, so
the implementation can catch some invalid values before Lark rejects them.

**Alternatives considered**:

- Let Lark reject all invalid fields/values: rejected because it would produce
  poorer remediation and might fail after a user expected local validation.
- Fully validate every Lark field type locally: deferred because field-specific
  value rules are broad and change over time. The first implementation performs
  deterministic validation for field presence, empty write requests, known
  option labels when metadata is available, and relies on Lark error messages
  for complex type rejection.

### Decision: Confirm updates with before/after reads when possible

**Rationale**: To distinguish requested changes from confirmed results, update
previews should read the current record before commit and committed updates
should read or use returned record data after commit. If confirmation read
fails, output must label final state as `unknown` rather than success.

**Alternatives considered**:

- Trust write response only: rejected because the spec requires visible
  before/after values when available and explicit unknown final state when not.
- Always list all records for confirmation: rejected because `getRecord` is more
  direct and avoids unnecessary table reads.

### Decision: Classify write outcomes as previewed, confirmed, failed, partial, or unknown

**Rationale**: The spec requires different handling for no-op previews,
pre-write failures, confirmed changes, partial/uncertain outcomes, and unknown
state after interruptions. A dedicated result classifier prevents unsupported
success claims and keeps human and JSON output consistent.

**Alternatives considered**:

- Reuse `CommandStatus` only: rejected because `ok`, `partial`, and `error` are
  not granular enough for write audit trails.

### Decision: Extend readiness and help without blocking read workflows

**Rationale**: `valid --workflow write` should identify missing source, auth,
write-capable permission, and target record issues when they can be checked.
Missing write readiness must not degrade `list`, `get`, `triage`, `research`,
`verify`, or media download because those workflows may remain valid with
read-only permission.

**Alternatives considered**:

- Make global `valid` fail if write permission is missing: rejected because
  this would break existing read-focused users.
- Add a separate `write configure` flow: rejected because the existing
  `configure` and `lark --login` flow already owns app/source/auth setup.

### Decision: Preserve existing secret redaction boundary

**Rationale**: Writes may include record values that are user data, but they
must never include access tokens, refresh tokens, or app secrets. Existing
`redactSecrets` and `CommandOutput` formatting already provide a central place
to enforce redaction.

**Alternatives considered**:

- Add command-local redaction only: rejected because it risks inconsistent JSON
  and human output.

## Resolved Clarifications

- **Write scope**: create one record or update selected fields on one existing
  record. Delete, batch write, schema changes, view changes, and permission
  management remain out of scope.
- **Commit behavior**: `--confirm` is required for mutation. Without it, output
  is preview-only.
- **Value input**: repeated `--field` for simple updates and `--fields-json` for
  structured field values.
- **Record target**: update requires `--record-id`; create returns a new record
  id.
- **Permission handling**: read workflows remain usable with read-only
  permission. Write command and `valid --workflow write` report missing
  write-capable permission or table access when observed.
- **Confirmation**: requested changes are never treated as confirmed changes
  unless create/update response or follow-up record evidence supports them.
