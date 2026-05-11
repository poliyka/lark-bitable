import type { BitableRecord, BitableSource } from "../../src/config/schema.js";

export const fixtureSource: BitableSource = {
  sourceUrl:
    "https://u5ijellsw5.sg.larksuite.com/base/TypDbjKBfaJcaSsoEI1lZjHsgIY?table=tblp8ig36Itp0yOU&view=vewb6FrjBe",
  appToken: "TypDbjKBfaJcaSsoEI1lZjHsgIY",
  tableId: "tblp8ig36Itp0yOU",
  viewId: "vewb6FrjBe",
  statusField: "狀態",
  actionableStatus: "待處理",
  priorityField: "優先級",
  fieldAliases: {
    title: "標題",
  },
  updatedAt: "2026-05-07T10:00:00.000Z",
};

export const fixtureRecords: BitableRecord[] = [
  {
    recordId: "recLogin",
    fields: {
      標題: "Login error",
      狀態: "待處理",
      優先級: "P0",
    },
    source: {
      appToken: fixtureSource.appToken,
      tableId: fixtureSource.tableId,
      viewId: fixtureSource.viewId,
      retrievedAt: "2026-05-07T10:00:00.000Z",
    },
    matchedFields: [],
  },
  {
    recordId: "recDone",
    fields: {
      標題: "Resolved bug",
      狀態: "完成",
      優先級: "P2",
    },
    source: {
      appToken: fixtureSource.appToken,
      tableId: fixtureSource.tableId,
      viewId: fixtureSource.viewId,
      retrievedAt: "2026-05-07T10:00:00.000Z",
    },
    matchedFields: [],
  },
];
