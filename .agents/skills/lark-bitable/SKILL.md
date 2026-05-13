---
name: lark-bitable
description: Use the local Lark Bitable CLI to inspect bug records, run triage, and produce evidence-backed reports.
---

# Lark Bitable CLI Bootstrap

Use this skill before reading Lark Bitable data for a bug-fixing workflow.

## Required Checks

1. Run `lark-bitable doctor`.
2. Run `lark-bitable valid --workflow inspect` before `list`, `get`, `filter`,
   or `search`.
3. Run `lark-bitable valid --workflow triage` before `triage`.
4. Run `lark-bitable valid --workflow research` before `research`.
5. Run `lark-bitable valid --workflow verify` before `verify` in QA mode.
6. Run `lark-bitable valid --workflow write` before committed `write`
   operations.
7. Run `lark-bitable schema` first when you only need field headers.
8. Run `lark-bitable schema --json` before querying or writing when the table schema,
   field mappings, exact status values, owner field, or field types are not
   already known from current context.

Stop when `doctor` or `valid` reports missing CLI, missing bootstrap guidance,
missing config, missing Lark login, expired or invalid auth, missing
authorization, incomplete configure mappings, missing selected bug context,
version conflicts, or inconclusive live access.

## Mode-Aware Workflow

- Always inspect the active mode from `valid --workflow <scope> --json`,
  `doctor --json`, or command JSON output before choosing the workflow.
- `Developer` mode is for bug discovery, full-record inspection, authenticated
  media download, and evidence-backed `research`.
- `QA` mode is for task verification through `verify`. It can discover safe
  workspace checks and must report executed checks, skipped checks, assumptions,
  risks, and manual next steps separately.
- Configure mode with `lark-bitable configure --mode QA` or
  `lark-bitable configure --mode Developer`. Human setup should use guided
  `configure`; AI setup should pass explicit flags.
- `doctor` should verify whether configure is actually complete, including
  required bug mappings, Lark app settings, and the real config/auth paths.
- Owner filtering is optional. Use `--owner <name>` only when the user asks to
  focus records by owner or when a default owner is configured. Missing owner
  field must not block record discovery; report `ownerCriteria.applied=false`
  and continue with the returned records.
- Query commands support `--limit <positive-integer>`. Use limits when listing
  candidate records for a human. Invalid limits must be fixed instead of
  retried with a guessed value.
- Do not guess field names, status values, or owner field names across
  languages. If the current context does not show the exact table shape, run
  `lark-bitable schema --json` first and use its `fields`, `mappings`, and
  sampled observed values.
- Do not commit Bitable writes by default. Always run `lark-bitable write`
  without `--confirm` first, inspect the preview, and only repeat with
  `--confirm` after the requested source, target record, and field changes are
  explicit.

## Audit Log

- Every CLI command appends a structured audit entry to
  `~/.lark-bitable/logs/audit.json`.
- The active audit file is compact line-based JSON: each line is one complete
  audit entry object. It is not pretty formatted and is not wrapped in an
  `entries` array.
- Retention is logrotate-like. When the active file belongs to a previous day,
  it is rotated to `audit-YYYY-MM-DD.json`; rotated audit files outside the
  14-day window are removed on append.
- Audit entries are redacted. Do not expect app secrets, OAuth codes, bearer
  tokens, refresh/access tokens, or write `--client-token` values to be present.
- If audit writing fails, the original command should still be interpreted from
  its normal output; the CLI emits only a stderr warning.
- For tests or isolated automation, pass hidden `--audit-path <path>` or set
  `LARK_BITABLE_AUDIT_PATH=<path>` so audit logs do not mix with the user's
  normal local history.

## Login and Configure

- For human setup, run `lark-bitable configure` first so the user can provide
  the Lark Base URL, Lark app id/secret, OAuth redirect URI, and field mappings
  through prompts. Configure tries to load table fields and shows numbered
  choices when Lark app credentials can read the table metadata.
- Configure field discovery uses app credentials and `tenant_access_token`.
  If it fails after app id/secret are entered, check that application identity
  has both `base:field:read` for field metadata and
  `bitable:app:readonly` for Bitable record reads used when deriving existing
  status values. These are not replacements for the user-identity
  `bitable:app:readonly` permission used by browser login. All required
  permissions must be published and approved before configure can load numbered
  field choices and status values reliably.
