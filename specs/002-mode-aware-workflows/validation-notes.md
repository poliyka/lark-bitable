# Validation Notes

## Deterministic Validation

- `pnpm build` — passed.
- `pnpm test` — passed. Latest run: 43 test files, 146 tests passed.
- `pnpm format:check` — passed after formatting the updated skill/docs/command files.
- `pnpm quickstart:validate` — passed.
- `git diff --check` — passed.

## Storage Path Validation

- Default config path is `~/.lark-bitable/config.json`.
- Default auth path is `~/.lark-bitable/auth.json`.
- Legacy `~/.lark-bitable-cli/config.json` and
  `~/.lark-bitable-cli/auth.json` are migration inputs only. They are read once
  when the new target file is missing, then moved or copied into
  `~/.lark-bitable/`.
- `/Users/openclaw/.config/pnpm/lark-bitable` is a pnpm executable shim that
  launches this repository's `bin/run.js`; it is not CLI configuration storage.

## Live CLI E2E Validation

Latest current-auth run:

- `lark-bitable doctor --json` — passed. `status=ok`,
  `auth.status=ready`, `sourceConfigured=true`,
  `larkAppConfigured=true`, and `configureMappingsReady=true`.
- `lark-bitable valid --workflow inspect --json` — passed.
  `status=ok`, `data.status=ready`, and
  `nextSafeCommand=lark-bitable list`.
- `lark-bitable valid --workflow triage --json` — passed.
  `status=ok`, `data.status=ready`, and
  `nextSafeCommand=lark-bitable triage`.
- `lark-bitable schema` — passed and printed only numbered headers.
- `lark-bitable schema --sample-limit 20 --json` — passed and returned table
  fields, mappings, sampled observed values, and next safe commands.
- Exact schema values confirmed current actionable status must be simplified
  Chinese `待处理`, not traditional Chinese `待處理`.
- `lark-bitable configure ... --status-field 当前状态 --priority-field 优先级 --title-field 问题名称 --owner-field 处理人 --actionable-status 待处理 --json`
  — passed and stored the exact field mappings from schema.
- `lark-bitable list --limit 3 --json` — passed. Returned 3 records with
  `queryLimit.hasMore=true`.
- `lark-bitable search 崩溃 --limit 3 --json` — passed. Returned 1 matching
  record with matches in `问题名称` and `问题描述`.
- `lark-bitable filter --field 当前状态 --equals 待处理 --limit 3 --json` —
  passed. Returned 3 records with `queryLimit.hasMore=true`.
- `lark-bitable triage --limit 3 --json` — passed. Returned 3 actionable
  candidates and selected `recvhBzRTxvj7I`.
- `lark-bitable get recvhBzRTxvj7I --json` — passed. Returned full visible
  record fields and two media references.
- `lark-bitable media download EbZubJtC8oZS4DxNfwzlb6R7gKh --out /tmp/lark-bitable-e2e-image.png --json`
  — passed. Downloaded authenticated media as `image/png`, size 55361 bytes.
- `file /tmp/lark-bitable-e2e-image.png` — passed. Identified a PNG image,
  426 x 679, RGB.
- Anonymous `curl` to the same Drive media download URL without token — passed
  as a negative check. It returned HTTP 400, `application/json`, with Lark code
  `99991661` and message `Missing access token for authorization...`, not image
  bytes.

Earlier observed run:

- `lark-bitable doctor --json` — passed with configured local setup.
- `lark-bitable valid --workflow inspect --json` — passed with active Developer mode and ready setup.
- `lark-bitable schema` — human header output worked; when auth was not present later in the session, it failed with `missing-auth` as expected.
- `lark-bitable schema --json` — returned full schema metadata when auth was present earlier; later the same command failed with `missing-auth` after auth removal.
- `lark-bitable list --limit 3 --json` — passed.
- `lark-bitable search 崩溃 --limit 3 --json` — passed.
- `lark-bitable filter --field 当前状态 --equals 待处理 --limit 3 --json` — passed.
- `lark-bitable triage --limit 3 --json` — returned partial with no actionable records when actionable status was still set to the wrong language variant.
- `lark-bitable triage --actionable-status 待处理 --limit 3 --json` — passed.
- `lark-bitable get recvhBzRTxvj7I --json` — passed and returned full visible record fields plus media references.
- `lark-bitable media download EbZubJtC8oZS4DxNfwzlb6R7gKh --out /tmp/lark-bitable-e2e-image.png --json` — passed; `file` identified the download as PNG.
- `lark-bitable valid --workflow verify --json` — passed in QA mode.
- `lark-bitable verify recvhBzRTxvj7I --checks none --json` — passed and reported media references as not-run evidence.
- `lark-bitable research --json` — passed in Developer mode after selection evidence was present; QA-mode research returned the expected warning.

## Known Live Status During Later Checks

- After auth was temporarily cleared from local storage,
  `lark-bitable doctor --json`, `lark-bitable valid --workflow inspect --json`,
  and `lark-bitable schema` correctly reported `missing-auth`. This was an
  environment/auth state change, not a code regression.
- After the storage path migration to `~/.lark-bitable/`, deterministic
  migration tests passed for both `config.json` and `auth.json`.
- Current live e2e now has a valid `~/.lark-bitable/auth.json`; T105 through
  T109 have been rerun and passed with current auth.

## Notes

- Human `schema` output now prints only headers.
- `schema --json` remains the structured metadata path.
- `doctor` now exposes `configPath`, `authPath`, `sourceConfigured`, `larkAppConfigured`, and `configureMappingsReady`.
