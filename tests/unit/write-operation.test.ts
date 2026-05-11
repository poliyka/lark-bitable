import { describe, expect, it } from "vitest";

import { createWriteOperation } from "../../src/write/operation.js";
import { fixtureSource } from "../fixtures/lark.js";
import { fixtureWriteFields, fixtureWriteRecord } from "../fixtures/write.js";

describe("write operation validation", () => {
  it("builds a create operation with field changes", () => {
    const operation = createWriteOperation({
      confirm: false,
      fields: { 標題: "New task", 狀態: "待處理" },
      operationId: "op-create",
      source: fixtureSource,
      tableFields: fixtureWriteFields,
      type: "create",
    });

    expect(operation).toMatchObject({
      operationId: "op-create",
      type: "create",
      commitState: "previewed",
      targetRecordId: undefined,
    });
    expect(operation.fieldChanges).toHaveLength(2);
  });

  it("requires update record id and rejects record id on create", () => {
    expect(() =>
      createWriteOperation({
        fields: { 狀態: "處理中" },
        source: fixtureSource,
        tableFields: fixtureWriteFields,
        type: "update",
      }),
    ).toThrow("Record id is required for update writes");

    expect(() =>
      createWriteOperation({
        fields: { 標題: "New task" },
        recordId: "recWrite",
        source: fixtureSource,
        tableFields: fixtureWriteFields,
        type: "create",
      }),
    ).toThrow("Record id is not valid for create writes");
  });

  it("rejects empty fields, unknown fields, and invalid client-token usage", () => {
    expect(() =>
      createWriteOperation({
        fields: {},
        source: fixtureSource,
        tableFields: fixtureWriteFields,
        type: "create",
      }),
    ).toThrow("At least one field value is required");

    expect(() =>
      createWriteOperation({
        fields: { 不存在欄位: "x" },
        source: fixtureSource,
        tableFields: fixtureWriteFields,
        type: "create",
      }),
    ).toThrow("Unknown field: 不存在欄位");

    expect(() =>
      createWriteOperation({
        clientToken: "token",
        fields: { 狀態: "處理中" },
        recordId: "recWrite",
        source: fixtureSource,
        tableFields: fixtureWriteFields,
        type: "update",
      }),
    ).toThrow("Client token is only valid for create writes");
  });

  it("plans update field changes with previous values", () => {
    const operation = createWriteOperation({
      currentRecord: fixtureWriteRecord,
      fields: { 狀態: "處理中", 備註: "Existing note" },
      recordId: "recWrite",
      source: fixtureSource,
      tableFields: fixtureWriteFields,
      type: "update",
    });

    expect(operation.fieldChanges).toEqual([
      expect.objectContaining({
        fieldName: "狀態",
        previousValue: "待處理",
        requestedValue: "處理中",
        status: "pending",
      }),
      expect.objectContaining({
        fieldName: "備註",
        previousValue: "Existing note",
        requestedValue: "Existing note",
        status: "unchanged",
      }),
    ]);
  });

  it("keeps unconfirmed create and update operations in preview state", () => {
    const createOperation = createWriteOperation({
      fields: { 標題: "Preview only" },
      source: fixtureSource,
      tableFields: fixtureWriteFields,
      type: "create",
    });
    const updateOperation = createWriteOperation({
      currentRecord: fixtureWriteRecord,
      fields: { 狀態: "處理中" },
      recordId: "recWrite",
      source: fixtureSource,
      tableFields: fixtureWriteFields,
      type: "update",
    });

    expect(createOperation).toMatchObject({
      commitState: "previewed",
      targetRecordId: undefined,
    });
    expect(updateOperation).toMatchObject({
      commitState: "previewed",
      targetRecordId: "recWrite",
    });
  });
});
