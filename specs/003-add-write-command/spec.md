# Feature Specification: Write Command for Bitable Content

**Feature Branch**: `003-add-write-command`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "我要增加 write 指令, 功能就是能編輯、新增表格內容"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Add Table Content (Priority: P1)

A user creates a new row in the configured Bitable table by providing field
values to the new `write` capability, then receives a clear result showing what
was added and where it was added.

**Why this priority**: Adding table content is one of the two requested core
capabilities. Without record creation, the command cannot support new tasks,
bugs, notes, or QA entries from the CLI workflow.

**Independent Test**: With an authenticated and writable configured table, run
the write flow for a new record with valid field values and verify the table
contains one new record with those values and the command output reports the new
record identifier and written fields.

**Acceptance Scenarios**:

1. **Given** a writable configured table and valid field values, **When** the
   user requests a new record, **Then** the system creates exactly one record and
   reports the created record identifier, source table, and written fields.
2. **Given** the user previews a new record without confirming the write,
   **When** the preview is shown, **Then** no table content changes and the
   output clearly states that no write was performed.
3. **Given** a required field is missing or a value cannot be accepted by the
   table, **When** the user requests a new record, **Then** the system rejects
   the write before changing content and explains which field needs correction.

---

### User Story 2 - Edit Existing Table Content (Priority: P1)

A user updates selected fields on an existing Bitable record by identifying the
target record and the field values to change, then receives a result separating
requested changes from confirmed table state.

**Why this priority**: Editing existing table content is the other requested
core capability and must be safe enough for bug, QA, and task workflows where
records are shared with other users.

**Independent Test**: With an existing record, run the write flow to update one
or more fields and verify only the requested fields change while unrelated
fields remain unchanged and the output shows the target record identifier,
changed fields, and confirmation status.

**Acceptance Scenarios**:

1. **Given** a writable configured table and an existing record identifier,
   **When** the user requests field updates, **Then** the system updates only the
   requested fields on that record and reports the before/after values when they
   are visible.
2. **Given** the target record no longer exists or is not accessible, **When**
   the user requests an update, **Then** the system does not create a replacement
   record and reports that the target record could not be updated.
3. **Given** the user provides no field changes, **When** the update is
   requested, **Then** the system rejects the request without modifying table
   content.

---

### User Story 3 - Review Writes Before Committing (Priority: P2)

A user or AI agent can inspect the intended write operation before committing it
so accidental table changes, wrong record targets, and malformed field updates
are caught early.

**Why this priority**: This feature changes the project from read-focused
workflows to controlled write-back behavior. A preview and explicit commitment
step reduces accidental edits while preserving automation use cases.

**Independent Test**: Run the write flow in preview-only mode for both create
and update operations and confirm the output contains the intended operation,
target source, target record when applicable, field changes, and a clear
"not written" status. Then confirm a committed write performs the same planned
operation.

**Acceptance Scenarios**:

1. **Given** a valid create request, **When** the user requests a preview,
   **Then** the output shows the exact record fields that would be written and
   confirms that no table content changed.
2. **Given** a valid update request, **When** the user requests a preview,
   **Then** the output shows the target record and field-level changes that
   would be applied.
3. **Given** a non-interactive write request, **When** no explicit commitment is
   provided, **Then** the system avoids modifying table content and reports how
   to make the write intentional.

---

### User Story 4 - Handle Write Failures Safely (Priority: P2)

A user receives actionable, evidence-backed failure output when writes cannot be
performed because of missing setup, missing permissions, invalid fields, invalid
values, conflicts, or service errors.

**Why this priority**: Write failures can otherwise lead to duplicate manual
work or unsupported claims that a table was changed. Failures must be clear and
must not hide whether anything changed.

**Independent Test**: Run write flows against missing auth, read-only access,
unknown fields, inaccessible records, and rejected values, then verify the
system either makes no changes or reports any partial result explicitly with
remediation steps.

**Acceptance Scenarios**:

