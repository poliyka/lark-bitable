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
import { fixtureRecords } from "../tests/fixtures/lark.js";

const validUrl =
  "https://u5ijellsw5.sg.larksuite.com/base/TypDbjKBfaJcaSsoEI1lZjHsgIY?table=tblp8ig36Itp0yOU&view=vewb6FrjBe";

const cwd = await mkdtemp(join(tmpdir(), "lark-quickstart-"));
const skillDir = join(cwd, "skills");
const authPath = join(cwd, "auth.json");
const reportPath = join(cwd, "report.md");
const fixture = JSON.stringify(fixtureRecords);

await DoctorCommand.run(["--skill-dir", skillDir, "--install-skill", "--json"]);
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
]);
await ListCommand.run([
  "--config-cwd",
  cwd,
  "--auth-path",
  authPath,
  "--fixture",
  fixture,
  "--json",
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
]);
await ResearchCommand.run([
  "--config-cwd",
  cwd,
  "--evidence",
  "repository-file:src/auth.ts:auth handler exists",
  "--out",
  reportPath,
  "--json",
]);
await LarkCommand.run(["--logout", "--auth-path", authPath, "--yes", "--json"]);

const report = await readFile(reportPath, "utf8");
if (!report.includes("## Evidence")) {
  throw new Error("Quickstart validation report is missing evidence section.");
}

console.log(`quickstart validation passed in ${cwd}`);
