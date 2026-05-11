# Quickstart: Lark Bitable CLI for AI Bug Triage

This quickstart describes the planned validation flow for developers and AI
agents. Commands are examples for the implementation phase and must stay aligned
with the final CLI help output.

## 1. Install and Build

1. Install project dependencies with the repository package manager.
2. Build the TypeScript CLI.
3. Confirm the CLI command is available.

Expected validation:

```bash
lark-bitable doctor
```

The command must report the CLI invocation method, version or health status,
bootstrap skill status, active configuration status, and authorization status.
If any prerequisite is missing, it must stop before table access.

## 2. Configure Lark App and Base Source

Human users can run configure without arguments and complete the guided prompts:

```bash
lark-bitable configure
```

AI agents and scripts can pass explicit values:

```bash
lark-bitable configure "https://example.larksuite.com/base/<appToken>?table=<tableId>&view=<viewId>" \
  --lark-app-id "$LARK_APP_ID" \
  --lark-app-secret "$LARK_APP_SECRET" \
  --lark-redirect-uri "$LARK_REDIRECT_URI" \
  --status-field "狀態" \
  --priority-field "優先級" \
  --title-field "標題"
```

Expected validation:

- The CLI parses and displays app token, table id, and view id.
- The CLI stores the active source.
- The CLI stores Lark app id/secret for login and token refresh, while command
  output reports only redacted app metadata and never prints the app secret.
- Configure state is stored outside the repository at
  `~/.lark-bitable-cli/config.json`, alongside auth state in the same
  `~/.lark-bitable-cli/` directory.
- The CLI stores the OAuth redirect URI from Lark Developer Console > Security
  Settings > Redirect URL. Event callback URLs from the app event callback page
  are not used for login.
- When app credentials are available, the CLI attempts to load the table field
  list and lets interactive users choose status, priority, and title fields by
  number. The actionable status value is also chosen from discovered status
  options or existing record values. If Lark denies field discovery,
  interactive configure stops and reports the permission/configuration
  remediation instead of asking humans to type field names.
- Field discovery uses `tenant_access_token`, so it requires
  application-identity permissions. Configure needs `base:field:read` for field
  metadata and application-identity `bitable:app:readonly` for Bitable record
  reads used when deriving existing status values. These permissions must be
  published and, when Lark marks them as reviewed, enterprise approval must pass
  before configure can load fields and status values reliably. SSO login
  separately uses user identity and requires the user-identity
  `bitable:app:readonly` permission.
- If field discovery fails with Lark code `99991672` and required scopes such as
  `[bitable:app:readonly, bitable:app, base:field:read]`, treat it as a missing
  or unpublished application-identity permission. Add application-identity
  `base:field:read` and application-identity `bitable:app:readonly` in Lark
  Developer Console > Permissions, publish a new app version, wait for approval
  if required, then rerun `lark-bitable configure`.
- The CLI does not attempt table access when required authorization is missing.
- Replacing a configured source reports the previous and new table identity.
- Invalid URLs fail before mutating the previous active source.

## 3. Login to Lark

Authorize Lark access before any table command.

```bash
lark-bitable lark --login
```

Expected validation:

- Login uses configured Lark app settings, opens the browser, starts a local
  callback server for the configured local redirect URI, waits for the
  SSO/OAuth callback, and exchanges the returned callback authorization code.
- The redirect URI sent to Lark exactly matches the configured OAuth Redirect
  URL, including host, port, and path.
- Live token exchange requires Lark app id and app secret from configure,
  environment variables, or explicit flags.
- Authorization-code mode remains available with
  `lark-bitable lark --login --auth-mode code --app-id "$LARK_APP_ID" --code <code>`.
- If Lark reports error `20027` or says `bitable:app:readonly` is missing, the
  app permission is not active for OAuth. Open Lark Developer Console >
  Permissions, add the user-identity `bitable:app:readonly` permission, publish
  the app version, wait for enterprise approval if required, then retry login.
