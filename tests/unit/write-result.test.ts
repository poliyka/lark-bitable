import { describe, expect, it } from "vitest";

import {
  buildFailedWriteResult,
  buildConfirmedWriteResult,
  buildPartialWriteResult,
  buildPreviewWriteResult,
  buildUnknownWriteResult,
} from "../../src/write/result.js";
import { createWriteOperation } from "../../src/write/operation.js";
import { fixtureSource } from "../fixtures/lark.js";
import {
  fixtureCreatedWriteRecord,
  fixtureWriteFields,
  fixtureWriteRecord,
} from "../fixtures/write.js";

describe("write result classification", () => {
  it("classifies preview-only writes as not-written", () => {
    const operation = createWriteOperation({
      fields: { 標題: "Preview" },
      operationId: "op-preview",
      source: fixtureSource,
      tableFields: fixtureWriteFields,
      type: "create",
    });

    expect(buildPreviewWriteResult(operation)).toMatchObject({
      confirmationStatus: "not-written",
      commitState: "previewed",
      targetRecordId: undefined,
    });
  });

  it("classifies confirmed creates with created record id and written fields", () => {
    const operation = createWriteOperation({
      clientToken: "manual-token",
      confirm: true,
      fields: fixtureCreatedWriteRecord.fields,
      operationId: "op-create",
      source: fixtureSource,
      tableFields: fixtureWriteFields,
      type: "create",
    });

    const result = buildConfirmedWriteResult(operation, {
      record: fixtureCreatedWriteRecord,
    });

    expect(result).toMatchObject({
      clientToken: "manual-token",
      confirmationStatus: "confirmed",
      targetRecordId: "recCreatedWrite",
    });
    expect(result.fieldChanges).toEqual([
      expect.objectContaining({ fieldName: "標題", status: "changed" }),
      expect.objectContaining({ fieldName: "狀態", status: "changed" }),
    ]);
  });

  it("classifies confirmed updates as changed or unchanged", () => {
    const operation = createWriteOperation({
      currentRecord: fixtureWriteRecord,
      fields: { 狀態: "處理中", 備註: "Existing note" },
      operationId: "op-update",
      recordId: "recWrite",
      source: fixtureSource,
      tableFields: fixtureWriteFields,
      type: "update",
    });
    const result = buildConfirmedWriteResult(operation, {
      record: {
        ...fixtureWriteRecord,
        fields: {
          ...fixtureWriteRecord.fields,
          狀態: "處理中",
        },
      },
    });

    expect(result.fieldChanges).toEqual([
      expect.objectContaining({ fieldName: "狀態", status: "changed" }),
      expect.objectContaining({ fieldName: "備註", status: "unchanged" }),
    ]);
  });

  it("classifies failed or unconfirmed writes as unknown", () => {
    const operation = createWriteOperation({
      confirm: true,
      fields: { 標題: "Unknown" },
      operationId: "op-unknown",
      source: fixtureSource,
      tableFields: fixtureWriteFields,
      type: "create",
    });

    expect(
      buildUnknownWriteResult(operation, {
        message: "Confirmation read failed",
      }),
    ).toMatchObject({
      confirmationStatus: "unknown",
      issues: [
        expect.objectContaining({
          message: "Confirmation read failed",
        }),
      ],
    });
  });

  it("classifies rejected writes as failed and partial evidence as partial", () => {
    const operation = createWriteOperation({
      confirm: true,
      fields: { 標題: "Rejected" },
      operationId: "op-failed",
      source: fixtureSource,
      tableFields: fixtureWriteFields,
      type: "create",
    });

    expect(
      buildFailedWriteResult(operation, {
        code: "write-value-rejected",
        message: "Lark rejected the requested value",
        remediation: "Fix the field value.",
      }),
    ).toMatchObject({
      confirmationStatus: "failed",
      commitState: "blocked",
      fieldChanges: [expect.objectContaining({ status: "rejected" })],
    });

    expect(
      buildPartialWriteResult(operation, {
        message: "Only part of the returned state could be confirmed",
      }),
    ).toMatchObject({
      confirmationStatus: "partial",
      warnings: [
        expect.stringContaining(
          "confirm the final table state before retrying",
        ),
      ],
    });
  });
});
