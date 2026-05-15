# Data Model: Dashboard Real-Time Command Updates

## Dashboard Runtime Session

Represents the currently running local dashboard service for discovery by separate CLI command processes.

Fields:

- `sessionId`: Unique opaque id for one dashboard service lifetime.
- `origin`: Local dashboard origin such as `http://127.0.0.1:48731`.
- `host`: Bound host.
- `port`: Bound port.
- `pid`: Dashboard process id.
- `startedAt`: ISO timestamp for service start.
- `lastHeartbeatAt`: ISO timestamp updated by the service.
- `deliveryToken`: Opaque local token used by command event ingress.
- `runtimePath`: Local filesystem path of the session record.

Validation rules:

- `origin` must be localhost or loopback unless a future explicit remote mode exists.
- Runtime sessions older than the accepted heartbeat window are stale and ignored.
- Delivery token is never sent to browser UI, audit details, command output, or research reports.

State transitions:

```text
missing -> active -> stale -> missing
missing -> active -> stopped -> missing
active -> replaced -> active
```

## Connected Dashboard View

Represents one browser tab or window connected to the dashboard live channel.

Fields:

- `clientId`: Service-assigned connection id.
- `connectedAt`: ISO timestamp.
- `lastSeenAt`: ISO timestamp from ping/pong or client control message.
- `lastDeliveredSequence`: Last event sequence sent to the client.
- `activePage`: Optional dashboard page reported by the client.
- `filters`: Optional safe summary of current page filters or selected ids.
- `status`: `connecting`, `connected`, `stale`, `reconnecting`, or `closed`.

Validation rules:

- Client state is in-memory only.
- Page/filter summaries must not contain secrets or full source records.
- Closed clients are removed from active delivery lists.

State transitions:

```text
connecting -> connected -> stale -> reconnecting -> connected
connected -> closed
stale -> closed
reconnecting -> closed
```

## Command Activity Event

Represents a command lifecycle update that may affect dashboard-visible state.

Fields:

- `eventId`: Unique id for this event.
- `sequence`: Monotonic number assigned by the dashboard service while running.
- `commandRunId`: Stable id shared by start/progress/outcome events for one command run.
- `command`: CLI command name or dashboard workflow name.
- `trigger`: `terminal`, `dashboard`, or `system`.
- `phase`: `started`, `progress`, `completed`, `partial`, `blocked`, `failed`, `canceled`, or `timeout`.
- `status`: Existing command status when known.
- `startedAt`: Command start timestamp when available.
- `finishedAt`: Command finish timestamp when available.
- `durationMs`: Command duration when available.
- `issues`: Redacted issue summaries.
- `evidenceCount`: Number of evidence items when available.
- `changedSurfaces`: Affected dashboard surfaces.
- `dataSource`: `live`, `file-backed`, `cached`, `missing`, `partial`, `failed`, `stale`, or `reconnecting`.

Validation rules:

- Event payloads must pass dashboard redaction before delivery.
- Events must not include raw tokens, app secrets, authorization codes, authorization headers, full source records, or full research report bodies.
- `changedSurfaces` must use known dashboard surface identifiers.

State transitions:

```text
started -> progress -> completed
started -> partial
started -> blocked
started -> failed
started -> canceled
started -> timeout
```

## Dashboard State Surface

Represents a part of the dashboard that can be invalidated by a live event.

Fields:

- `surfaceId`: `shell`, `overview`, `config`, `auth`, `audit`, `playground`, `research`, or `table`.
- `resourceHints`: API routes or logical resources that should be reloaded.
- `preserveState`: UI state that must remain stable, such as active route, selected tab, filters, selected detail, scroll position, and unsaved draft fields.
- `staleness`: `current`, `stale`, `reconnecting`, or `failed`.

Validation rules:

- Unknown surface identifiers are ignored and logged only as safe diagnostics.
- Reloading a surface must not erase unsaved user input without preserving or distinguishing the draft.
- Manual refresh and live refresh must converge to the same final state for the same source facts.

## State Invalidation Event

Represents a safe instruction for browser pages to refresh dashboard-visible facts.

Fields:

- `eventId`: Unique id.
- `sequence`: Service sequence.
- `reason`: Human-readable redacted reason.
- `surfaces`: Dashboard surface identifiers.
- `resources`: API route hints such as `/api/status` or `/api/audit`.
- `sourceEventId`: Optional command activity event that caused the invalidation.
- `createdAt`: ISO timestamp.

Validation rules:

- Invalidation events are hints, not proof of final data.
- Browser clients must fetch authoritative state from HTTP APIs after processing the event.
- Resource hints must be local dashboard routes only.

## Live Delivery Attempt

Represents a best-effort attempt by a CLI command process to notify the running dashboard service.

Fields:

- `attemptId`: Unique id.
- `commandRunId`: Command run id.
- `runtimeSessionId`: Session id read from the runtime file, if any.
- `targetOrigin`: Dashboard origin targeted by the attempt.
- `phase`: Command phase being delivered.
- `startedAt`: Attempt start timestamp.
- `finishedAt`: Attempt finish timestamp.
- `result`: `delivered`, `skipped-no-session`, `skipped-stale-session`, `skipped-unreachable`, `rejected`, or `failed`.
- `silent`: Always true for dashboard-absent or unreachable cases.

Validation rules:

- Delivery attempt failure must not change the primary command status.
- Dashboard-absent or unreachable attempts must not write user-visible command warnings.
- Sensitive runtime token values must not appear in audit output or dashboard UI.

## Current State Snapshot

Represents the authoritative dashboard-visible state loaded after startup, reconnect, manual refresh, or live invalidation.

Fields:

- `snapshotId`: Unique id for the read.
- `createdAt`: ISO timestamp.
- `surfaces`: Surface ids included in the snapshot.
- `dataSource`: Existing dashboard data source status.
- `issues`: Redacted issues.
- `apiReads`: Routes used to collect the snapshot.
- `blockedReasons`: Missing dependencies or environment blockers.

Validation rules:

- Snapshot facts come from existing dashboard service modules and HTTP APIs.
- Snapshot must distinguish live-delivered updates from catch-up state loaded by API reads.
- Snapshot must preserve existing evidence and assumption boundaries.
