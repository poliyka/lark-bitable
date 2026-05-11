import type { BitableFieldInfo } from "../../src/lark/field-discovery.js";
import type { BitableRecord } from "../../src/config/schema.js";

import { fixtureSource } from "./lark.js";

export const fixtureWriteFields: BitableFieldInfo[] = [
  { fieldName: "標題", type: 1, uiType: "Text" },
  {
    fieldName: "狀態",
    options: [
      { id: "optTodo", name: "待處理" },
      { id: "optDoing", name: "處理中" },
      { id: "optDone", name: "完成" },
    ],
    type: 3,
    uiType: "SingleSelect",
  },
  { fieldName: "優先級", type: 3, uiType: "SingleSelect" },
  { fieldName: "備註", type: 1, uiType: "Text" },
];

export const fixtureWriteRecord: BitableRecord = {
  recordId: "recWrite",
  fields: {
    標題: "Write command existing task",
    狀態: "待處理",
    優先級: "P1",
    備註: "Existing note",
  },
  source: {
    appToken: fixtureSource.appToken,
    tableId: fixtureSource.tableId,
    viewId: fixtureSource.viewId,
    retrievedAt: "2026-05-11T10:00:00.000Z",
  },
  matchedFields: [],
};

export const fixtureCreatedWriteRecord: BitableRecord = {
  recordId: "recCreatedWrite",
  fields: {
    標題: "Write command live create",
    狀態: "待處理",
  },
  source: {
    appToken: fixtureSource.appToken,
    tableId: fixtureSource.tableId,
    viewId: fixtureSource.viewId,
    retrievedAt: "2026-05-11T10:01:00.000Z",
  },
  matchedFields: [],
};
