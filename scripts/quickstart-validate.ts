import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import ConfigureCommand from "../src/cli/commands/configure.js";
import DoctorCommand from "../src/cli/commands/doctor.js";
import FilterCommand from "../src/cli/commands/filter.js";
import GetCommand from "../src/cli/commands/get.js";
import LarkCommand from "../src/cli/commands/lark.js";
import ListCommand from "../src/cli/commands/list.js";
import ResearchCommand from "../src/cli/commands/research.js";
import SearchCommand from "../src/cli/commands/search.js";
import TriageCommand from "../src/cli/commands/triage.js";
import ValidCommand from "../src/cli/commands/valid.js";
import WriteCommand from "../src/cli/commands/write.js";
import { fixtureRecords } from "../tests/fixtures/lark.js";
import {
  fixtureCreatedWriteRecord,
  fixtureWriteFields,
  fixtureWriteRecord,
} from "../tests/fixtures/write.js";

const validUrl =
  "https://u5ijellsw5.sg.larksuite.com/base/TypDbjKBfaJcaSsoEI1lZjHsgIY?table=tblp8ig36Itp0yOU&view=vewb6FrjBe";

const cwd = await mkdtemp(join(tmpdir(), "lark-quickstart-"));
const skillDir = join(cwd, "skills");
const authPath = join(cwd, "auth.json");
const auditPath = join(cwd, "logs", "audit.json");
const reportPath = join(cwd, "report.md");
const fixture = JSON.stringify(fixtureRecords);
const auditFlags = ["--audit-path", auditPath];

await DoctorCommand.run([
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--skill-dir",
  skillDir,
  "--install-skill",
  "--json",
  ...auditFlags,
]);
await ConfigureCommand.run([
  validUrl,
  "--config-cwd",
  cwd,
  "--lark-app-id",
  "cli-app",
  "--lark-app-secret",
  "cli-secret",
  "--lark-callback-port",
  "0",
  "--status-field",
  "狀態",
  "--priority-field",
  "優先級",
  "--title-field",
  "標題",
  "--json",
  ...auditFlags,
]);
await LarkCommand.run([
  "--login",
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--mock-access-token",
  "access-secret",
  "--mock-refresh-token",
  "refresh-secret",
  "--json",
  ...auditFlags,
]);
await ValidCommand.run([
  "--workflow",
  "triage",
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--skill-dir",
  skillDir,
  "--json",
  ...auditFlags,
]);
await ValidCommand.run([
  "--workflow",
  "write",
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--skill-dir",
  skillDir,
  "--json",
  ...auditFlags,
]);
await ListCommand.run([
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--fixture",
  fixture,
  "--json",
  ...auditFlags,
]);
await GetCommand.run([
  "recLogin",
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--fixture",
  fixture,
  "--json",
  ...auditFlags,
]);
await FilterCommand.run([
  "--field",
  "狀態",
  "--equals",
  "待處理",
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--fixture",
  fixture,
  "--json",
  ...auditFlags,
]);
await SearchCommand.run([
  "login",
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--fixture",
  fixture,
  "--json",
  ...auditFlags,
]);
const writePreview = await WriteCommand.run([
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--fixture-fields",
  JSON.stringify(fixtureWriteFields),
  "--op",
  "create",
  "--field",
  "標題=Write command preview",
  "--json",
  ...auditFlags,
]);
if (
  (writePreview.data as { result?: { confirmationStatus?: string } }).result
    ?.confirmationStatus !== "not-written"
) {
  throw new Error(
    "Write preview did not report confirmationStatus=not-written.",
  );
}

const writeCreate = await WriteCommand.run([
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--fixture-fields",
  JSON.stringify(fixtureWriteFields),
  "--mock-create-record",
  JSON.stringify(fixtureCreatedWriteRecord),
  "--op",
  "create",
  "--fields-json",
  '{"標題":"Write command live create","狀態":"待處理"}',
  "--client-token",
  "manual-write-create-001",
  "--confirm",
  "--json",
  ...auditFlags,
]);
if (
  (writeCreate.data as { result?: { confirmationStatus?: string } }).result
    ?.confirmationStatus !== "confirmed"
) {
  throw new Error("Committed write create did not report confirmed status.");
}

await WriteCommand.run([
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--fixture-fields",
  JSON.stringify(fixtureWriteFields),
  "--fixture-records",
  JSON.stringify([fixtureWriteRecord]),
  "--op",
  "update",
  "--record-id",
  "recWrite",
  "--field",
  "狀態=處理中",
  "--json",
  ...auditFlags,
]);
await TriageCommand.run([
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--fixture",
  fixture,
  "--select",
  "0",
  "--json",
  ...auditFlags,
]);
await ResearchCommand.run([
  "--config-cwd",
  cwd,
  "--evidence",
  "repository-file:src/auth.ts:auth handler exists",
  "--out",
  reportPath,
  "--json",
  ...auditFlags,
]);
await LarkCommand.run([
  "--logout",
  "--auth-path",
  authPath,
  "--yes",
  "--json",
  ...auditFlags,
]);

const report = await readFile(reportPath, "utf8");
if (!report.includes("## Evidence")) {
  throw new Error("Quickstart validation report is missing evidence section.");
}

const auditEntries = (await readFile(auditPath, "utf8"))
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .map(
    (line) =>
      JSON.parse(line) as {
        command?: string;
        retentionApplied?: { retentionDays?: number };
      },
  );
if (auditEntries.length < 10) {
  throw new Error(
    "Quickstart validation audit log is missing command entries.",
  );
}
if (
  auditEntries.some((entry) => entry.retentionApplied?.retentionDays !== 14)
) {
  throw new Error("Quickstart validation audit log retention is invalid.");
}

console.log(`quickstart validation passed in ${cwd}`);
