import { Args, Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";

export const commandNames = [
  "help",
  "doctor",
  "lark",
  "valid",
  "configure",
  "list",
  "get",
  "filter",
  "search",
  "triage",
  "research",
] as const;

type CommandName = (typeof commandNames)[number];

interface HelpEntry {
  aiUsage: string[];
  commonFailures: string[];
  examples: string[];
  humanUsage: string[];
  inputs: string[];
  nextSteps: string[];
  outputs: string[];
  purpose: string;
  title: string;
}

const helpEntries: Record<CommandName, HelpEntry> = {
  help: {
    aiUsage: ["lark-bitable help --json", "lark-bitable help <command> --json"],
    commonFailures: [
      "unknown command name",
      "stale bootstrap guidance",
      "using oclif --help when workflow help is needed",
    ],
    examples: [
      "lark-bitable help",
      "lark-bitable help configure",
      "lark-bitable help lark",
    ],
    humanUsage: [
      "Run lark-bitable help to see the whole workflow, then run lark-bitable help <command> for the command you want to use next.",
    ],
    inputs: ["optional command name", "optional --json for structured help"],
    nextSteps: [
      "Start with lark-bitable configure if no source is configured.",
      "Run lark-bitable doctor when setup status is unclear.",
    ],
    outputs: [
      "recommended workflow",
      "command list",
      "human and AI usage examples",
      "inputs, outputs, common failures, and next steps",
    ],
    purpose:
      "Show global workflow help or detailed command-specific help for humans and AI agents.",
    title: "Help",
  },
  configure: {
    aiUsage: [
      "lark-bitable configure <Lark Base URL> --lark-app-id <id> --lark-app-secret <secret> --lark-redirect-uri <registered-redirect-uri>",
      'lark-bitable configure "$LARK_BASE_URL" --status-field "狀態" --priority-field "優先級" --title-field "標題" --json',
    ],
    commonFailures: [
      "invalid URL",
      "missing table id",
      "field discovery denied by missing application-identity base:field:read or bitable:app:readonly permission",
      "redirect URI not registered in Lark developer console",
      "replacement conflict",
    ],
    examples: [
      "lark-bitable configure",
      "lark-bitable configure <Lark Base URL>",
    ],
    humanUsage: [
      "Run lark-bitable configure with no arguments to be prompted for the Lark Base URL, Lark app id/secret, OAuth redirect URI, and bug field mappings.",
      "After app credentials are entered, configure loads the table fields and lets you choose status, priority, and title fields by number. The actionable status value is also chosen from discovered status options or existing record values.",
      "If Lark cannot return fields, interactive configure stops and shows the permission/configuration fix instead of asking humans to type field names.",
      "Field discovery uses app credentials and tenant_access_token, so the Lark app needs an application-identity field-read permission. Prefer base:field:read; use application-identity bitable:app:readonly only when the broader Bitable read scope is required.",
      "If configure reports Lark code 99991672, publish a new app version with application-identity base:field:read and wait for enterprise approval if Lark requires review.",
      "For OAuth redirect URI, use Lark Developer Console > Security Settings > Redirect URL. Do not use the Event Callback URL from the event callback page.",
    ],
    inputs: [
      "Lark Base URL",
      "Lark app id/secret",
      "registered OAuth redirect URI",
      "field mapping flags or numbered field choices",
    ],
    nextSteps: ["Run lark-bitable lark --login", "Run lark-bitable valid"],
    outputs: [
      "active source summary",
      "parsed app token/table/view",
      "redacted Lark app config status",
      "field discovery status",
    ],
    purpose: "Store or manage the active Lark Base/Bitable source.",
    title: "Configure Lark Bitable",
  },
  doctor: {
    aiUsage: ["lark-bitable doctor --json"],
    commonFailures: ["missing auth", "missing source", "missing bootstrap"],
    examples: ["lark-bitable doctor --json"],
    humanUsage: ["Run lark-bitable doctor to see what setup is missing."],
    inputs: ["optional --install-skill"],
    nextSteps: ["Follow the first remediation line shown by doctor."],
    outputs: ["install health", "auth status", "source status", "issues"],
    purpose: "Check CLI installation, bootstrap, config, and auth status.",
    title: "Doctor",
  },
  filter: {
    aiUsage: ['lark-bitable filter --field "狀態" --equals "待處理" --json'],
    commonFailures: ["unknown field", "empty result", "missing auth"],
    examples: ['lark-bitable filter --field "狀態" --equals "待處理"'],
    humanUsage: [
      "Run lark-bitable filter without field/value flags to be prompted for criteria.",
    ],
    inputs: ["field", "comparison", "value"],
    nextSteps: ["Use lark-bitable get <record-id> for a matching record."],
    outputs: ["matching records", "criteria", "source metadata"],
    purpose: "Return records matching field criteria.",
    title: "Filter Records",
  },
  get: {
    aiUsage: ["lark-bitable get <record-id> --json"],
    commonFailures: ["missing record id", "unknown record", "missing auth"],
    examples: ["lark-bitable get recxxxx"],
    humanUsage: [
      "Run lark-bitable get without a record id to choose from recent records.",
    ],
    inputs: ["record id"],
    nextSteps: ["Use the returned fields as cited evidence for debugging."],
    outputs: ["full visible record fields", "source evidence"],
    purpose: "Retrieve one record by stable record id.",
    title: "Get Record",
  },
  lark: {
    aiUsage: [
      "lark-bitable lark --login --json",
      "lark-bitable lark --login --auth-mode code --code <authorization-code> --json",
    ],
    commonFailures: [
      "canceled login",
      "missing SSO config",
      "redirect URI not registered exactly in Lark developer console",
      "missing scope such as bitable:app:readonly or Lark error 20027",
      "code exchange failure",
    ],
    examples: [
      "lark-bitable lark --login",
      'lark-bitable lark --login --auth-mode code --app-id "$LARK_APP_ID" --code <code>',
      "lark-bitable lark --logout",
    ],
    humanUsage: [
      "Run lark-bitable configure first, then lark-bitable lark --login. The CLI opens a browser and waits for the local SSO callback.",
      "The redirect URI sent to Lark must exactly match the OAuth redirect URI registered in the Lark developer console, including host, port, and path.",
      "If you are on the app page at /event?tab=callback, that page configures event callbacks; it is not the OAuth login redirect URL used by this command.",
      "If Lark says bitable:app:readonly is missing or shows error 20027, open Lark Developer Console > Permissions, add the user-identity permission, publish a new app version, wait for enterprise approval if required, then retry login.",
    ],
    inputs: [
      "Lark domain",
      "account/app identity",
      "auth mode: sso or code",
      "SSO redirect URI when auth mode is sso",
      "authorization code",
      "app id and app secret for token exchange",
    ],
    nextSteps: ["Run lark-bitable valid --workflow inspect"],
    outputs: ["redacted auth status", "auth storage path"],
    purpose:
      "Authorize or clear Lark API access from the single lark-bitable command.",
    title: "Lark Login",
  },
  list: {
    aiUsage: ["lark-bitable list --limit 20 --json"],
    commonFailures: ["missing auth", "missing source", "inaccessible table"],
    examples: ["lark-bitable list --limit 20"],
    humanUsage: ["Run lark-bitable list to preview configured table records."],
    inputs: ["optional field selection", "limit"],
    nextSteps: ["Use record ids with get, filter, triage, or research."],
    outputs: ["records", "pagination", "source metadata"],
    purpose: "List records from the active source.",
    title: "List Records",
  },
  research: {
    aiUsage: [
      "lark-bitable research --out reports/selected-bug-research.md --json",
    ],
    commonFailures: ["missing selection", "insufficient evidence"],
    examples: ["lark-bitable research --out reports/selected-bug-research.md"],
    humanUsage: [
      "Run lark-bitable triage first, then lark-bitable research to produce the first report.",
    ],
    inputs: ["selected record id or previous triage selection"],
    nextSteps: ["Open the report and collect more command/runtime evidence."],
    outputs: ["facts", "assumptions", "analysis", "risks", "evidence"],
    purpose: "Produce an evidence-backed first research report.",
    title: "Research Report",
  },
  search: {
    aiUsage: ['lark-bitable search "login error" --json'],
    commonFailures: ["empty query", "no matches", "missing auth"],
    examples: ['lark-bitable search "login error"'],
    humanUsage: [
      "Run lark-bitable search without a query to be prompted for search text.",
    ],
    inputs: ["query", "optional selected fields"],
    nextSteps: ["Use lark-bitable get <record-id> for a selected result."],
    outputs: ["matching records", "matched field names", "source metadata"],
    purpose: "Search visible text-like fields.",
    title: "Search Records",
  },
  triage: {
    aiUsage: ["lark-bitable triage --json"],
    commonFailures: ["missing field mapping", "no actionable records"],
    examples: ["lark-bitable triage"],
    humanUsage: [
      "Run lark-bitable triage to see actionable records sorted by configured priority.",
    ],
    inputs: ["status/priority mappings", "optional actionable status"],
    nextSteps: ["Run lark-bitable research after selecting a bug."],
    outputs: ["sorted candidates", "selected bug snapshot"],
    purpose: "Guide actionable bug selection for AI workflows.",
    title: "Triage Bugs",
  },
  valid: {
    aiUsage: ["lark-bitable valid --workflow triage --json"],
    commonFailures: ["blocked prerequisites", "partial live access"],
    examples: ["lark-bitable valid --workflow triage"],
    humanUsage: [
      "Run lark-bitable valid any time you are unsure what setup is missing.",
    ],
    inputs: ["workflow scope", "guided remediation flag"],
    nextSteps: ["Run the nextSafeCommand or first remediation step."],
    outputs: ["ready/partial/blocked", "issues", "remediation steps"],
    purpose: "Validate whether setup can run the requested workflow.",
    title: "Validate Setup",
  },
};

export default class HelpCommand extends BaseCommand {
  static args = {
    command: Args.string({
      description: "Command name to describe.",
      required: false,
    }),
  };
  static description = "Show global workflow or command-specific help.";
  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<CommandOutput> {
    const { args, flags } = await this.parse(HelpCommand);
    const command = args.command as CommandName | undefined;
    if (command && !isCommandName(command)) {
      throw new CliError({
        code: "unknown-help-command",
        message: `Unknown help command: ${command}`,
        remediation: [
          "Run lark-bitable help to see all commands.",
          `Available commands: ${commandNames.join(", ")}`,
          "Example: lark-bitable help configure",
        ].join(" "),
      });
    }

    const data = command
      ? {
          command,
          ...helpEntries[command],
        }
      : {
          rendered: renderGlobalHelp(),
          workflow: [
            "lark-bitable doctor",
            "lark-bitable configure",
            "lark-bitable lark --login",
            "lark-bitable valid --workflow triage",
            "lark-bitable list|get|filter|search",
            "lark-bitable triage",
            "lark-bitable research",
          ],
          commands: commandNames,
          entries: helpEntries,
        };

    const output: CommandOutput = {
      command: "help",
      status: data ? "ok" : "error",
      data: command
        ? {
            rendered: renderCommandHelp(helpEntries[command]),
            ...data,
          }
        : data,
    };

    if (flags.json) {
      this.emit(output, true);
    } else {
      this.log(
        command ? renderCommandHelp(helpEntries[command]) : renderGlobalHelp(),
      );
    }
    return output;
  }
}

function isCommandName(command: string): command is CommandName {
  return commandNames.includes(command as CommandName);
}

function renderGlobalHelp(): string {
  return [
    "Lark Bitable CLI",
    "",
    "For humans:",
    "  1. lark-bitable configure",
    "  2. lark-bitable lark --login",
    "  3. lark-bitable valid --workflow triage",
    "  4. lark-bitable triage",
    "  5. lark-bitable research",
    "",
    "For AI agents:",
    "  Use --json and pass explicit command arguments instead of relying on prompts.",
    "",
    "Commands:",
    ...commandNames.map((name) => `  ${name} - ${helpEntries[name].purpose}`),
    "",
    "Run lark-bitable help <command> for detailed help.",
  ].join("\n");
}

function renderCommandHelp(entry: HelpEntry): string {
  return [
    entry.title,
    "",
    entry.purpose,
    "",
    "For humans:",
    ...entry.humanUsage.map((line) => `  ${line}`),
    "",
    "For AI agents:",
    ...entry.aiUsage.map((line) => `  ${line}`),
    "",
    "Inputs:",
    ...entry.inputs.map((line) => `  - ${line}`),
    "",
    "Outputs:",
    ...entry.outputs.map((line) => `  - ${line}`),
    "",
    "Common failures:",
    ...entry.commonFailures.map((line) => `  - ${line}`),
    "",
    "Next steps:",
    ...entry.nextSteps.map((line) => `  - ${line}`),
    "",
    "Examples:",
    ...entry.examples.map((line) => `  ${line}`),
  ].join("\n");
}
