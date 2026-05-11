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

Stop when `doctor` or `valid` reports missing CLI, missing bootstrap guidance,
missing config, missing Lark login, expired or invalid auth, missing
authorization, missing field mappings, missing selected bug context, version
conflicts, or inconclusive live access.

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

- `lark-bitable list`
- `lark-bitable get <record-id>`
- `lark-bitable filter --field <field> --equals <value>`
- `lark-bitable search <query>`

## Triage and Research

- Use `lark-bitable triage` to select actionable bug records.
- Use `lark-bitable research` to create the first report for the selected bug.

Every factual claim in a research report must cite bug-record, repository-file,
command-output, user-input, or runtime-observation evidence. Preserve unknowns
and assumptions as unresolved; do not report them as facts.