- If configure reports Lark code `99991672` with required scopes such as
  `[bitable:app:readonly, bitable:app, base:field:read]`, treat it as a missing
  or inactive application-identity permission, not as a field-name problem.
- For AI setup, run `lark-bitable configure <Lark Base URL> --lark-app-id <id> --lark-app-secret <secret> --lark-redirect-uri <registered-redirect-uri>`
  with explicit values provided by the user or environment.
- Run `lark-bitable lark --login` when auth is missing, invalid, or
  insufficient. The command opens a browser and waits for the local SSO
  callback using the configured Lark app settings.
- If auth is expired but a refresh token is present, use the refresh token to
  refresh before starting a browser login. Run the intended command again or run
  `lark-bitable valid --workflow <scope> --json` after confirming stored Lark
  app credentials exist; the CLI can refresh with the stored refresh token and
  app secret. Only fall back to `lark-bitable lark --login` when refresh is not
  possible or still leaves auth unusable.
- Inspect the stored scopes before fallback login. Check the current auth scopes
  in `~/.lark-bitable/auth.json` and the configured `larkApp.scopes` in
  `~/.lark-bitable/config.json`, then preserve the required scope set when
  logging in again. Use `lark-bitable lark --login --scope="<scope>"` for each
  required scope; for write-capable Bitable access this normally means
  `lark-bitable lark --login --scope="bitable:app"`. Do not replace an expired
  write-capable token with a fresh readonly token.
- For committed Bitable writes, the user access token must be requested with
  write scope. After the Lark app has published and approved the user-identity
  write permission, run `lark-bitable lark --login --scope="bitable:app"`.
  A token previously issued with only `bitable:app:readonly` remains read-only
  until the user logs in again with the write scope.
- The redirect URI is the OAuth Redirect URL from Lark Developer Console >
  Security Settings. Do not use the Event Callback URL from the event callback
  page for login.
- If Lark login shows error `20027` or says `bitable:app:readonly` is missing,
  the app permission is not active for OAuth yet. Open Lark Developer Console >
  Permissions, add the user-identity `bitable:app:readonly` permission, publish
  the app version, wait for enterprise approval if required, then retry
  `lark-bitable lark --login`.
- Use `lark-bitable lark --login --auth-mode code --app-id "$LARK_APP_ID" --code <code>`
  only when the user already has an authorization code.
- Run `lark-bitable lark --logout` only when the user wants to clear local Lark
  auth state.
- Use only user-provided Lark app credentials and Lark Base URLs. Never invent
  or infer them.

## Inspect

- `lark-bitable list --limit <n>`
- `lark-bitable schema --json`
- `lark-bitable get <record-id>`
- `lark-bitable filter --field <field> --equals <value> --limit <n>`
- `lark-bitable search <query> --limit <n>`
- `lark-bitable media download <file-token> --out <path>`

Use `get` as the record-detail step. There is no separate `detail` command
required when `get` can show the full record.

## Write

- `lark-bitable write --op create --field "<field>=<value>" --json`
- `lark-bitable write --op create --fields-json '{"欄位":"值"}' --confirm --json`
- `lark-bitable write --op update --record-id <record-id> --field "<field>=<value>" --json`
- `lark-bitable write --op update --record-id <record-id> --fields-json '{"欄位":"值"}' --confirm --json`

Rules for write operations:

- Preview is mandatory. Without `--confirm`, the command must report
  `confirmationStatus=not-written` and no create/update should be treated as
  performed.
- For update, run preview or `get <record-id>` first so before values are
  visible. Do not guess current table state.
- Use exact field names from `schema --json`; unknown fields must be fixed
  before retrying.
- Before committed writes, ensure auth was obtained with
  `lark-bitable lark --login --scope="bitable:app"`. If current auth scopes are
  only `bitable:app:readonly`, ask the user to re-login with write scope before
  running `write --confirm`.
- Use `--client-token` only for committed creates.
- Missing write permission, rejected values, or unknown confirmation must be
  reported as failure/partial evidence, not as success.
- The command does not support delete, batch write, upsert, schema mutation,
  view mutation, or permission management. Do not emulate those behaviors with
  repeated `write` calls unless the user explicitly asks for separate single
  record operations and each one is previewed.

## Developer Mode: Triage and Research

- Use `lark-bitable triage` to select actionable bug records.
- Use `lark-bitable research` to create the first report for the selected bug.

### Required bug-investigation flow

