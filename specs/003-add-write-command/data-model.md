# Data Model: Write Command for Bitable Content

## Write Operation

Represents one requested write against the configured table.

**Fields**:

- `operationId`: Stable id for the command run.
- `type`: `create` or `update`.
- `source`: Bitable source metadata for the configured app token, table id, and
  optional view id.
- `targetRecordId`: Required for `update`; absent before `create` succeeds.
- `requestedFields`: Map of field names to requested values.
- `fieldChanges`: Field Change list derived from requested fields and current
  record evidence when available.
- `previewedAt`: ISO timestamp when the operation was previewed.
- `commitState`: `previewed`, `confirmed-request`, or `not-requested`.
- `clientToken`: Optional create idempotency token.
- `requestedBy`: `human`, `agent`, or `unknown` when known from command context.

**Relationships**:

- Uses Bitable Source Configuration for target source.
- Uses Lark Auth Session for committed create/update.
- Produces Write Preview before any committed write.
- Produces Write Result after preview or commit attempt.

**Validation rules**:

- `type=create` must not require a record id.
- `type=update` requires a non-empty stable record id.
- `requestedFields` must contain at least one field.
- Field names must exist in the current table field list before commit.
- Delete, batch write, schema, view, and permission operations are invalid.

## Field Change

Represents one field targeted by a write operation.

**Fields**:

- `fieldName`: Visible Bitable field name.
- `requestedValue`: User-provided value after CLI parsing.
- `previousValue`: Visible value before update when available.
- `resultValue`: Visible value after create/update when available.
- `status`: `pending`, `changed`, `unchanged`, `rejected`, or `unknown`.
- `validationIssues`: List of field-specific validation issues.

**Validation rules**:

- Unknown fields are rejected before commit.
- Empty field names are rejected.
- Duplicate field names collapse to one requested field only if the command can
  report the override clearly; otherwise the request is rejected.
- Select or multi-select values should be checked against discovered options
  when options are available.
- Complex values that cannot be fully validated locally are passed to Lark only
  after field-name validation and are reported from Lark's returned error if
  rejected.

## Write Preview

Represents the auditable no-mutation view of a write operation.

**Fields**:

- `operation`: Write Operation.
- `source`: Source metadata.
- `targetRecord`: Current Bitable record for update previews when readable.
- `fieldChanges`: Planned field changes.
- `warnings`: Non-blocking cautions such as unavailable before values.
- `commitRequired`: Boolean, always true before mutation.
- `wouldWrite`: Boolean indicating whether the request is valid enough to
  commit if `--confirm` is supplied.

**Validation rules**:

- Preview must never mutate table content.
- Preview must show no-write status when `--confirm` is absent.
- Update preview should include previous values when the target record can be
  read.
- If the target record cannot be read, update preview blocks instead of guessing
  previous state.

## Write Result

Represents the final command outcome after preview or commit attempt.

**Fields**:

- `operationId`: Link to Write Operation.
- `type`: `create` or `update`.
- `commitState`: `previewed`, `committed`, `blocked`, or `not-requested`.
- `confirmationStatus`: `not-written`, `confirmed`, `failed`, `partial`, or
  `unknown`.
- `targetRecordId`: Created or updated record id when known.
- `fieldChanges`: Field Change list with final status classification.
- `createdRecord`: Bitable record returned or confirmed after create when
  available.
- `updatedRecord`: Bitable record returned or confirmed after update when
  available.
- `issues`: Blocking or partial issues.
- `warnings`: Non-blocking warnings.
- `evidence`: Evidence references for preview inputs, write response, and
  confirmation reads.
- `nextActions`: Safe follow-up commands or manual validation steps.

**Validation rules**:

- Preview-only results use `confirmationStatus=not-written`.
- A successful create must include the created record id.
- A successful update must include the target record id.
- If follow-up confirmation fails after a write response, the result is
  `unknown` unless returned record data is sufficient to confirm final state.
- Failed pre-commit validation must report no confirmed table content change.
- Partial or uncertain outcomes must not be collapsed into success.

## Write Readiness

Represents the current ability to commit writes to the configured table.

**Fields**:

- `sourceConfigured`: Boolean.
- `authReady`: Boolean.
- `fieldsReadable`: Boolean or `unknown`.
- `targetRecordReadable`: Boolean or `unknown` for update requests.
- `writePermissionStatus`: `verified`, `missing`, `failed`, or `unknown`.
- `blockingIssues`: Issues that prevent commit.
- `partialIssues`: Issues that allow preview but may block commit.
- `nextSafeCommand`: Recommended remediation or preview command.

**Relationships**:

- Extends existing validation result behavior for `valid --workflow write`.
- Uses existing auth/source/readiness checks.

**Validation rules**:

- Missing source or auth blocks preview and commit.
- Missing write permission blocks commit but must not block existing read-only
  workflows.
- Permission cannot be claimed as verified unless a live write-capable check or
  committed write confirms it.

## Write Evidence

Represents auditable evidence used by write output.

**Fields**:

- `id`: Evidence id for command output.
- `type`: Existing evidence type such as `runtime-observation`,
  `command-output`, or `user-input`.
- `reference`: Source location, command, or operation reference.
- `excerpt`: Redacted evidence excerpt.
- `collectedAt`: ISO timestamp.
- `status`: `verified`, `partial`, `failed`, or `not-run`.

**Validation rules**:

- Requested field values are user input, not confirmed table facts.
- Returned record data or follow-up get-record data can support confirmed table
  facts.
- Lark permission failures are runtime observations and must preserve the error
  code/message when available after redaction.
