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
  "schema",
  "get",
  "filter",
  "search",
  "media download",
  "triage",
  "research",
  "verify",
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
      "lark-bitable configure <Lark Base URL> --mode Developer --lark-app-id <id> --lark-app-secret <secret> --lark-redirect-uri <registered-redirect-uri>",
      'lark-bitable configure --mode QA --owner-field "負責人" --json',
      'lark-bitable configure "$LARK_BASE_URL" --status-field "狀態" --priority-field "優先級" --title-field "標題" --actionable-status "待处理" --json',
    ],
    commonFailures: [
      "invalid URL",
      "missing table id",
      "field discovery denied by missing application-identity base:field:read and/or application-identity bitable:app:readonly permission",
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
      "Mode is chosen by number from QA and Developer. Owner field is optional and may be left blank.",
      "Default owner is not prompted in interactive configure. Set it only when needed with --default-owner.",
      "If Lark cannot return fields, interactive configure stops and shows the permission/configuration fix instead of asking humans to type field names.",
      "Field discovery uses app credentials and tenant_access_token, so the Lark app needs application-identity base:field:read for field metadata and application-identity bitable:app:readonly for Bitable record reads used when deriving existing status values.",
      "If configure reports Lark code 99991672, publish a new app version with both application-identity base:field:read and application-identity bitable:app:readonly, then wait for enterprise approval if Lark requires review.",
      "For OAuth redirect URI, use Lark Developer Console > Security Settings > Redirect URL. Do not use the Event Callback URL from the event callback page.",
    ],
    inputs: [
      "Lark Base URL",
      "Lark app id/secret",
      "registered OAuth redirect URI",
      "field mapping flags or numbered field choices",
      "mode QA or Developer",
      "optional owner field",
      "optional --default-owner flag only when you explicitly want a mode-specific default owner",
    ],
    nextSteps: ["Run lark-bitable lark --login", "Run lark-bitable valid"],
    outputs: [
      "active source summary",
      "parsed app token/table/view",
      "redacted Lark app config status",
      "field discovery status",
      "active mode status",
      "mode default owner status when --default-owner is provided",
    ],
    purpose: "Store or manage the active Lark Base/Bitable source.",
    title: "Configure Lark Bitable",
  },
  doctor: {
    aiUsage: ["lark-bitable doctor --json"],
    commonFailures: [
      "missing auth",
      "missing source",
      "missing bootstrap",
      "incomplete configure mappings",
      "missing Lark app config",
    ],
    examples: ["lark-bitable doctor --json"],
    humanUsage: ["Run lark-bitable doctor to see what setup is missing."],
    inputs: ["optional --install-skill"],
    nextSteps: ["Follow the first remediation line shown by doctor."],
    outputs: [
      "install health",
      "auth status",
      "source status",
      "configure mapping readiness",
      "configPath and authPath",
      "issues",
    ],
    purpose:
      "Check CLI installation, bootstrap, configure completeness, and Lark auth status.",
    title: "Doctor",
  },
  filter: {
    aiUsage: [
      'lark-bitable filter --field "狀態" --equals "待处理" --owner "openclaw" --limit 10 --json',
    ],
    commonFailures: [
      "unknown field",
      "empty result",
      "missing auth",
      "invalid limit",
    ],
    examples: [
      'lark-bitable filter --field "狀態" --equals "待处理" --limit 10',
    ],
    humanUsage: [
      "Run lark-bitable filter without field/value flags to be prompted for criteria.",
    ],
    inputs: [
      "field",
      "comparison",
      "value",
      "optional owner",
      "positive integer limit",
    ],
    nextSteps: ["Use lark-bitable get <record-id> for a matching record."],
    outputs: [
      "matching records",
      "criteria",
      "owner criteria",
      "limit metadata",
      "source metadata",
    ],
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
    outputs: [
      "full visible record fields",
      "media references",
      "source evidence",
    ],
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
  "media download": {
    aiUsage: [
      "lark-bitable media download <file-token> --out ./evidence/asset.bin --json",
      "lark-bitable media download <file-token> --extra '<extra>' --out ./evidence/image.png --json",
    ],
    commonFailures: [
      "missing auth",
      "expired auth",
      "missing Bitable media permission",
      "advanced-permission Bitable asset requires --extra",
      "invalid or inaccessible file token",
    ],
    examples: [
      "lark-bitable media download boxcnabcdefg --out ./evidence/image.png",
      "lark-bitable media download boxcnabcdefg --extra '<extra>' --out ./evidence/attachment.bin",
    ],
    humanUsage: [
      "Use this after lark-bitable get shows a Bitable image or attachment token in the selected bug record.",
      "The command downloads through Lark Drive media API with the stored Lark auth token. Do not download Bitable media by anonymously opening copied URLs.",
      "If the Base uses advanced permissions and Lark returns 403, pass the media extra value required by Lark for that Bitable asset.",
    ],
    inputs: ["file token", "output path", "optional extra", "optional range"],
    nextSteps: [
      "Open the downloaded file locally before using it as report evidence.",
      "If download fails, record the failure and do not describe the unseen asset as fact.",
    ],
    outputs: [
      "downloaded file path",
      "content type",
      "content disposition",
      "file size",
      "lark-media evidence",
    ],
    purpose:
      "Download Bitable image or attachment media with authenticated Lark access.",
    title: "Download Lark Media",
  },
  list: {
    aiUsage: ["lark-bitable list --owner openclaw --limit 20 --json"],
    commonFailures: [
      "missing auth",
      "missing source",
      "inaccessible table",
      "invalid limit",
    ],
    examples: [
      "lark-bitable list --limit 20",
      "lark-bitable list --owner openclaw --no-default-owner",
    ],
    humanUsage: ["Run lark-bitable list to preview configured table records."],
    inputs: [
      "optional field selection",
      "optional owner",
      "positive integer limit",
    ],
    nextSteps: ["Use record ids with get, filter, triage, or research."],
    outputs: [
      "records",
      "pagination",
      "owner criteria",
      "limit metadata",
      "source metadata",
    ],
    purpose: "List records from the active source.",
    title: "List Records",
  },
  schema: {
    aiUsage: ["lark-bitable schema --sample-limit 20 --json"],
    commonFailures: [
      "missing auth",
      "missing source",
      "inaccessible table",
      "invalid sample limit",
    ],
    examples: ["lark-bitable schema", "lark-bitable schema --json"],
    humanUsage: [
      "Run lark-bitable schema to print only numbered field headers for quick inspection.",
      "Add --json when you need full schema metadata (types, options, mappings, and sampled values).",
    ],
    inputs: [
      "no required input for header-only view",
      "optional positive integer sample limit (used by --json)",
    ],
    nextSteps: [
      "Use mappings and observed status values to choose exact filter or triage criteria.",
      "Run lark-bitable list --limit 20 --json or lark-bitable get <record-id> --json for record data.",
    ],
    outputs: [
      "without --json: numbered field headers only",
      "with --json: field names",
      "with --json: field types and UI types when available",
      "with --json: single/multi select options when available",
      "with --json: configured mappings",
      "with --json: sampled non-empty counts and observed values",
    ],
    purpose:
      "Inspect configured table schema and current field mappings without guessing table shape.",
    title: "Inspect Table Schema",
  },
  research: {
    aiUsage: [
      "lark-bitable research --out reports/selected-bug-research.md --json",
    ],
    commonFailures: ["missing selection", "insufficient evidence"],
    examples: ["lark-bitable research --out reports/selected-bug-research.md"],
    humanUsage: [
      "Run lark-bitable triage first, then lark-bitable get <record-id> to inspect the full bug record, download any media with lark-bitable media download, then run lark-bitable research.",
    ],
    inputs: ["selected record id or previous triage selection"],
    nextSteps: [
      "Open the report and collect more command/runtime evidence.",
      "If the record includes media, download and inspect it before treating the media contents as fact.",
    ],
    outputs: ["facts", "assumptions", "analysis", "risks", "evidence"],
    purpose: "Produce an evidence-backed first research report.",
    title: "Research Report",
  },
  search: {
    aiUsage: [
      'lark-bitable search "login error" --owner openclaw --limit 10 --json',
    ],
    commonFailures: [
      "empty query",
      "no matches",
      "missing auth",
      "invalid limit",
    ],
    examples: ['lark-bitable search "login error" --limit 10'],
    humanUsage: [
      "Run lark-bitable search without a query to be prompted for search text.",
    ],
    inputs: [
      "query",
      "optional selected fields",
      "optional owner",
      "positive integer limit",
    ],
    nextSteps: ["Use lark-bitable get <record-id> for a selected result."],
    outputs: [
      "matching records",
      "matched field names",
      "owner criteria",
      "limit metadata",
      "source metadata",
    ],
    purpose: "Search visible text-like fields.",
    title: "Search Records",
  },
  triage: {
    aiUsage: ["lark-bitable triage --owner openclaw --limit 10 --json"],
    commonFailures: [
      "missing field mapping",
      "no actionable records",
      "invalid limit",
    ],
    examples: ["lark-bitable triage --limit 10"],
    humanUsage: [
      "Run lark-bitable triage to see actionable records sorted by configured priority.",
    ],
    inputs: [
      "status/priority mappings",
      "optional actionable status",
      "optional owner",
      "positive integer limit",
    ],
    nextSteps: [
      "Run lark-bitable get <selected-record-id> after selecting a bug.",
      "Run media download for any returned media token before research claims.",
    ],
    outputs: [
      "sorted candidates",
      "selected bug snapshot",
      "owner criteria",
      "limit metadata",
    ],
    purpose: "Guide actionable bug selection for AI workflows.",
    title: "Triage Bugs",
  },
  valid: {
    aiUsage: [
      "lark-bitable valid --workflow triage --json",
      "lark-bitable valid --workflow verify --json",
    ],
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
  verify: {
    aiUsage: [
      "lark-bitable verify <record-id> --checks auto --json",
      "lark-bitable verify --checks none --out reports/qa-verification.md --json",
    ],
    commonFailures: [
      "active mode is not QA",
      "missing selection",
      "selected record is inaccessible",
      "no safe automated checks",
    ],
    examples: [
      "lark-bitable configure --mode QA",
      "lark-bitable triage --limit 10",
      "lark-bitable verify <record-id> --checks auto",
    ],
    humanUsage: [
      "Use QA mode for verification. The command reads the full selected task, discovers safe workspace checks, runs only supported checks, and reports skipped checks with manual next steps.",
      "If the task contains image or attachment references, verify lists them but does not treat unseen media as fact. Use media download and inspect the file.",
    ],
    inputs: [
      "optional record id",
      "checks auto/none/unit/integration/e2e",
      "optional report output path",
    ],
    nextSteps: [
      "Inspect the QA report.",
      "Download any listed media references before relying on them.",
    ],
    outputs: [
      "task summary",
      "workspace evidence",
      "executed checks",
      "skipped checks",
      "assumptions",
      "risks",
      "evidence",
    ],
    purpose:
      "Verify a selected Bitable task in QA mode with evidence-backed checks.",
    title: "QA Verify",
  },
};

export default class HelpCommand extends BaseCommand {
  static args = {
    command: Args.string({
      description: "Command name to describe.",
      required: false,
    }),
    subcommand: Args.string({
      description:
        "Topic subcommand name to describe, for example download in media download.",
      required: false,
    }),
  };
  static description = "Show global workflow or command-specific help.";
  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<CommandOutput> {
    const { args, flags } = await this.parse(HelpCommand);
    const command = [args.command, args.subcommand]
      .filter(Boolean)
      .join(" ") as CommandName | "";
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
            "lark-bitable schema",
            "lark-bitable list|get|filter|search",
            "lark-bitable media download <file-token> --out ./evidence/asset.bin",
            "lark-bitable triage",
            "lark-bitable get <record-id>",
            "lark-bitable research",
            "lark-bitable verify",
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
    "Workflow modes:",
    "  Developer - discover, triage, inspect, download media, and research bugs.",
    "  QA - verify a selected task with evidence-backed safe checks.",
    "",
    "For humans:",
    "  1. lark-bitable configure",
    "  2. lark-bitable lark --login",
    "  3. lark-bitable valid --workflow triage",
    "  4. lark-bitable schema",
    "  5. lark-bitable triage",
    "  6. lark-bitable get <record-id>",
    "  7. lark-bitable media download <file-token> --out ./evidence/asset.bin",
    "  8. lark-bitable research or lark-bitable verify, depending on active mode",
    "",
    "For AI agents:",
    "  Use --json and pass explicit command arguments instead of relying on prompts.",
    "  Run lark-bitable schema --json first when schema, field mappings, exact status values, or owner field names are unknown.",
    "  Use --limit with list, search, filter, triage, and verify record discovery.",
    "  Owner filtering is optional; if ownerCriteria.applied=false, continue with returned records and report the not-applied reason.",
    "  In Developer mode, run get <record-id> before repository research and download any Lark media through media download before claiming asset contents.",
    "  In QA mode, prefer verify and keep executed checks, skipped checks, assumptions, risks, and manual next steps separate.",
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
