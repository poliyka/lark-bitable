import FilterCommand from "../cli/commands/filter.js";
import GetCommand from "../cli/commands/get.js";
import ListCommand from "../cli/commands/list.js";
import ResearchCommand from "../cli/commands/research.js";
import SchemaCommand from "../cli/commands/schema.js";
import SearchCommand from "../cli/commands/search.js";
import TriageCommand from "../cli/commands/triage.js";
import ValidCommand from "../cli/commands/valid.js";
import VerifyCommand from "../cli/commands/verify.js";
import WriteCommand from "../cli/commands/write.js";
import type { CommandOutput } from "../cli/output.js";
import { formatHuman } from "../cli/output.js";
import { redactDashboardPayload } from "./api.js";
import { playgroundCommandSchema, type PlaygroundCommand } from "./schemas.js";

const commandClasses = {
  filter: FilterCommand,
  get: GetCommand,
  list: ListCommand,
  research: ResearchCommand,
  schema: SchemaCommand,
  search: SearchCommand,
  triage: TriageCommand,
  valid: ValidCommand,
  verify: VerifyCommand,
  write: WriteCommand,
};

type RunnableCommand = {
  run(argv?: string[]): Promise<CommandOutput>;
};

export interface BuildDashboardCommandArgvInput {
  command: string;
  confirmWrite?: boolean;
  parameters?: Record<string, unknown>;
}

export interface RunDashboardCommandInput extends BuildDashboardCommandArgvInput {
  auditPath: string;
  authPath?: string;
  configCwd?: string;
  researchDir?: string;
  timeoutMs?: number;
}

export function buildCommandArgv(
  input: BuildDashboardCommandArgvInput,
): string[] {
  const parsed = playgroundCommandSchema.safeParse(input.command);
  if (!parsed.success) {
    throw new Error(`Dashboard command is not supported: ${input.command}`);
  }
  const command = parsed.data;
  const parameters = input.parameters ?? {};
  const argv: string[] = [];

  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined || value === null || value === false) continue;
    if (!isSupportedDashboardParameter(command, key)) continue;
    if (key === "confirm") {
      if (command === "write" && input.confirmWrite && value === true) {
        argv.push("--confirm");
      }
      continue;
    }
    if (
      key === "recordId" &&
      typeof value === "string" &&
      (command === "get" || command === "verify")
    ) {
      argv.push(value);
      continue;
    }
    const flag = `--${kebabCase(key)}`;
    if (value === true) {
      argv.push(flag);
    } else if (Array.isArray(value)) {
      for (const item of value) argv.push(flag, String(item));
    } else {
      argv.push(flag, String(value));
    }
  }

  return argv;
}

export async function runDashboardCommand(
  input: RunDashboardCommandInput,
): Promise<{
  auditEntryId?: string;
  command: PlaygroundCommand;
  evidence: NonNullable<CommandOutput["evidence"]>;
  humanOutput: string;
  issues: NonNullable<CommandOutput["issues"]>;
  nextSafeActions: string[];
  status: CommandOutput["status"];
  structuredOutput: CommandOutput;
}> {
  const command = playgroundCommandSchema.parse(input.command);
  const commandClass = commandClasses[command] as unknown as RunnableCommand;
  const argv = [
    ...buildCommandArgv(input),
    "--json",
    "--audit-path",
    input.auditPath,
    ...commonCommandFlags(command, input),
  ];
  const output = await withTimeout(
    commandClass.run(argv),
    input.timeoutMs ?? 30_000,
  );
  const structuredOutput = redactDashboardPayload(output);
  return {
    command,
    evidence: structuredOutput.evidence ?? [],
    humanOutput: formatHuman(structuredOutput),
    issues: structuredOutput.issues ?? [],
    nextSafeActions: extractNextSafeActions(structuredOutput),
    status: structuredOutput.status,
    structuredOutput,
  };
}

function commonCommandFlags(
  command: PlaygroundCommand,
  input: RunDashboardCommandInput,
): string[] {
  const flags: string[] = [];
  if (input.configCwd) flags.push("--config-cwd", input.configCwd);
  if (input.authPath && command !== "research" && command !== "valid") {
    flags.push("--auth-path", input.authPath);
  }
  if (input.authPath && command === "valid") {
    flags.push("--auth-path", input.authPath);
  }
  if (input.researchDir && command === "research") {
    flags.push("--research-dir", input.researchDir);
  }
  return flags;
}

function extractNextSafeActions(output: CommandOutput): string[] {
  const data = output.data;
  if (data && typeof data === "object" && "nextSafeActions" in data) {
    const value = (data as { nextSafeActions?: unknown }).nextSafeActions;
    if (Array.isArray(value)) return value.map(String);
  }
  if (data && typeof data === "object" && "nextSafeCommand" in data) {
    const value = (data as { nextSafeCommand?: unknown }).nextSafeCommand;
    if (typeof value === "string") return [value];
  }
  return (
    output.issues?.flatMap((issue) =>
      issue.remediation ? [issue.remediation] : [],
    ) ?? []
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`Dashboard command timed out after ${timeoutMs}ms.`),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function kebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function isSupportedDashboardParameter(
  command: PlaygroundCommand,
  key: string,
): boolean {
  const supported: Record<PlaygroundCommand, Set<string>> = {
    filter: new Set(["contains", "equals", "field", "limit", "owner"]),
    get: new Set(["recordId"]),
    list: new Set(["limit"]),
    research: new Set(["evidence", "out"]),
    schema: new Set(["sampleLimit"]),
    search: new Set(["limit", "text"]),
    triage: new Set(["limit", "owner"]),
    valid: new Set(["workflow"]),
    verify: new Set(["checks", "recordId"]),
    write: new Set([
      "clientToken",
      "confirm",
      "field",
      "fieldsJson",
      "op",
      "recordId",
    ]),
  };
  return supported[command].has(key);
}
