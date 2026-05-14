# Dashboard HTTP Contract

The dashboard service is local-only by default and serves both browser assets
and JSON endpoints from the selected localhost origin.

## Common Rules

- All JSON responses use `application/json`.
- All error responses include `status: "error"` and an `issues` array.
- All responses that include local or Lark-derived facts identify whether data
  is live, file-backed, cached, missing, partial, or failed.
- Tokens, app secrets, authorization codes, and secret-like values are redacted.
- Dashboard-owned UI language can be selected by the browser, but source data is
  never translated by these endpoints.

## Response Envelope

```json
{
  "status": "ok",
  "dataSource": "live",
  "issues": [],
  "data": {}
}
```

Allowed `status` values:

- `ok`
- `partial`
- `error`

Allowed `dataSource` values:

- `live`
- `file-backed`
- `cached`
- `missing`
- `partial`
- `failed`

## GET /

Returns dashboard HTML.

Success:

- Status code: `200`
- Content type: `text/html`

## GET /assets/app.js

Returns browser JavaScript for dashboard behavior and language switching.

Success:

- Status code: `200`
- Content type: `text/javascript`

## GET /assets/styles.css

Returns dashboard styles.

Success:

- Status code: `200`
- Content type: `text/css`

## GET /api/status

Returns service binding, overview, source, auth, mode, and recommended next
actions.

Response data shape:

```json
{
  "binding": {
    "host": "127.0.0.1",
    "requestedPort": 48731,
    "port": 48731,
    "origin": "http://127.0.0.1:48731",
    "startedAt": "2026-05-14T00:00:00.000Z",
    "status": "ready"
  },
  "overview": {
    "readiness": {
      "status": "ready",
      "blockingIssues": [],
      "partialIssues": [],
      "nextSafeCommand": "lark-bitable schema"
    },
    "mode": {
      "active": "Developer",
      "source": "explicit"
    },
    "source": {
      "appToken": "app-token",
      "tableId": "table-id",
      "viewId": "view-id",
      "retrievedAt": "2026-05-14T00:00:00.000Z"
    },
    "auth": {
      "status": "ready",
      "domain": "larksuite.com",
      "accountLabel": "user@example.com",
      "expiresAt": "2026-05-14T01:00:00.000Z"
    }
  }
}
```

## GET /api/config

Returns a redacted configuration draft.

Response data shape:

```json
{
  "draft": {
    "sourceUrl": "https://example.larksuite.com/base/app",
    "sourceName": "Project Bugs",
    "mode": "Developer",
    "larkAppId": "cli_app_id",
    "larkAppSecretState": "stored-redacted",
    "larkDomain": "larksuite.com",
    "redirectUri": "http://127.0.0.1:14543/callback",
    "callbackPort": 14543,
    "scopes": ["bitable:app:readonly"],
    "statusField": "狀態",
    "priorityField": "優先級",
    "titleField": "標題",
    "ownerField": "負責人",
    "actionableStatus": "待處理",
    "defaultOwner": "openclaw"
  }
}
```

## POST /api/config

Saves a configuration draft and returns updated readiness.

Request shape:

```json
{
  "sourceUrl": "https://example.larksuite.com/base/app?table=tbl",
  "sourceName": "Project Bugs",
  "mode": "Developer",
  "larkAppId": "cli_app_id",
  "larkAppSecret": "new secret or omitted",
  "larkDomain": "larksuite.com",
  "redirectUri": "http://127.0.0.1:14543/callback",
  "callbackPort": 14543,
  "scopes": ["bitable:app:readonly"],
  "statusField": "狀態",
  "priorityField": "優先級",
  "titleField": "標題",
  "ownerField": "負責人",
  "actionableStatus": "待處理",
  "defaultOwner": "openclaw"
}
```

Success response includes:

- Redacted saved draft.
- Readiness status.
- Blocking issues and partial issues.
- Next safe command.

