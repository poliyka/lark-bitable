---
name: lark-bitable
description: Use the local Lark Bitable CLI to inspect bug records, run triage, and produce evidence-backed reports.
---

<!-- lark-bitable-bootstrap-version: 2026-10-28-table-profiles -->

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
7. Run `lark-bitable valid --workflow dashboard` before relying on dashboard
   readiness details.
8. Run `lark-bitable schema` first when you only need field headers.
9. Run `lark-bitable schema --json` before querying or writing when the table schema,
   exact status values, owner field, or field types are not
   already known from current context.

Stop when `doctor` or `valid` reports missing CLI, missing bootstrap guidance,
missing config, missing Lark login, expired or invalid auth, missing
authorization, missing selected bug context, version conflicts, or
inconclusive live access.

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
  source identity, Lark app settings, and the real config/auth paths.
- Owner filtering is optional. Use `--owner <name>` only when the user asks to
  focus records by owner. Missing owner field must not block record discovery;
  report `ownerCriteria.applied=false` and continue with the returned records.
- Query commands support `--limit <positive-integer>`. Use limits when listing
  candidate records for a human. Invalid limits must be fixed instead of
  retried with a guessed value.
- Do not guess field names, status values, or owner field names across
  languages. If the current context does not show the exact table shape, run
  `lark-bitable schema --json` first and use its `fields` and sampled observed
  values.
- Do not commit Bitable writes by default. Always run `lark-bitable write`
  without `--confirm` first, inspect the preview, and only repeat with
  `--confirm` after the requested source, target record, and field changes are
  explicit.
- `lark-bitable dashboard` is a local-only no-dashboard-login UI. It can start
  even when Lark auth or source configuration is missing; Lark-backed pages
  should be interpreted as partial/blocked until the dashboard config and Lark
  login pages fix those prerequisites.
- Dashboard language preference is browser web cache only. Do not treat it as
  CLI config, and do not translate source data, audit snapshots, command output,
  file paths, or research report contents.

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
- The dashboard Audit Log page reads active and rotated audit logs and reports
  malformed or unreadable files as skipped evidence. Use it for browsing, but
  keep command JSON output as the source of truth for a just-executed command.

## Dashboard

- Start the local dashboard with `lark-bitable dashboard`; default port is
  `48731`, and the command increments to the next available port when occupied.
- Use `lark-bitable dashboard --no-open --json` in automation to retrieve
  `data.binding.origin` without opening a browser.
- The dashboard provides live configure, live Lark login/logout, audit log
  search, playground runs, research report browsing, table context, and
  Traditional Chinese/English UI language switching.
- When the dashboard service is running, CLI commands and dashboard actions
  emit redacted live activity and state invalidation over the local WebSocket
  channel so open tabs refresh without manual reload.
- If the dashboard service is absent, stale, or unreachable, CLI commands still
  complete normally and must not be interpreted as failed because live delivery
  was skipped.
- Playground write requests remain preview-first. Do not request or interpret a
  committed write unless the user explicitly confirms mutation.
- No database is used for dashboard state. Temporary UI state, including
  language selection and playground drafts, belongs in browser web cache only.

## Login and Configure

- For human setup, run `lark-bitable configure` first so the user can provide
  the Lark Base URL, Lark app id/secret, OAuth redirect URI, and workflow mode
  through prompts. Configure does not store bug field settings, owner fields,
  priority fields, or actionable status defaults.
- If schema/list/valid reports Lark code `99991672` with required scopes such
  as `[bitable:app:readonly, bitable:app]`, treat it as a missing or inactive
  user-identity permission, not as a field-name problem.
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
- If `valid` reports `auth-refresh-failed`, retry the command first; if it
  still fails, run `lark-bitable lark --login` with the required scopes.
- Inspect the stored auth scopes before fallback login. Check the current auth
  scopes in `~/.lark-bitable/auth.json`, then request the required scope set
  explicitly when logging in again. Use
  `lark-bitable lark --login --scope="<scope>"` for each required scope; for
  write-capable Bitable access this normally means
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

## 多表選擇

- For a table other than activeSource, save a profile with
  `lark-bitable configure <url> --table-profile <name>`, or use one-off
  `--table <tblXXX|full-url>`; do not switch tables with a temporary HOME.
- `list`, `get`, `filter`, `search`, `schema`, and `write` support
  `--table-profile <name>` or `--table`, never both together.
- Omit both selectors to use activeSource; selecting a table does not change
  activeSource. Profiles share the same auth; view IDs are metadata only and
  do not filter reads.
- `triage`, `verify`, `research`, `doctor`, `valid`, `dashboard`, and `media`
  do not support these selectors. Table workflows use activeSource;
  `triage` and `verify` only inspect activeSource. Media downloads use shared
  auth and the specified file token.
- Run `schema --table-profile <name> --json` (or the same `--table`) for the
  selected table before querying or writing when its schema is unknown.
- Keep identical table selection arguments in write preview and confirmation;
  emitted follow-up commands retain them, including record readback commands.

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
- `lark-bitable get <record-id> --json`
- `lark-bitable write --op update --record-id <record-id> --fields-json '{"附件":[{"file_token":"boxcnexisting"},"./evidence/fixed.png"]}' --json`
- `lark-bitable write --op update --record-id <record-id> --fields-json '{"附件":[{"file_token":"boxcnexisting"},"./evidence/fixed.png"]}' --confirm --json`