1. **Given** the configured account can read but cannot write the table,
   **When** the user requests a write, **Then** the system reports missing write
   permission and does not claim the record changed.
2. **Given** one or more requested fields are unknown or unsupported, **When**
   the user requests a write, **Then** the system rejects those fields and
   reports the valid field context needed to correct the request.
3. **Given** a write operation is partially accepted by the table, **When** the
   result is reported, **Then** the output clearly separates confirmed changes,
   failed changes, and any unknown final state.

### Edge Cases

- The active source, table, view, or login state is missing.
- The user has read access to the table but lacks write permission.
- The table is writable in Lark but the configured application or account has
  not been granted write capability.
- A create request includes no fields, only unknown fields, or duplicate field
  names.
- An update request omits the target record identifier.
- The target record is deleted, moved, or inaccessible between preview and
  commit.
- The user provides a field value that does not match the table's accepted value
  shape, such as an invalid select option or malformed date.
- The requested update would leave the record unchanged because the submitted
  values match current values.
- A write succeeds but the follow-up read used for confirmation is unavailable.
- A network interruption occurs before the system can determine whether the
  write was accepted.
- Multiple users edit the same record near the same time.
- A request attempts to delete records, clear an entire table, rename fields, or
  change table structure.
- Output is requested for an AI agent and must not expose secrets or auth tokens.

## Requirements _(mandatory)_

### Evidence & Fact Boundaries _(mandatory)_

- **Source Evidence**: User request in this conversation; current project plan
  at `specs/002-mode-aware-workflows/plan.md`; current README describing
  configure, login, read, triage, research, verify, and media download commands;
  prior feature spec at `specs/001-lark-bitable/spec.md` stating the first
  version avoids destructive Lark record changes unless a later specification
  explicitly adds write-back behavior; existing mode-aware spec at
  `specs/002-mode-aware-workflows/spec.md`.
- **Assumptions vs Facts**: It is a fact that the requested feature is a new
  `write` command for editing and adding table content. It is a fact that the
  current documented product is primarily read-focused with evidence-backed
  reporting. It is an assumption that "table content" means Bitable records and
  field values, not table schema, permissions, views, or automation settings.
  It is an assumption that deletion and schema mutation are outside the first
  write-command scope because the user asked only for editing and adding
  content.
- **Unsupported Claims**: None. This specification defines desired behavior and
  selected assumptions; it does not claim write-back already exists.
- **Conflict Handling**: If write confirmation evidence conflicts with the
  requested operation, the system must report the conflict explicitly and label
  final state as unknown until the record can be re-read or verified.

### Functional Requirements

- **FR-001**: The system MUST provide a user-facing `write` capability for the
  currently configured Bitable table.
- **FR-002**: The system MUST support creating a new table record from
  user-provided field values.
- **FR-003**: The system MUST support updating user-selected fields on an
  existing table record identified by a stable record identifier.
- **FR-004**: The system MUST NOT delete records, clear tables, rename fields,
  change field definitions, change views, or modify table structure as part of
  this feature.
- **FR-005**: The system MUST validate that source configuration, login state,
  and write capability are sufficient before attempting to modify table content.
- **FR-006**: The system MUST require explicit field values for every create or
  update operation and reject empty write requests.
- **FR-007**: The system MUST validate requested field names against the current
  table context and reject unknown fields before attempting a write.
- **FR-008**: The system MUST report unsupported or invalid field values with
  enough context for the user to correct the request.
- **FR-009**: The system MUST provide a preview of the intended operation,
  target source, target record when applicable, and field changes before a write
  is committed.
- **FR-010**: The system MUST require an explicit user or automation commitment
  before modifying table content.
- **FR-011**: For update operations, the system MUST preserve all fields that
  were not requested for change.
- **FR-012**: For update operations, the system MUST distinguish unchanged
  fields from fields that were actually changed.
- **FR-013**: After a successful create operation, the system MUST report the
  created record identifier and written fields.
