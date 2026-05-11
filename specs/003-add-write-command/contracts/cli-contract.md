# CLI Contract: Write Command for Bitable Content

## Common Output Contract

The `write` command keeps the existing human-readable output and `--json`
structured output behavior. Structured output extends `CommandOutput` with
write-specific data:

- `command`: `write`.
- `status`: `ok`, `partial`, or `error`.
- `source`: Configured Bitable source metadata.
- `mode`: Active workflow mode when available.
- `issues`: Blocking or partial issues with remediation.
- `evidence`: Redacted evidence for user input, preview, write response, and
  confirmation reads.
- `data.operation`: Write operation metadata.
- `data.preview`: Preview details when no write was committed or before commit.
- `data.result`: Write result classification.
- `data.nextSafeCommands`: Follow-up commands that do not require guessing.

Commands must not print raw access tokens, refresh tokens, app secrets, or
unredacted auth headers. Requested values and confirmed values must be labeled
separately.

## Command: write

**Purpose**: Preview or commit one create/update operation against the active
Bitable table.

**Inputs**:

- `--op create|update`: Required operation.
- `--record-id <record-id>`: Required for `update`; invalid for `create`.
- `--field <name=value>`: Repeatable field assignment for simple values. The
  value is parsed as JSON when it is valid JSON; otherwise it is treated as a
  string.
- `--fields-json <json-object>`: Structured field values as a JSON object.
- `--confirm`: Required to commit a write. Without this flag the command only
  previews.
- `--client-token <token>`: Optional idempotency token for committed create
  operations.
- `--json`: Emit structured output.
- Hidden deterministic-test inputs may follow current command patterns:
  `--auth-path`, `--config-cwd`, and SDK/fixture seams as needed.

**Input combination rules**:

- At least one of `--field` or `--fields-json` is required.
- When both `--field` and `--fields-json` provide the same field name, the
  request must either fail as duplicate input or report deterministic precedence
  before preview. The recommended first implementation is to fail duplicates.
- `--op update` requires `--record-id`.
- `--op create` must reject `--record-id`.
- `--client-token` applies only to `--op create --confirm`.
- Without `--confirm`, no table content changes.

**Preview behavior**:

- Loads auth and source with the same prerequisites as record commands.
- Reads table fields to validate requested field names.
- For update, reads the target record before preview.
- Emits operation type, source, target record when applicable, planned field
  changes, warnings, and `confirmationStatus=not-written`.
- Returns `status=ok` when the preview is valid and no write was requested.
- Returns `status=error` when preview cannot be produced because setup, target
  record, or field validation fails.

**Commit behavior**:

- Requires all preview validation to pass.
- For create, calls the single-record create path and reports the created record
  id.
- For update, calls the single-record update path for the selected record and
  preserves fields that were not requested.
- Performs follow-up confirmation using returned record data or `getRecord`
  when available.
- Classifies fields as changed, unchanged, rejected, or unknown.
- Emits `confirmationStatus=confirmed` only when returned or re-read evidence
  supports the final state.

**Failure behavior**:

- Missing source/auth blocks preview and commit with existing remediation.
- Unknown fields block before commit.
- Empty write requests block before commit.
- Missing write permission returns an error or partial result with remediation
  and no unsupported success claim.
- Network interruption or unavailable confirmation after a write attempt returns
  `status=partial` with `confirmationStatus=unknown` unless returned record data
  confirms the result.
- Lark rejection of field values returns the redacted Lark message and reports
  no confirmed table content change when the rejection occurs before mutation.

**Human examples**:

```bash
lark-bitable write --op create \
  --field "問題名稱=新增登入錯誤" \
  --field "狀態=待處理"

lark-bitable write --op create \
  --fields-json '{"問題名稱":"新增登入錯誤","狀態":"待處理"}' \
  --confirm

lark-bitable write --op update \
  --record-id recxxxx \
  --field "狀態=處理中"

lark-bitable write --op update \
  --record-id recxxxx \
  --field "狀態=處理中" \
  --confirm
```

**AI examples**:

```bash
lark-bitable schema --json
lark-bitable get recxxxx --json
lark-bitable write --op update --record-id recxxxx --fields-json '{"狀態":"處理中"}' --json
lark-bitable write --op update --record-id recxxxx --fields-json '{"狀態":"處理中"}' --confirm --json
```

## Command: valid

**Purpose extension**: Validate write readiness without disrupting read-only
readiness.

**New input**:

- `--workflow write`: Validate source/auth/field-read/write readiness for the
  write command.

**Structured output**:

- Existing validation fields.
- `workflow=write`.
- Blocking issues for missing auth or source.
- Partial or blocking issues for field discovery failure, target-record
  readability when a target is provided, and missing write permission when
  observed.
- `nextSafeCommand` pointing to configure, login, schema, preview, or Lark
  permission remediation.

**Failure behavior**:

- `valid --workflow global` does not fail only because write permission is
  missing.
- `valid --workflow write` may report `partial` when write permission cannot be
  verified without a live committed operation.

## Command: help

**Purpose extension**: Document `write` for humans and AI agents.

**New behavior**:

- Global help includes `write` in the command list.
- `help write` documents preview-first behavior, `--confirm`, field input
  formats, common permission failures, unsupported delete/schema behavior, and
  examples.
- QA and Developer help both mention that `write` is available only when the
  configured table and account are writable.

## Command: configure and lark --login

**Purpose extension**: Keep current setup behavior and make write permission
requirements discoverable.

**Behavior**:

- Existing configure inputs remain valid.
- Existing `--lark-scope` remains the mechanism for custom OAuth scopes.
- Documentation/help should instruct users to request a write-capable Bitable
  permission when they intend to commit writes.
- Existing read-only defaults remain valid for users who only need read,
  triage, research, verify, schema, and media download.

## Shared Lark Client Contract

`LarkClientTransport` adds:

- `createRecord({ appToken, tableId, fields, clientToken? })`
- `updateRecord({ appToken, tableId, recordId, fields })`

`LarkClient` adds:

- `createRecord(source, fields, options?)`
- `updateRecord(source, recordId, fields)`

**Behavior**:

- Both methods return normalized `BitableRecord` values when Lark returns record
  data.
- SDK adapter uses the same stored user access token header as existing reads.
- SDK adapter calls `bitable.appTableRecord.create` and
  `bitable.appTableRecord.update`.
- Lark non-zero responses throw errors through the existing `assertOk` path so
  command result classification can convert them into redacted issues.

## Unsupported Operations

The first `write` command must reject or avoid:

- Record delete.
- Batch create/update/delete.
- Clearing a table.
- Field create/update/delete.
- View create/update/delete.
- Permission or collaborator management.
- Schema mutation.
- Upsert semantics.
