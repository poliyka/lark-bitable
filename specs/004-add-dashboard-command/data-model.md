# Data Model: Dashboard Command for Local UI

## Dashboard Service Binding

Represents the running local dashboard endpoint.

Fields:

- `host`: Local bind host. Default is `127.0.0.1`.
- `requestedPort`: Initial requested port. Default is `48731`.
- `port`: Actual selected port.
- `origin`: Local origin shown to the user.
- `startedAt`: ISO timestamp for server start.
- `status`: `starting`, `ready`, or `failed`.
- `failure`: Redacted issue when startup fails.

Validation rules:

- `port` must be an integer between 0 and 65535.
- Default startup tries `48731`, then increments by one until a bind succeeds
  or a configured max attempt threshold is reached.
- Non-local bind behavior is out of scope for v1 unless a future security
  decision explicitly enables it.

## Dashboard Session State

Represents rebuildable browser-side UI state.

Fields:

- `activePage`: Current dashboard page.
- `auditFilters`: Last selected audit filter set.
- `playgroundDraft`: Last non-secret playground form values.
- `language`: Current dashboard UI language.
- `lastRefreshAt`: Last UI refresh timestamp.

Validation rules:

- Session state is not authoritative.
- Session state may be lost at any time.
- Secrets, tokens, authorization codes, and app secrets must not be stored in
  browser cache.

## Language Preference

Represents the selected dashboard-owned UI language.

Fields:

- `value`: Supported language code. Initial set is `zh-TW` and `en`.
- `source`: `web-cache`, `browser-preference`, or `default`.
- `updatedAt`: Optional browser-local timestamp.

Validation rules:

- Unsupported, stale, or unreadable values fall back to a supported language.
- The preference is stored only in browser web cache.
- The preference changes only dashboard-owned UI text, never source data.

## Configuration Draft

Represents a dashboard-editable view of current CLI configuration.

Fields:

- `sourceUrl`: Lark Base/Bitable URL.
- `sourceName`: Optional source name.
- `mode`: `QA` or `Developer`.
- `larkAppId`: Lark app id.
- `larkAppSecretState`: `missing`, `provided`, or `stored-redacted`.
- `larkDomain`: Lark domain.
- `redirectUri`: OAuth redirect URI.
- `callbackPort`: Local callback port used by Lark login.
- `scopes`: Requested Lark auth scopes.
- `statusField`: Optional status field mapping.
- `priorityField`: Optional priority field mapping.
- `titleField`: Optional title field mapping.
- `ownerField`: Optional owner field mapping.
- `actionableStatus`: Actionable status value.
- `defaultOwner`: Optional mode default owner.
- `validation`: Latest readiness result.

Validation rules:

- Saving a draft must validate source URL shape before writing config.
- Display and output must redact app secrets.
- Readiness after save reports blocking and partial issues instead of assuming
  live access.

## Lark Auth State

Represents safe-to-display Lark authorization state.

Fields:

- `status`: `ready`, `missing`, `expired`, `invalid`, `insufficient-scope`,
  `waiting`, `canceled`, or `failed`.
- `domain`: Safe Lark domain metadata.
- `accountLabel`: Safe account label when available.
- `scopes`: Granted or requested scopes.
- `expiresAt`: Access-token expiry timestamp.
- `storagePath`: Auth storage path.
- `issues`: Redacted issues.

Validation rules:

- Access tokens, refresh tokens, authorization codes, and app secrets are never
  exposed.
- Failed or canceled login leaves existing valid auth state unchanged when
  possible.

## Audit Query

Represents user-selected audit search criteria.

Fields:

- `timeFrom`: Optional lower timestamp bound.
- `timeTo`: Optional upper timestamp bound.
- `command`: Optional command name.
- `status`: Optional command status.
- `mode`: Optional workflow mode.
- `source`: Optional source identity filter.
- `issueCode`: Optional issue code filter.
- `text`: Optional redacted-text search.
- `hasEvidence`: Optional boolean.
- `hasError`: Optional boolean.
- `limit`: Positive integer page size.
- `cursor`: Optional pagination cursor.

Validation rules:

- Invalid timestamps are rejected with remediation.
- `limit` must be positive and capped to protect local UI responsiveness.
- Query results must identify unreadable or skipped audit files.

## Audit Entry View

Represents an audit entry safe for dashboard display.

Fields:

- `id`
- `startedAt`
- `finishedAt`
- `durationMs`
- `command`
- `argv`
- `status`
- `exitCode`
- `source`
- `auth`
- `mode`
- `ownerCriteria`
- `queryLimit`
- `issues`
- `evidenceSummary`
- `dataSnapshot`
- `error`
- `retentionApplied`
- `filePath`
- `readStatus`

Validation rules:

- All fields are redacted before display.
- Detail view must not expose secrets embedded in snapshots or errors.
- Malformed entries are reported as skipped evidence, not silently treated as
  successful empty results.

## Playground Run

Represents one dashboard-requested workflow execution.

Fields:

- `id`: Local run id.
- `command`: Supported workflow command.
- `parameters`: Redacted input parameters.
- `startedAt`
- `finishedAt`
- `status`: `queued`, `running`, `ok`, `partial`, `error`, or `canceled`.
- `source`
- `mode`
- `auth`
- `issues`
- `warnings`
- `evidence`
- `structuredOutput`
- `humanOutput`
- `nextSafeActions`
- `auditEntryId`

Validation rules:

- Write-capable runs default to preview/non-mutating behavior.
- Confirmed writes require explicit confirmation in the request.
- Secrets and tokens are redacted from stored/displayed run data.

## Research Report File

Represents the canonical durable research artifact.

Fields:

- `schemaVersion`: Current version number.
- `name`: Safe report name.
- `createdAt`: ISO timestamp.
- `canonicalPath`: Path under `~/.lark-bitable/research/`.
- `outputLinkPath`: Optional user-requested symlink path.
- `outputLinkStatus`: `none`, `linked`, `failed`, or `unsupported`.
- `selectionMode`: Selected workflow mode when available.
- `selectedRecordId`: Selected record id when available.
- `ownerCriteria`: Owner criteria when available.
- `bugSummary`
- `observedFacts`
- `assumptions`
- `analysis`
- `likelyCauses`
- `recommendedFixes`
- `risks`
- `nextActions`
- `evidence`
- `markdown`: Human-readable rendered report for compatibility.

Validation rules:

- File names must be safe and collision-resistant.
- Canonical report is written before symlink creation is attempted.
- Link failures do not delete or overwrite unrelated files.
- Report sections preserve fact/assumption/analysis/risk boundaries.

## Research Report Index

Represents a rebuildable list of canonical report summaries.

Fields:

- `reports`: Array of report summaries.
- `skippedFiles`: Files that could not be read or validated.
- `generatedAt`: Index creation timestamp.
- `source`: Always file-backed unless explicitly marked cached.

Validation rules:

- Index can be rebuilt from canonical report files.
- Missing or malformed reports do not block valid reports from appearing.
- Dashboard must not report cached index data as current without cache age.

## State Transitions

Dashboard service:

```text
starting -> ready
starting -> failed
ready -> stopped
```

Lark auth flow:

```text
missing -> waiting -> ready
missing -> waiting -> canceled
missing -> waiting -> failed
ready -> expired
ready -> missing
expired -> waiting -> ready
```

Playground run:

```text
queued -> running -> ok
queued -> running -> partial
queued -> running -> error
queued -> canceled
running -> canceled
```

Research report:

```text
requested -> canonical-written -> link-created
requested -> canonical-written -> link-failed
requested -> failed-before-write
```