- **FR-014**: After a successful update operation, the system MUST report the
  target record identifier and changed fields, including visible before/after
  values when available.
- **FR-015**: If a write result cannot be fully confirmed, the system MUST
  report the requested operation, any observed outcome, and the unknown portion
  without claiming unverified success.
- **FR-016**: If a write operation fails before any table change, the system MUST
  state that no confirmed table content change occurred and provide remediation.
- **FR-017**: If a write operation has a partial or uncertain outcome, the system
  MUST clearly separate confirmed changes, failed changes, and unknown final
  state.
- **FR-018**: The system MUST include write readiness in validation and help
  guidance, including missing setup, missing permission, preview behavior, and
  safe next actions.
- **FR-019**: The system MUST support both human-readable and AI-facing output
  that exposes operation type, source metadata, target record, field changes,
  confirmation status, evidence references, warnings, and next safe actions.
- **FR-020**: The system MUST redact auth tokens, app secrets, and other stored
  secrets from all write output, previews, errors, and reports.
- **FR-021**: The system MUST make write operations available consistently across
  QA and Developer workflows when the configured account and table are writable.
- **FR-022**: The system MUST keep existing read, triage, research, verify, and
  media workflows functional when write readiness is missing.

### Key Entities _(include if feature involves data)_

- **Write Operation**: A user-requested create or update action against the
  configured table, including operation type, target source, optional target
  record, requested field values, preview status, commitment status, and result.
- **Field Change**: A single field targeted by a write operation, including the
  field name, requested value, visible previous value when available, confirmed
  resulting value when available, and validation status.
- **Target Record**: The existing Bitable record selected for an update, or the
  newly created Bitable record returned by a create operation.
- **Write Result**: The outcome of a write operation, including confirmed
  success, confirmed failure, partial success, or unknown final state, plus
  remediation and evidence references.
- **Write Readiness**: The current ability to write to the configured table,
  based on source configuration, login state, table accessibility, and write
  permission.

## Success Criteria _(mandatory)_

### Report Accuracy Criteria _(mandatory for AI-facing output)_

- **RA-001**: 100% of write outputs distinguish requested changes from confirmed
  table results and cite the source table and record evidence available to the
  system.
- **RA-002**: 100% of write failures, partial outcomes, and uncertain outcomes
  avoid unsupported success claims and label unknown final state explicitly.
- **RA-003**: 100% of AI-facing write outputs include enough operation metadata,
  warnings, and next safe actions for another user or agent to audit what was
  requested and what was confirmed without exposing secrets.

### Measurable Outcomes

- **SC-001**: Given a configured writable table, users can create a new record
  with valid field values in under 2 minutes without opening Lark manually.
- **SC-002**: Given a known record identifier, users can update selected fields
  on an existing record in under 2 minutes without changing unrelated fields.
- **SC-003**: 100% of successful create operations return a stable created
  record identifier and the list of written fields.
- **SC-004**: 100% of successful update operations return the target record
  identifier and distinguish changed fields from unchanged fields.
- **SC-005**: 100% of validation failures caused by missing auth, missing
  source, missing permission, unknown fields, or invalid values occur before any
  confirmed table content change.
- **SC-006**: 100% of preview-only write requests leave table content unchanged
  and explicitly report that no write was performed.
- **SC-007**: In usability validation, at least 90% of users can tell from the
  output whether a write was previewed, committed, confirmed, failed, or left in
  an unknown state.

## Assumptions

- "Table content" means Bitable record rows and field values in the configured
  source table.
- Adding content means creating new records; editing content means updating
  fields on existing records.
- Deleting records, clearing field values in bulk, changing schemas, changing
  views, and managing table permissions are outside this feature's first scope.
- The command should use the existing configured source and authentication
  model instead of asking users to configure a separate table destination.
- Existing read-only workflows must continue to work even when write permission
  has not been configured or granted.
- Writes should be explicit and auditable because this CLI is used by both
  humans and AI agents.
