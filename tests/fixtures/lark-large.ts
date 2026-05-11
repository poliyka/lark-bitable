import type { BitableRecord } from "../../src/config/schema.js";
import { fixtureSource } from "./lark.js";

export const largeRecordFixture: BitableRecord[] = Array.from(
  { length: 50 },
  (_, index) => ({
    recordId: `rec${String(index + 1).padStart(2, "0")}`,
    fields: {
      標題: `Bug ${index + 1}`,
      狀態: index % 3 === 0 ? "待處理" : "完成",
      優先級: index % 2 === 0 ? "P0" : "P2",
    },
    source: {
      appToken: fixtureSource.appToken,
      tableId: fixtureSource.tableId,
      viewId: fixtureSource.viewId,
      retrievedAt: "2026-05-07T10:00:00.000Z",
    },
    matchedFields: [],
  }),
);