- Successful login stores token state at `~/.lark-bitable-cli/auth.json`.
- Normal output shows only redacted account/domain/status metadata.
- Raw access or refresh tokens never appear in output.
- Failed or canceled login leaves API access unavailable.

## 4. Install Bootstrap Skill Guidance

Install or link the bootstrap skill assets shipped by the project so AI agents
can discover the workflow.

Expected validation:

```bash
lark-bitable doctor --json
```

The structured output must show whether bootstrap guidance is installed and what
the AI agent should do next. Missing skill installation must be reported as a
setup issue.

For local setup, `lark-bitable doctor --install-skill` installs the shipped skill
asset into the configured agent skill directory and reports the installed path.

## 5. Validate Readiness

Check whether required setup is complete before running workflow commands.

```bash
lark-bitable valid
lark-bitable valid --workflow triage
```

Expected validation:

- Missing login reports `lark-bitable lark --login` as the remediation.
- Missing source reports configure as the remediation.
- Missing field mappings list the required mappings and guide configuration.
- Network-only verification failures report `partial`, not `ready`.
- Ready output names the next safe command.
- Workflow scopes `global`, `inspect`, `triage`, and `research` validate only
  the prerequisites required for that workflow.
- Multiple missing prerequisites are reported in an actionable order instead of
  failing after the first missing item.

## 5.1 Read Human Help

Humans can use the workflow help before choosing a command:

```bash
lark-bitable help
lark-bitable help help
lark-bitable help configure
```

Expected validation:

- Global help lists the recommended human workflow and supported commands.
- Every command module, including `help`, has command-specific help with human
  usage, AI usage, inputs, outputs, common failures, next steps, and examples.
- Unknown command-specific help requests return a clear error with available
  commands and a valid help example.

## 6. Inspect Records

List records, retrieve one record, filter by a field, and search visible text
fields.

```bash
lark-bitable list --limit 20
lark-bitable get <record-id>
lark-bitable filter --field "狀態" --equals "待處理"
lark-bitable search "login error"
```

Expected validation:

- Output includes record identifiers and source metadata.
- Filter/search output reports criteria and matched fields.
- Empty results, inaccessible source, and missing field mappings are explicit.

## 7. Run Guided Triage

```bash
lark-bitable triage
```

Expected validation:

- Candidates are filtered to the configured actionable status, defaulting to
  `待處理`.
- Candidates are sorted by configured priority.
- Selection preserves a candidate snapshot and evidence.

## 8. Produce First Research Report

```bash
lark-bitable research --out reports/selected-bug-research.md
```

Expected validation:

- Report separates observed facts, assumptions, analysis, likely causes,
  recommended fixes, risks, next actions, and evidence.
- Every factual claim cites bug-record, repository-file, command-output,
  user-input, or runtime-observation evidence.
- Missing evidence or unverified causes remain labeled as unresolved.
- Raw access tokens and refresh tokens must not appear in report content.
- If repository evidence is partial, the report must keep likely causes
  unconfirmed and list missing evidence.

## 9. Logout

Clear locally stored Lark auth state.

```bash
lark-bitable lark --logout
```

Expected validation:

- Auth state is removed from `~/.lark-bitable-cli/auth.json`.
- The next Lark API command refuses to run and instructs the user to run
  `lark-bitable lark --login`.

## 10. Deterministic Test Flow

Implementation should include mocked Lark fixtures so this quickstart can be
validated without live Lark access:

```bash
pnpm test
```

Expected validation:

- URL parsing rejects invalid source URLs without mutating config.
- Config validation catches missing field mappings.
- Login validation redacts token state and fails closed when auth is missing.
- `valid` reports missing prerequisites with remediation steps.
- Record listing, filtering, searching, and triage sorting work against fixtures.
- Research report generation preserves evidence and caveats.
- Bootstrap self-check fails closed when prerequisites are missing.
