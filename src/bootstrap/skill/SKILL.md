---
name: lark-bitable-cli
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
6. Run `lark-bitable schema` first when you only need field headers.
7. Run `lark-bitable schema --json` before querying when the table schema,
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
- Run `lark-bitable lark --login` when auth is missing, expired, invalid, or
  insufficient. The command opens a browser and waits for the local SSO
  callback using the configured Lark app settings.
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
