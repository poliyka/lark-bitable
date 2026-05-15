# Contract: Command Event Ingress

## Scope

Separate CLI command processes notify a running local dashboard service about command lifecycle events. This ingress exists only for dashboard live updates and must not affect command success or failure.

## Runtime Discovery

The dashboard service writes an ephemeral runtime session record while it is running.

Example shape:

```json
{
  "sessionId": "dash_01",
  "origin": "http://127.0.0.1:48731",
  "host": "127.0.0.1",
  "port": 48731,
  "pid": 12345,
  "startedAt": "2026-05-15T00:00:00.000Z",
  "lastHeartbeatAt": "2026-05-15T00:00:10.000Z",
  "deliveryToken": "opaque-local-token"
}
```

Rules:

- Missing runtime session means no dashboard delivery is attempted.
- Stale runtime session means delivery is skipped silently.
- Unreachable origin means delivery is skipped silently.
- The runtime record is removed or made stale when the dashboard service stops.
- Runtime token values are never displayed in command output, audit UI, or browser UI.

## Event Ingress Endpoint

```text
POST /api/live/events
Content-Type: application/json
X-Dashboard-Live-Token: <deliveryToken>
```

Request envelope:

```json
{
  "commandRunId": "run_01",
  "command": "valid",
  "trigger": "terminal",
  "phase": "started",
  "status": "running",
  "startedAt": "2026-05-15T00:00:01.000Z",
  "finishedAt": null,
  "durationMs": null,
  "issues": [],
  "evidenceCount": 0,
  "changedSurfaces": ["shell", "overview", "audit"],
  "dataSource": "live"
}
```

Allowed phases:

- `started`
- `progress`
- `completed`
- `partial`
- `blocked`
- `failed`
- `canceled`
- `timeout`

Allowed triggers:

- `terminal`
- `dashboard`
- `system`

Response for accepted events:

```json
{
  "status": "ok",
  "dataSource": "live",
  "issues": [],
  "data": {
    "accepted": true,
    "eventId": "evt_01",
    "sequence": 42
  }
}
```

Response for rejected events:

```json
{
  "status": "error",
  "dataSource": "failed",
  "issues": [
    {
      "code": "dashboard-live-event-rejected",
      "message": "Live event was rejected.",
      "remediation": "Refresh the dashboard or restart the dashboard service."
    }
  ]
}
```

Command behavior rules:

- Accepted delivery may be used for dashboard diagnostics.
- Rejected, failed, timed out, or skipped delivery must not change the command's primary output.
- Dashboard-absent delivery failures must not produce command warnings.
- Command completion still writes normal audit output through the existing audit path.

## Surface Mapping

Command event producers should include the narrowest reasonable `changedSurfaces`.

Default mappings:

- `valid`: `shell`, `overview`, `audit`
- `configure` or config save: `shell`, `overview`, `config`, `table`, `audit`
- `lark` login/logout or dashboard auth actions: `shell`, `overview`, `auth`, `table`, `audit`
- `schema`: `shell`, `overview`, `config`, `table`, `audit`
- `list`, `get`, `filter`, `search`, `triage`: `shell`, `overview`, `table`, `audit`
- `research`: `shell`, `overview`, `research`, `audit`
- `verify`: `shell`, `overview`, `audit`
- `write`: `shell`, `overview`, `table`, `audit`
- `dashboard`: `shell`, `overview`

## Timing

- Command start delivery target: visible in connected dashboard within 1 second.
- Command outcome delivery target: visible in connected dashboard within 2 seconds.
- CLI delivery timeout must be short enough that dashboard absence is not user-visible.

## Privacy

- Ingress payloads are redacted before WebSocket broadcast.
- Secret-like fields are rejected or redacted.
- Full source records, full research bodies, auth tokens, application secrets, authorization headers, and authorization codes must not be sent through ingress.
