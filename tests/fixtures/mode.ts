import type { BitableRecord, BitableSource } from "../../src/config/schema.js";
import { fixtureRecords, fixtureSource } from "./lark.js";

export const modeFixtureSource: BitableSource = {
  ...fixtureSource,
  actionableStatus: "待处理",
  fieldAliases: {
    ...fixtureSource.fieldAliases,
    owner: "处理人",
  },
  priorityField: "优先级",
  statusField: "当前状态",
};

export const localizedStatusValues = ["待处理", "修复中", "验收通过", "待處理"];

export const ownerValueShapes = {
  people: [{ name: "CQI Poliyka", email: "poliyka.hsu@cqigames.com" }],
  select: { value: "QA" },
  string: "openclaw",
};

export const ownerFixtureRecords: BitableRecord[] = [
  {
    ...fixtureRecords[0],
    fields: {
      ...fixtureRecords[0].fields,
      处理人: ownerValueShapes.people,
      当前状态: "待处理",
      优先级: "高",
    },
  },
  {
    ...fixtureRecords[1],
    fields: {
      ...fixtureRecords[1].fields,
      处理人: [{ name: "Other Owner" }],
      当前状态: "修复中",
      优先级: "低",
    },
  },
];
