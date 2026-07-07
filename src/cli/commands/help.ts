import { Args, Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";

export const commandNames = [
  "help",
  "doctor",
  "dashboard",
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
  "write",
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
      'lark-bitable configure "$LARK_BASE_URL" --mode QA --json',
    ],
    commonFailures: [
      "invalid URL",
      "missing table id",
      "redirect URI not registered in Lark developer console",
      "replacement conflict",
    ],
    examples: [
      "lark-bitable configure",
      "lark-bitable configure <Lark Base URL>",
    ],
    humanUsage: [
      "Run lark-bitable configure with no arguments to be prompted for the Lark Base URL, Lark app id/secret, OAuth redirect URI, and workflow mode.",
      "Configure stores table identity and Lark app settings only. It does not store bug field settings, owner fields, priority fields, or actionable status defaults.",
      "Mode is chosen by number from QA and Developer.",
      "For OAuth redirect URI, use Lark Developer Console > Security Settings > Redirect URL. Do not use the Event Callback URL from the event callback page.",
    ],
    inputs: [
      "Lark Base URL",
      "Lark app id/secret",
      "registered OAuth redirect URI",
      "mode QA or Developer",
    ],
    nextSteps: ["Run lark-bitable lark --login", "Run lark-bitable valid"],
    outputs: [
      "active source summary",
      "parsed app token/table/view",
      "redacted Lark app config status",
      "active mode status",
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
      "configPath and authPath",
      "issues",
    ],
    purpose:
      "Check CLI installation, bootstrap, configure completeness, and Lark auth status.",
    title: "Doctor",
  },
  dashboard: {
    aiUsage: [
      "lark-bitable dashboard --no-open --json",
      "lark-bitable dashboard --port 48731 --json",
    ],
    commonFailures: [
      "requested port range is unavailable",
      "browser open failed",
      "missing Lark auth for Lark-backed pages",
      "missing source configuration for table-backed pages",
    ],
    examples: [
      "lark-bitable dashboard",
      "lark-bitable dashboard --no-open",
      "lark-bitable valid --workflow dashboard --json",
    ],
    humanUsage: [
      "Run lark-bitable dashboard to start a local web UI on port 48731, or the next available incremented port.",
      "The dashboard is local-only by default and does not require a dashboard username or password.",
      "When the dashboard service is running, CLI commands and dashboard actions push redacted live updates to connected browser tabs over WebSocket.",
      "If the dashboard is not running, command execution continues normally without dashboard warnings, prompts, or failures.",
      "Use the pages for live configuration fixes, Lark login/logout, audit search, playground runs, research report browsing, table context, and UI language switching.",
      "Language preference is stored only in browser web cache. Source data, audit snapshots, command output, and research reports are not translated.",
    ],
    inputs: [
      "optional --port starting port",
      "optional --no-open",
      "optional --json",
      "hidden --host for advanced local binding",
    ],
    nextSteps: [
      "Open the reported local URL.",
      "Use configuration and Lark login pages before Lark-backed table operations.",
      "Run playground write actions in preview mode before confirming any mutation.",
    ],
    outputs: [
      "selected local dashboard URL",
      "requested and actual port",
      "local-only and no-dashboard-login status",
      "browser live connection state and command activity when connected",
      "next safe actions",
    ],
    purpose:
      "Start the local no-login dashboard for configure, Lark auth, audit logs, playground, research reports, table context, and language switching.",
    title: "Dashboard",
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
      "lark-bitable list --owner openclaw --limit 20",
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
      "Run lark-bitable schema to print a readable field metadata table for quick inspection.",
      "Add --json when automation needs machine-readable schema metadata instead of formatted tables and sections.",
    ],
    inputs: [
      "no required input for the human-readable schema table",
      "optional positive integer sample limit",
    ],
    nextSteps: [
      "Use observed values to choose exact filter or triage criteria.",
      "Run lark-bitable list --limit 20 --json or lark-bitable get <record-id> --json for record data.",
    ],
    outputs: [
      "without --json: readable field metadata table plus sample counts and next commands",
      "with --json: machine-readable field names, field metadata, sample counts, and observed values",
    ],
    purpose: "Inspect configured table schema without guessing table shape.",
    title: "Inspect Table Schema",
  },
  research: {
    aiUsage: [
      'lark-bitable research --evidence "repository-file:src/auth.ts:auth handler exists" --assumption "OAuth config may differ in production" --likely-cause "Callback failure leaves loading active [E2]" --recommended-fix "Reset loading in the failure branch [E2]" --risk "May mask a separate token refresh failure" --next-action "Run callback failure tests" --out reports/current-research.json --json',
      "lark-bitable research -o reports/current-research.json --json",
    ],
    commonFailures: ["missing selection", "insufficient evidence"],
    examples: ["lark-bitable research -o reports/current-research.json"],
    humanUsage: [
      "Run lark-bitable triage first, then lark-bitable get <record-id> to inspect the full bug record, download any media with lark-bitable media download, then run lark-bitable research.",
    ],
    inputs: [
      "previous triage selection",
      "repeatable --evidence type:reference:excerpt",
      "repeatable --assumption",
      "repeatable --likely-cause",
      "repeatable --recommended-fix",
      "repeatable --risk",
      "repeatable --next-action",
    ],
    nextSteps: [
      "Open the report and collect more command/runtime evidence.",
      "If the record includes media, download and inspect it before treating the media contents as fact.",
    ],
    outputs: [
      "facts",
      "assumptions",
      "analysis",
      "risks",
      "evidence",
      "canonical JSON report under ~/.lark-bitable/research/",
      "optional -o/--out symlink status",
    ],
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
    commonFailures: ["no actionable records", "invalid limit"],
    examples: ["lark-bitable triage --limit 10"],
    humanUsage: [
      "Run lark-bitable triage to see records sorted by inferred priority.",
      "Pass --actionable-status with an exact status value when you want status filtering.",
    ],
    inputs: [
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
  write: {
    aiUsage: [
      'lark-bitable write --op create --fields-json \'{"標題":"新增任務","狀態":"待處理"}\' --json',
      'lark-bitable write --op update --record-id recxxxx --fields-json \'{"狀態":"處理中"}\' --json',
      'lark-bitable write --op update --record-id recxxxx --fields-json \'{"狀態":"處理中"}\' --confirm --json',
      "lark-bitable get recxxxx --json",
      'lark-bitable write --op update --record-id recxxxx --fields-json \'{"附件":[{"file_token":"boxcnexisting"},"./evidence/fixed.png"]}\' --json',
      'lark-bitable write --op update --record-id recxxxx --fields-json \'{"附件":[{"file_token":"boxcnexisting"},"./evidence/fixed.png"]}\' --confirm --json',
    ],
    commonFailures: [
      "missing auth",
      "missing source",
      "unknown field",
      "missing write permission",
      "local attachment path is missing or is not a regular file",
      "local attachment upload is larger than the direct 20MB upload limit",
      "confirmed attachment replacement was not explicit",
      "Drive media upload rejected the local attachment",
      "local attachment upload succeeded but the record write failed; retry with the returned file_token",
      "invalid field value rejected by Lark",
      "confirmation read unavailable after a write response",
      "unsupported delete, batch, schema, view, or permission operation",
    ],
    examples: [
      'lark-bitable write --op create --field "標題=新增登入錯誤" --field "狀態=待處理"',
      'lark-bitable write --op create --fields-json \'{"標題":"新增登入錯誤","狀態":"待處理"}\' --confirm',
      'lark-bitable write --op update --record-id recxxxx --field "狀態=處理中"',
      'lark-bitable write --op update --record-id recxxxx --fields-json \'{"附件":[{"file_token":"boxcnexisting"},"./evidence/fixed.png"]}\' --confirm',
      "lark-bitable valid --workflow write --json",
    ],
    humanUsage: [
      "Run write without --confirm first to preview the requested create or update. Preview mode does not change table content.",
      "Use --confirm only after the preview shows the intended operation, source, target record, and field changes.",
      "For create, pass --field repeatedly or one --fields-json object. For update, also pass --record-id.",
      "Before writing an Attachment/photo field on an existing record, run get <record-id> first and preserve existing file_token objects unless replacement is explicitly requested.",
      'For Attachment/photo fields, pass existing {"file_token":"..."} objects or local file paths. Preview validates local files without uploading; confirmed writes upload local files with Drive media upload_all and then write returned file_token objects.',
      "Preview output includes attachmentPlan with requestedEffect and replacementPolicy. If requestedEffect=replace while replacementPolicy=preserve, nextSafeCommands will not include a confirm command.",
      "When appending attachments, include existing file_token objects together with new local paths so existing attachments are not replaced.",
      "Use --client-token only for committed creates when you need idempotency.",
      "Committed writes require Lark auth and a write-capable Bitable permission. Existing read-only commands remain available without write permission.",
    ],
    inputs: [
      "--op create|update",
      "--record-id for updates only",
      "--field name=value, repeatable",
      "--fields-json JSON object",
      'Attachment/photo values as {"file_token":"..."}, local path strings, or arrays mixing both',
      "--confirm to commit",
      "--attachment-mode preserve|replace for attachment/photo replacement handling",
      "--client-token for committed creates only",
    ],
    nextSteps: [
      "Run lark-bitable schema --json when field names are unknown.",
      "Run preview first, then repeat with --confirm only when the planned write is correct.",
      "Run lark-bitable get <record-id> before appending attachment evidence so existing file_token objects can be preserved.",
      "If attachmentPlan[].willReplaceExisting=true and replacementPolicy=preserve, rebuild fields-json with existing file_token values before confirming.",
      "If upload succeeds but record write fails, retry with the returned file_token values from requestedFields/nextSafeCommands instead of uploading again.",
      "Run lark-bitable get <record-id> --json after committed writes when confirmation is uncertain.",
    ],
    outputs: [
      "write operation metadata",
      "attachmentPlan for attachment/photo fields, including requestedEffect, replacementPolicy, local files, existing counts, and willReplaceExisting",
      "preview field changes",
      "confirmationStatus not-written, confirmed, failed, partial, or unknown",
      "lark-media evidence for uploaded local attachments",
      "created or updated record id when known",
      "issues, warnings, evidence, and next safe commands",
    ],
    purpose:
      "Preview or commit one create/update operation against the active Bitable table.",
    title: "Write Bitable Content",
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
            "lark-bitable dashboard",
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
            "lark-bitable write --op create|update --json",
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
      this.writeAudit(output);
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
    "  1. lark-bitable dashboard",
    "  2. lark-bitable configure",
    "  3. lark-bitable lark --login",
    "  4. lark-bitable valid --workflow triage",
    "  5. lark-bitable schema",
    "  6. lark-bitable triage",
    "  7. lark-bitable get <record-id>",
    "  8. lark-bitable media download <file-token> --out ./evidence/asset.bin",
    "  9. lark-bitable research or lark-bitable verify, depending on active mode",
    "",
    "For AI agents:",
    "  Use --json and pass explicit command arguments instead of relying on prompts.",
    "  Run lark-bitable schema --json first when schema, exact status values, or owner field names are unknown.",
    "  Use --limit with list, search, filter, triage, and verify record discovery.",
    "  Owner filtering is optional; if ownerCriteria.applied=false, continue with returned records and report the not-applied reason.",
    "  In Developer mode, run get <record-id> before repository research and download any Lark media through media download before claiming asset contents.",
    "  In QA mode, prefer verify and keep executed checks, skipped checks, assumptions, risks, and manual next steps separate.",
    "  For write operations, preview without --confirm first and commit only after the target source, record, field changes, and any local attachment uploads are explicit.",
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