When a human or AI asks for high-risk bugs, the workflow must be:

1. If you only need field headers, run `lark-bitable schema`.
2. If the exact table schema or configured mappings are not known, run
   `lark-bitable schema --json`.
3. Use `triage`, `list`, `search`, or `filter` to produce a candidate list.
4. Return a numbered candidate summary that includes the record id and the
   minimum fields needed to choose a record.
5. After the user selects one record, run `lark-bitable get <record-id>` before
   any repository research.
6. Read the full record fields from `get`, not only the triage/list summary.
7. If the record includes image links, attachment links, or other media URLs,
   inspect those assets before making conclusions when the environment can
   access them.
8. Treat each image or attachment as evidence. Record whether it was actually
   viewed, only referenced, or could not be opened.
9. Do not convert unread assets, missing access, or partial inspection into
   facts.
10. Use the full bug record to guide repository research, reproduction
    inspection, and root-cause analysis.
11. Only after the record and any accessible assets have been inspected should
    you write the first research report.

## QA Mode: Verify

- Use `lark-bitable configure --mode QA` to activate QA mode.
- Use `lark-bitable triage --limit <n>` or
  `lark-bitable triage --owner <name> --limit <n>` to choose a task.
- Use `lark-bitable verify <record-id> --checks auto --json` to verify a
  specific task, or `lark-bitable verify --checks auto --json` to use the last
  triage selection.
- Use `--checks none` when the user asks for a report without executing
  commands. The output must mark checks as skipped and list manual next steps.
- `verify` reads the full selected record, extracts media references, and
  discovers workspace checks from observable repository files. It does not
  treat un-downloaded images or attachments as inspected facts.
- If `verify` lists media references, download them with
  `lark-bitable media download <file-token> --out <path>` and inspect the local
  file before making claims about image or attachment contents.
- If QA verification produces or identifies representative QA snapshot photos,
  related images, or attachments, those assets can be written back to the
  selected Bitable record with `lark-bitable write` when an attachment/photo
  field is available.
- QA write media evidence is optional enrichment, but when a QA result, status,
  note, or conclusion is being written, prefer adding relevant media evidence in
  the same `write` so the record stays self-contained. This is not limited to
  one photo: include every representative snapshot or attachment that helps show
  the verified state, failure, reproduction result, or fix confirmation.
- Preserve existing attachments: before writing QA write media evidence, run
  `get <record-id>` and write the attachment/photo field as the existing
  `file_token` objects plus the new related evidence `file_token` objects. Do
  not overwrite existing attachments with only the new evidence unless the user
  explicitly requests replacement.
- If related media exists only as a local file and no Bitable/Drive
  `file_token` is available, report the upload/write as unavailable instead of
  claiming the asset was written. The current `write` command can set attachment
  fields from file-token values; it does not upload local files by itself.
- If no attachment/photo field is available, mention the media evidence and the
  write limitation in the QA report or another writable note field instead of
  inventing a field.
- Do not use `research` as the QA verification workflow unless the user
  explicitly asks for Developer-style research; prefer `verify` in QA mode.

### Asset download rule

- Lark image and attachment URLs must be fetched with the authenticated Lark
  session or auth token, not as anonymous public URLs.
- Prefer `lark-bitable media download <file-token> --out <path>` for Bitable
  images and attachments. This command uses the official Drive media download
  API: `GET /open-apis/drive/v1/medias/:file_token/download`.
- When Lark requires advanced-permission media authorization, pass the required
  `extra` value with `--extra`.
- If a link is opened without auth, the response may be a permission page,
  redirect target, or other incorrect payload instead of the asset itself.
- Before treating an asset as evidence, confirm the download response is the
  actual file content or a clearly identified supported preview payload.
- If the asset cannot be downloaded with the current auth token, report that
  explicitly and continue only with the evidence that was actually retrieved.

### Evidence boundaries

- A list result is only a candidate summary.
- A triage result is selection evidence, not the full bug record.
- `get` is the authoritative source for the selected record's visible fields.
- Image and attachment inspection must be explicit; do not assume a URL was
  actually viewed just because it appeared in the record.
- Research findings must separate record facts, asset observations, repository
  findings, and assumptions.

Every factual claim in a research report must cite bug-record, repository-file,
command-output, user-input, or runtime-observation evidence. Preserve unknowns
and assumptions as unresolved; do not report them as facts.