Rules for write operations:

- Preview is mandatory. Without `--confirm`, the command must report
  `confirmationStatus=not-written` and no create/update should be treated as
  performed.
- For update, run preview or `get <record-id>` first so before values are
  visible. Do not guess current table state.
- Use exact field names from `schema --json`; unknown fields must be fixed
  before retrying.
- Before writing an attachment/photo field on an existing record, run
  `get <record-id>` first. If the field already contains attachments, preserve
  existing `{"file_token":"..."}` objects unless the user explicitly requests
  replacement.
- Attachment/photo fields can be written from existing
  `{"file_token":"..."}` objects or local file paths in `--fields-json`.
  Preview validates local attachment paths and reports not-run media evidence,
  but does not upload. Confirmed writes upload local files through Lark Drive
  media `POST /open-apis/drive/v1/medias/upload_all`, then write the returned
  `file_token` objects to the attachment/photo field.
- Preview output includes `attachmentPlan` for attachment/photo fields. Prefer
  `requestedEffect` for the requested field effect and `replacementPolicy` for
  CLI protection mode; `mode` is a backward-compatible alias of
  `requestedEffect`.
- If `willReplaceExisting=true` and `replacementPolicy=preserve`, do not run a
  confirmed write. The preview `nextSafeCommands` must not be treated as a
  confirm path in this case; rebuild `--fields-json` with existing
  `file_token` objects plus new local paths, then preview again. Confirmed
  replacement requires `--attachment-mode replace` and explicit user intent;
  default `--attachment-mode preserve` blocks accidental replacement before
  uploading local files.
- Local attachment upload uses the current Base `app_token` as `parent_node`.
  Image file extensions use `parent_type=bitable_image`; other files use
  `parent_type=bitable_file`. Direct upload is limited to files no larger than
  20MB. Larger files require a separate chunked media upload flow before writing
  the returned `file_token`.
- Before committed writes, ensure auth was obtained with
  `lark-bitable lark --login --scope="bitable:app"`. If current auth scopes are
  only `bitable:app:readonly`, ask the user to re-login with write scope before
  running `write --confirm`.
- Use `--client-token` only for committed creates.
- An explicit client token must be a UUID; otherwise confirmed create fails
  locally with `invalid-client-token`. Omit it to let the CLI generate a UUID.
- Missing write permission, rejected values, or unknown confirmation must be
  reported as failure/partial evidence, not as success.
- If media upload succeeds but the record write fails, keep the returned
  `file_token` values from command output and retry the Bitable write with those
  tokens instead of uploading the same file again.
- The command does not support delete, batch write, upsert, schema mutation,
  view mutation, or permission management. Do not emulate those behaviors with
  repeated `write` calls unless the user explicitly asks for separate single
  record operations and each one is previewed.

### For fix evidence image upload

1. Run `lark-bitable valid --workflow write --json`.
2. Run `lark-bitable schema --json` if the exact attachment/photo field is
   unknown.
3. Run `lark-bitable get <record-id> --json` and inspect existing attachments.
4. Build `--fields-json` with existing `file_token` objects plus new local file
   paths unless replacement is explicitly requested.
5. Run `lark-bitable write ... --json` without `--confirm`.
6. Confirm the preview says no unintended replacement will happen. If
   `attachmentPlan[].willReplaceExisting=true` and
   `replacementPolicy=preserve`, stop and rebuild `--fields-json`; do not use a
   confirm command unless replacement was explicitly requested.
7. Repeat the same command with `--confirm --json`.
8. Run `lark-bitable get <record-id> --json`.
9. Download the returned file token with
   `lark-bitable media download <file-token> --out <path> --json`.
10. Inspect or hash the downloaded file before claiming the evidence was
    uploaded.

## Developer Mode: Triage and Research

- Use `lark-bitable triage` to select actionable bug records.
- Use `lark-bitable research` to create the first report for the selected bug.
  Do not rely on the empty section defaults: pass repeatable
  `--assumption`, `--likely-cause`, `--recommended-fix`, `--risk`, and
  `--next-action` flags when those sections are known, and cite evidence in
  concrete claims.
- Every `research` invocation writes canonical JSON under
  `~/.lark-bitable/research/{name}-{datetime}.json`.
- `lark-bitable research -o <path>` or `--out <path>` creates a symbolic link to
  the canonical JSON when safe. Do not assume `<path>` is an independent report
  copy.

### Required bug-investigation flow

When a human or AI asks for high-risk bugs, the workflow must be:

1. If you only need field headers, run `lark-bitable schema`.
2. If the exact table schema is not known, run `lark-bitable schema --json`.
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
  `file_token` objects plus the new related evidence local paths or
  `file_token` objects. Do not overwrite existing attachments with only the new
  evidence unless the user explicitly requests replacement.
- If related media exists as a local file, preview the `write` with that local
  path first, then run the same write with `--confirm` only after the requested
  attachment/photo field and before values are explicit.
  Avoid claiming the asset was written if media upload or the final record write
  fails.
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
