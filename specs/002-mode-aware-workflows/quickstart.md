# Quickstart: Mode-Aware QA and Developer Workflows

This quickstart describes the planned validation flow for implementation. The
commands must stay aligned with final CLI help output.

## 1. Confirm Existing Setup

Install dependencies and build as usual:

```bash
pnpm install
pnpm build
```

Confirm the CLI can report setup state:

```bash
lark-bitable doctor
lark-bitable valid
```

Expected validation:

- Config is read from `~/.lark-bitable/config.json`.
- Auth is read from `~/.lark-bitable/auth.json`.
- Output redacts secrets.
- Missing setup returns remediation instead of attempting table access.

## 2. Configure Developer Mode

Human guided setup:

```bash
lark-bitable configure
```

Non-interactive setup:

```bash
lark-bitable configure "$LARK_BASE_URL" \
  --mode Developer \
  --lark-app-id "$LARK_APP_ID" \
  --lark-app-secret "$LARK_APP_SECRET" \
  --lark-redirect-uri "$LARK_REDIRECT_URI" \
  --status-field "狀態" \
  --priority-field "優先級" \
  --title-field "問題名稱" \
  --owner-field "負責人" \
  --default-owner "openclaw"
```

Expected validation:

- Mode is stored as `Developer`.
- Existing source, auth settings, status field, priority field, title field, and
  owner field are preserved when mode changes later.
- Owner field is chosen from discovered fields in guided setup when field
  discovery succeeds.
- Owner field and default owner can be left blank.
- If owner default is configured, output states the default owner without
  treating it as a record fact.

## 3. Configure QA Mode

Switch mode without clearing the source:

Expected validation:

- Active mode changes to `QA`.
- Common source and Lark app settings remain unchanged.
- Default owner is only stored when explicitly provided with `--default-owner`.
- If no owner field exists, QA mode still works. Any default owner remains
  inactive until an owner field is configured.

## 4. Validate Mode Readiness

Developer workflow:

```bash
lark-bitable valid --workflow triage
lark-bitable valid --workflow research
```

QA workflow:

```bash
lark-bitable valid --workflow verify
```

Expected validation:

- Output includes active mode and whether it was explicit or defaulted.
- `verify` is ready only in QA mode.
- `research` remains the Developer report workflow.
- Owner default without owner field is reported as inactive, not blocked.
- `nextSafeCommand` points to the next setup or workflow command.

## 5. Use Developer Mode With Owner Filtering

Inspect the configured table shape before choosing fields or status values:

```bash
lark-bitable schema
```

Expected validation:

- Human mode shows numbered field headers only.
- `--json` adds field metadata, configured mappings, and observed sample
  values.
- Agents use `schema --json` instead of guessing localized field names or
  status values.

List and search only records owned by one person:

```bash
lark-bitable list --owner "openclaw" --json
lark-bitable search "login" --owner "openclaw" --limit 10 --json
lark-bitable filter --field "狀態" --equals "待处理" --owner "openclaw" --limit 10 --json
```

Run triage with stored Developer default owner:

```bash
lark-bitable triage --json
```

Expected validation:

- Output includes owner criteria when applied.
- Command-level `--owner` overrides the stored default for that run.
- `--no-default-owner` disables stored default owner for that run.
- `--limit` caps returned records after owner/search/filter criteria are
  applied.
- Invalid limits such as zero, negative values, or non-integers fail with a
  clear remediation.
- Empty owner-filtered results report criteria and do not silently broaden to
  all records.
- Missing owner field does not block the command. Output must state
  `ownerCriteria.applied=false`, explain that the owner field is missing, and
  show configure guidance for enabling owner filtering.

## 6. Inspect Full Record and Media Before Developer Research

```bash
lark-bitable triage
lark-bitable get <selected-record-id> --json
lark-bitable media download <file-token> --out ./evidence/asset.bin --json
```

Expected validation:

- `get` returns the selected record's complete visible fields and extracted
  `mediaReferences`.
- `media download` uses an authenticated Lark request and returns
  `usedAuthenticatedRequest=true`.
- Anonymous media URLs are not used as evidence. If an anonymous request is
  attempted, it should return a Lark missing-token or unauthorized JSON response
  rather than the asset.
- Media content is not treated as fact until the downloaded local file has been
  inspected.

## 7. Produce Developer Research

```bash
lark-bitable research --out reports/selected-bug-research.md
```

Expected validation:

- Existing triage sorting by actionable status and priority still works.
- Selection evidence includes owner criteria when owner filtering was applied.
- The agent ran `get <record-id>` before repository research.
- Any media references were downloaded through `lark-bitable media download`
  before image or attachment content was used as evidence.
- Research report remains separated into observed facts, assumptions, analysis,
  likely causes, recommended fixes, risks, next actions, and evidence.
- Owner criteria are selection context, not proof of cause.

## 8. Use QA Mode Task Verification

Configure QA mode and select a task:

```bash
lark-bitable configure --mode QA
lark-bitable triage --owner "qa-user" --limit 10
```

Verify the selected task:

```bash
lark-bitable verify --out reports/qa-verification.md
```

Verify a specific record:

```bash
lark-bitable verify <record-id> --checks auto --owner "qa-user" --limit 10 --json
```

Expected validation:

- `verify` refuses to run when active mode is not `QA`.
- `verify` accepts `--owner`, `--no-default-owner`, and `--limit` for validating
  the selected task against table record discovery criteria.
- If an owner filter is applied and the requested record is outside that owner
  set, verification blocks instead of silently broadening the criteria.
- The selected task record is cited as evidence.
- Media references are listed as `lark-media` evidence with `status=not-run`
  until they are downloaded and inspected separately.
- Workspace check candidates are based on observable files or commands, such as
  `package.json` scripts and test directories.
- Safe checks may run when supported by evidence.
- Unsafe, destructive, unrelated, or unsupported checks are skipped.
- If no check runs, the report includes skipped-check reasons and manual next
  steps.
- Failed checks are reported as observed command results, while root causes
  remain assumptions unless independently proven.

## 9. Read Mode-Specific Help

```bash
lark-bitable help
lark-bitable help configure
lark-bitable help valid
lark-bitable help verify
lark-bitable help "media download"
```

Expected validation:

- Help shows active mode when configured.
- QA help describes verification, check discovery, skipped checks, manual QA
  steps, and evidence boundaries.
- Developer help describes list/search/filter/triage/research and owner
  filtering.
- Every command has human usage, AI usage, inputs, outputs, common failures,
  examples, and next steps.

## 10. Deterministic Test Flow

Implementation should add fixture-based tests so validation does not require
live Lark access:

```bash
pnpm test
pnpm build
pnpm format:check
pnpm quickstart:validate
```

Expected validation:

- Config schema accepts `QA` and `Developer` and rejects unsupported modes.
- Existing configs default to Developer behavior without losing source data.
- Guided configure can choose owner field from discovered fields.
- Guided configure allows owner field and default owner to remain blank.
- Owner filtering works for string, people-like object, select, and multi-select
  values.
- Owner filtering without owner field continues unfiltered and reports
  `ownerCriteria.applied=false`.
- `list`, `search`, `filter`, `triage`, and table-record discovery inside
  `verify` respect `--limit`.
- `valid --workflow verify` checks QA mode and selected-task prerequisites.
- `verify` records executed checks, skipped checks, evidence, assumptions, and
  risks.
- Developer `research` output remains evidence-backed and backward compatible.