## POST /api/auth/login/start

Starts a Lark SSO login flow.

Request shape:

```json
{
  "scope": ["bitable:app:readonly"],
  "timeoutMs": 180000
}
```

Response data shape:

```json
{
  "flowId": "login-flow-id",
  "status": "waiting",
  "authorizationUrl": "https://accounts.larksuite.com/open-apis/authen/v1/authorize?...",
  "callbackMode": "local-callback"
}
```

## GET /api/auth/login/:flowId

Returns current login flow state.

Allowed login flow states:

- `waiting`
- `ready`
- `canceled`
- `failed`
- `expired`

## POST /api/auth/logout

Clears local Lark auth state.

Response data shape:

```json
{
  "auth": {
    "status": "missing",
    "storagePath": "/Users/example/.lark-bitable/auth.json"
  }
}
```

## GET /api/audit

Queries audit entries.

Query parameters:

- `from`
- `to`
- `command`
- `status`
- `mode`
- `source`
- `issueCode`
- `text`
- `hasEvidence`
- `hasError`
- `limit`
- `cursor`

Response data shape:

```json
{
  "entries": [
    {
      "id": "audit-entry-id",
      "startedAt": "2026-05-14T00:00:00.000Z",
      "finishedAt": "2026-05-14T00:00:01.000Z",
      "durationMs": 1000,
      "command": "research",
      "status": "ok",
      "mode": {
        "active": "Developer",
        "source": "explicit"
      },
      "issues": [],
      "evidenceSummary": []
    }
  ],
  "nextCursor": null,
  "skippedFiles": []
}
```

## GET /api/audit/:id

Returns a sanitized audit detail entry.

Response data shape:

```json
{
  "entry": {
    "id": "audit-entry-id",
    "argv": ["research", "--out", "report.json"],
    "issues": [],
    "error": null,
    "dataSnapshot": {},
    "retentionApplied": {
      "retentionDays": 14,
      "prunedEntries": 0
    }
  }
}
```

## POST /api/playground/run

Runs a supported workflow from the dashboard.

Request shape:

```json
{
  "command": "valid",
  "parameters": {
    "workflow": "triage"
  },
  "confirmWrite": false
}
```

Allowed command values:

- `valid`
- `schema`
- `list`
- `get`
- `filter`
- `search`
- `triage`
- `research`
- `verify`
- `write`

Response data shape:

```json
{
  "run": {
    "id": "run-id",
    "command": "valid",
    "status": "ok",
    "issues": [],
    "evidence": [],
    "structuredOutput": {},
    "humanOutput": "command: valid\nstatus: ok",
    "nextSafeActions": [],
    "auditEntryId": "audit-entry-id"
  }
}
```

## GET /api/research

Lists canonical research reports.

Query parameters:

- `text`
- `mode`
- `recordId`
- `from`
- `to`
- `limit`
- `cursor`

Response data shape:

```json
{
  "reports": [
    {
      "name": "selected-bug",
      "createdAt": "2026-05-14T00:00:00.000Z",
      "selectedRecordId": "recxxxx",
      "evidenceCount": 3,
      "canonicalPath": "/Users/example/.lark-bitable/research/selected-bug-20260514T000000000Z.json",
      "outputLinkStatus": "linked"
    }
  ],
  "skippedFiles": []
}
```

## GET /api/research/:reportId

Returns a canonical research report by id or safe file stem.

Response data shape:

```json
{
  "report": {
    "schemaVersion": 1,
    "name": "selected-bug",
    "observedFacts": [],
    "assumptions": [],
    "analysis": [],
    "likelyCauses": [],
    "recommendedFixes": [],
    "risks": [],
    "nextActions": [],
    "evidence": []
  }
}
```

## GET /api/table/schema

Returns schema and configured mapping context when auth/source allow it.

## GET /api/table/records

Returns recent records using existing list/query behavior when auth/source allow
it.
