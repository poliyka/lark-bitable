# Quickstart: Dashboard Command for Local UI

## Prerequisites

- Node.js `>=22`
- `pnpm install`
- Existing project setup for `lark-bitable`

## Build and Test

```bash
pnpm build
pnpm test
```

Expected result:

- TypeScript build succeeds.
- Vitest passes unit and integration tests.

## Start Dashboard

```bash
pnpm dev -- dashboard
```

Expected result:

- The command reports a local URL.
- Default URL is `http://127.0.0.1:48731` when the port is available.
- If `48731` is occupied, the command reports the next available incremented
  port.
- The dashboard opens without a dashboard username or password.

## Start Without Opening Browser

```bash
pnpm dev -- dashboard --no-open --json
```

Expected result:

- JSON output includes `data.binding.origin`.
- `data.dashboardLoginRequired` is `false`.
- `data.localOnly` is `true`.

## Validate Dashboard Readiness

```bash
pnpm dev -- valid --workflow dashboard --json
```

Expected result:

- Dashboard startup readiness is checked.
- Missing Lark auth does not block dashboard startup.
- Lark-backed pages are reported as blocked or partial when auth/source setup is
  incomplete.

## Live Fix Configure

1. Open the dashboard URL.
2. Navigate to configuration.
3. Enter or update the Lark Base URL, Lark app settings, workflow mode, field
   mappings, actionable status, and owner settings.
4. Save the draft.
5. Run readiness validation from the page.

Expected result:

- Secrets are redacted after save.
- Readiness shows blocking and partial issues with remediation.
- Other dashboard pages use the updated configuration without restarting the
  dashboard.

## Live Lark Login

1. Open the dashboard URL.
2. Navigate to auth.
3. Start Lark login.
4. Complete the browser authorization flow.
5. Return to the dashboard and refresh auth status.

Expected result:

- Auth status changes to ready when authorization succeeds.
- Tokens and authorization codes are never displayed.
- Canceled or failed login shows remediation.

## Audit Log Query

Generate sample audit entries:

```bash
pnpm dev -- help --json
pnpm dev -- valid --workflow global --json
```

Open the audit page and filter by command or status.

Expected result:

- Entries show newest-first.
- Detail view shows sanitized argv, issues, evidence summaries, snapshots, and
  retention data.
- Malformed or unreadable audit files are reported as skipped, not as success.

## Playground

From the playground page, run:

- `valid` with workflow `triage`
- `schema`
- `list`
- `search`
- `research`
- `write` preview

Expected result:

- Runs display status, issues, evidence, structured output, and next safe
  actions.
- Write actions do not mutate table content unless explicitly confirmed.

## Research Report Library

Select or create a triage selection, then run:

```bash
pnpm dev -- research --json
```

With an output link:

```bash
pnpm dev -- research -o ./reports/current-research.json --json
```

Expected result:

- A canonical JSON report is created under `~/.lark-bitable/research/`.
- `-o` creates a symbolic link to the canonical JSON file when safe and
  supported.
- Dashboard research page lists the report with evidence count, selected record,
  canonical path, and link status.

## Language Switching

1. Open the dashboard.
2. Switch language between Traditional Chinese and English.
3. Refresh the page in the same browser.
4. Open the same dashboard in another browser or clear web cache.

Expected result:

- Dashboard-owned navigation, labels, status messages, and remediation text
  switch language within one second.
- The same browser restores the selected language while web cache remains
  available.
- CLI config, auth storage, audit logs, and research report files do not store a
  language preference.
- Lark field names, record values, command output, audit snapshots, file paths,
  and research report contents remain in their original language.

## Manual Security Check

Open the dashboard and inspect visible output from configuration, auth, audit,
playground, and research pages.

Expected result:

- No access tokens, refresh tokens, authorization codes, app secrets, or
  secret-like values are visible.
- Dashboard URL is local by default.

## Manual Validation Notes

Recorded during implementation on 2026-05-14:

- Automated HTTP coverage starts the dashboard on an ephemeral local port,
  verifies `GET /`, `/assets/app.js`, `/assets/styles.css`, `/api/status`,
  `/api/config`, auth logout, audit list, research list, table schema, and
  playground routes.
- Automated command coverage starts `dashboard --no-open --json --port 0` with
  `--shutdown-after-ms 1` and verifies local-only/no-dashboard-login startup
  output.
- Automated research coverage runs `research -o <path> --json`, verifies
  canonical JSON under the configured research directory, and verifies `-o`
  creates a symbolic link to that canonical JSON.
- Browser-only checks that still require a human/Lark account: completing a live
  Lark OAuth approval in the browser, visually inspecting the dashboard pages,
  and confirming language selection survives refresh in a real browser cache.
