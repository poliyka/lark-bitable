# CLI Contract

## Command: dashboard

Purpose: Start the local dashboard UI.

Usage:

```bash
lark-bitable dashboard
lark-bitable dashboard --port 48731
lark-bitable dashboard --no-open
lark-bitable dashboard --json
```

Flags:

- `--port <number>`: Requested starting port. Defaults to `48731`.
- `--host <host>`: Hidden or advanced option. Defaults to `127.0.0.1`.
- `--no-open`: Start the dashboard without opening a browser.
- `--json`: Emit structured startup output.
- `--audit-path <path>`: Existing hidden audit path override.

Human output includes:

- Selected local URL.
- Requested port and actual port.
- Local-only notice.
- No-dashboard-login notice.
- Next safe action.

JSON output shape:

```json
{
  "command": "dashboard",
  "status": "ok",
  "source": null,
  "auth": null,
  "evidence": [
    {
      "id": "E1",
      "type": "runtime-observation",
      "reference": "dashboard",
      "excerpt": "Dashboard bound to http://127.0.0.1:48731",
      "collectedAt": "2026-05-14T00:00:00.000Z",
      "status": "verified"
    }
  ],
  "issues": [],
  "mode": null,
  "data": {
    "binding": {
      "host": "127.0.0.1",
      "requestedPort": 48731,
      "port": 48731,
      "origin": "http://127.0.0.1:48731",
      "startedAt": "2026-05-14T00:00:00.000Z",
      "status": "ready"
    },
    "opened": true,
    "localOnly": true,
    "dashboardLoginRequired": false,
    "nextSafeActions": ["Open http://127.0.0.1:48731"]
  }
}
```

Failure output requirements:

- If no port can be bound, status is `error` and issues include
  `dashboard-port-unavailable`.
- If the browser cannot be opened, the server remains running when possible and
  status is `partial` with an issue explaining that the user can open the URL
  manually.
- Startup output must not include secrets.

## Command: research

Purpose change: every generated research report gets a canonical JSON file.

Usage:

```bash
lark-bitable research
lark-bitable research --out ./reports/current-research.json
lark-bitable research -o ./reports/current-research.json
lark-bitable research --json
```

Output behavior:

- Always writes canonical JSON under `~/.lark-bitable/research/`.
- `--out` and `-o` request a symbolic link to the canonical JSON file.
- If the link cannot be created safely, canonical JSON remains and output
  reports the link failure.
- Existing structured command output includes canonical path and output link
  status.

JSON data addition:

```json
{
  "report": "# Selected Bug Research Report\n...",
  "reportFile": {
    "schemaVersion": 1,
    "name": "selected-bug",
    "createdAt": "2026-05-14T00:00:00.000Z",
    "canonicalPath": "/Users/example/.lark-bitable/research/selected-bug-20260514T000000000Z.json",
    "outputLinkPath": "./reports/current-research.json",
    "outputLinkStatus": "linked"
  },
  "reportPath": "/Users/example/.lark-bitable/research/selected-bug-20260514T000000000Z.json"
}
```

## Command: help

Purpose change: include dashboard guidance.

Required help additions:

- Global workflow includes `lark-bitable dashboard`.
- Command list includes `dashboard`.
- Dashboard help describes default port `48731`, incrementing behavior,
  local-only default, no dashboard login, key pages, language switching,
  research report library, and write-preview safety.

## Command: valid

Purpose change: include dashboard workflow scope when implemented.

Allowed workflow addition:

- `dashboard`

Readiness behavior:

- Reports whether dashboard can start locally.
- Reports whether config/auth/audit/research directories are readable enough for
  dashboard overview.
- Does not require Lark auth for dashboard startup, but marks Lark-backed pages
  as blocked or partial when auth is missing.
