# Quickstart: Write Command for Bitable Content

This quickstart describes the planned validation flow for implementation. The
commands must stay aligned with final CLI help output.

## 1. Confirm Existing Setup

Install dependencies and build as usual:

```bash
pnpm install
pnpm build
```

Confirm read-only setup still reports correctly:

```bash
lark-bitable doctor
lark-bitable valid
lark-bitable schema --json
```

Expected validation:

- Config is read from `~/.lark-bitable/config.json`.
- Auth is read from `~/.lark-bitable/auth.json`.
- Existing read workflows remain available when write permission is missing.
- Output redacts access tokens, refresh tokens, and app secrets.

## 2. Configure a Writable Test Base

Use a disposable Lark Base/Bitable table for live write validation. Do not run
committed writes against production task tables until preview and tests pass.

```bash
lark-bitable configure "$LARK_BASE_URL" \
  --mode Developer \
  --lark-app-id "$LARK_APP_ID" \
  --lark-app-secret "$LARK_APP_SECRET" \
  --lark-redirect-uri "$LARK_REDIRECT_URI" \
  --status-field "狀態" \
  --priority-field "優先級" \
  --title-field "問題名稱"
```

Then login with OAuth:

```bash
lark-bitable lark --login
```

Expected validation:

- The configured account can read the target test table.
- The Lark app and target Base grant write-capable Bitable access before
  committed write tests are attempted.
- If the account can read but cannot write, `write --confirm` reports a
  permission issue and does not claim success.

## 3. Validate Write Readiness

```bash
lark-bitable valid --workflow write --json
```

Expected validation:

- Missing source or auth blocks write readiness.
- Missing or unverified write permission is reported specifically for write
  readiness and does not break global read readiness.
- `nextSafeCommand` points to configure, login, schema, preview, or Lark
  permission remediation.

## 4. Preview a Create

```bash
lark-bitable write --op create \
  --field "問題名稱=Write command preview" \
  --field "狀態=待處理" \
  --json
```

Expected validation:

- No table content changes.
- Output shows `confirmationStatus=not-written`.
- Output shows the exact field values that would be written.
- Unknown field names fail before any write.

## 5. Commit a Create

```bash
lark-bitable write --op create \
  --fields-json '{"問題名稱":"Write command live create","狀態":"待處理"}' \
  --client-token "manual-write-create-001" \
  --confirm \
  --json
```

Expected validation:

- Exactly one record is created in the configured table.
- Output includes the created record id.
- Output includes written fields and source metadata.
- Output includes the client token used for audit/retry context.
- If the write response or confirmation read cannot prove final state, output
  labels the result as unknown rather than confirmed.

## 6. Preview an Update

Use the record id returned by the create step:

```bash
lark-bitable write --op update \
  --record-id "<created-record-id>" \
  --field "狀態=處理中" \
  --json
```

Expected validation:

- No table content changes.
- Output shows planned before/after field changes when the current record is
  readable.
- Unrelated fields are not included as requested changes.

## 7. Commit an Update

```bash
lark-bitable write --op update \
  --record-id "<created-record-id>" \
  --field "狀態=處理中" \
  --confirm \
  --json
```

Expected validation:

- Only the requested field changes.
- Output includes the target record id.
- Output distinguishes changed fields from unchanged fields.
- Follow-up `get` confirms the visible record state:

```bash
lark-bitable get "<created-record-id>" --json
```

## 8. Validate Failure Paths

Run deterministic failure checks with fixtures/mocks and, where safe, a live
test table:

```bash
lark-bitable write --op update --field "狀態=處理中" --json
lark-bitable write --op create --field "不存在欄位=value" --json
lark-bitable write --op create --json
```

Expected validation:

- Missing update record id fails before preview.
- Unknown fields fail before commit.
- Empty field sets fail before commit.
- `--op create --record-id recxxxx` fails as invalid input.
- `--client-token` on update fails as invalid input.
- Permission failures do not claim the table changed.

## 9. Deterministic Test Flow

Implementation should add fixture-based tests so validation does not require
live Lark access:

```bash
pnpm test
pnpm build
pnpm format:check
pnpm quickstart:validate
```

Expected validation:

- `pnpm quickstart:validate` exercises `valid --workflow write`, create
  preview, committed create with a fixture response, and update preview through
  deterministic hidden test seams.
- Field parser handles repeated `--field`, JSON values, `--fields-json`, empty
  values, malformed JSON, and duplicate fields.
- Write operation validation rejects unsupported input combinations.
- Preview-only create/update never calls create/update transport methods.
- Committed create calls the single-record create transport with expected
  source, fields, auth header, and client token.
- Committed update calls the single-record update transport with expected
  source, record id, and fields.
- Result classification distinguishes confirmed, failed, partial, unknown, and
  not-written states.
- Output redacts secrets.
- Existing list/get/filter/search/triage/research/verify/media tests continue
  passing.
