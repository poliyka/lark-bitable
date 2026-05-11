import { Args, Flags } from "@oclif/core";
import {
  input as promptInput,
  password as promptPassword,
  rawlist as promptRawlist,
} from "@inquirer/prompts";

import { BaseCommand } from "../base-command.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";
import {
  bitableSourceSchema,
  larkAppConfigSchema,
} from "../../config/schema.js";
import { ConfigStore } from "../../config/store.js";
import {
  normalizeWorkflowMode,
  resolveWorkflowMode,
} from "../../mode/mode-config.js";

import {
  discoverBitableFieldsWithAppCredentials,
  discoverBitableFieldValuesWithAppCredentials,
  type BitableFieldInfo,
} from "../../lark/field-discovery.js";
import { parseBitableUrl } from "../../lark/url-parser.js";

interface FieldDiscoverySummary {
  actionableValuesReturned?: number;
  fieldsReturned?: number;
  reason?: string;
  remediation?: string;
  status: "ready" | "partial" | "skipped";
}

export default class ConfigureCommand extends BaseCommand {
  static args = {
    url: Args.string({
      description: "Lark Base/Bitable URL to store as the active source.",
      required: false,
    }),
  };
  static description = "Store or manage the active Lark Base/Bitable source.";
  static examples = [
    {
      command:
        'lark-bitable configure "https://example.larksuite.com/base/<appToken>?table=<tableId>&view=<viewId>"',
      description: "Configure an active Lark Bitable source.",
    },
  ];
  static flags = {
    ...BaseCommand.baseFlags,
    clear: Flags.boolean({
      description: "Clear the active source configuration.",
    }),
    "config-cwd": Flags.string({
      description: "Config storage directory for tests or advanced use.",
      hidden: true,
    }),
    "lark-app-id": Flags.string({
      description: "Lark app id used by login and token refresh.",
      env: "LARK_APP_ID",
    }),
    "lark-app-secret": Flags.string({
      description: "Lark app secret used by login and token refresh.",
      env: "LARK_APP_SECRET",
      hidden: true,
    }),
    "lark-callback-port": Flags.integer({
      description: "Local callback port for browser-based SSO login.",
    }),
    "lark-domain": Flags.string({
      description: "Lark domain or region used for OAuth/OpenAPI.",
    }),
    "lark-redirect-uri": Flags.string({
      description:
        "Registered Lark OAuth redirect URI used by browser-based SSO login.",
      env: "LARK_REDIRECT_URI",
    }),
    "lark-scope": Flags.string({
      description: "Requested Lark OAuth scope.",
      multiple: true,
    }),
    "actionable-status": Flags.string({
      description: "Status value treated as actionable.",
    }),
    "default-owner": Flags.string({
      description: "Default owner for the active workflow mode.",
    }),
    mode: Flags.string({
      description: "Workflow mode to activate.",
      options: ["QA", "Developer"],
    }),
    name: Flags.string({
      description: "Optional source name.",
    }),
    "owner-field": Flags.string({
      description: "Optional field name used as owner/assignee.",
    }),
    "priority-field": Flags.string({
      description: "Field name used for priority sorting.",
    }),
    "priority-order": Flags.string({
      description: "Comma-separated priority labels from highest to lowest.",
    }),
    "status-field": Flags.string({
      description: "Field name used for actionable status filtering.",
    }),
    "title-field": Flags.string({
      description: "Field name used as bug title.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { args, flags } = await this.parse(ConfigureCommand);
    const store = new ConfigStore({ cwd: flags["config-cwd"] });

    if (flags.clear) {
      store.clearSource();
      const output: CommandOutput = {
        command: "configure",
        status: "ok",
        data: {
          result: "cleared",
        },
      };
      this.emit(output, Boolean(flags.json));
      return output;
    }

    const previous = store.getSource();
    const previousLarkApp = store.getLarkApp();
    const previousMode = resolveWorkflowMode(store);
    const callbackPort =
      flags["lark-callback-port"] ?? previousLarkApp?.callbackPort ?? 14543;
    const larkDomain =
      flags["lark-domain"] ?? previousLarkApp?.domain ?? "larksuite.com";
    const interactive = process.stdin.isTTY && !flags.json;
    const sourceUrl =
      args.url ??
      (interactive
        ? await promptRequiredInput(
            "Paste the Lark Base/Bitable URL",
            previous?.sourceUrl,
          )
        : previous?.sourceUrl);

    if (!sourceUrl) {
      this.error("Missing required Lark Base/Bitable URL", {
        code: "missing-url",
        suggestions: [
          'Run lark-bitable configure "https://example.larksuite.com/base/<appToken>?table=<tableId>"',
        ],
      });
    }
    const parsedUrl = parseBitableUrl(sourceUrl);

    const larkAppId =
      flags["lark-app-id"] ??
      (interactive
        ? await promptRequiredInput(
            "Lark app id for login",
            previousLarkApp?.appId,
          )
        : undefined);
    const larkAppSecret =
      flags["lark-app-secret"] ??
      (interactive
        ? await promptSecret(
            "Lark app secret for token exchange",
            previousLarkApp?.appSecret,
          )
        : undefined);
    const larkRedirectUri =
      flags["lark-redirect-uri"] ??
      (interactive && larkAppId && larkAppSecret
        ? await promptDefaultInput(
            "Lark OAuth redirect URI from Developer Console > Security Settings > Redirect URL, not the event callback URL",
            previousLarkApp?.redirectUri ??
              `http://127.0.0.1:${callbackPort}/callback`,
          )
        : undefined);
    const requestedMode =
      flags.mode ??
      (interactive
        ? await promptWorkflowMode(previousMode.active)
        : previousMode.active);
    const activeMode = normalizeWorkflowMode(requestedMode);

    const mappingNeedsFieldDiscovery =
      interactive &&
      larkAppId &&
      larkAppSecret &&
      (!flags["status-field"] ||
        !flags["priority-field"] ||
        !flags["title-field"] ||
        flags["owner-field"] === undefined);
    const discovery = mappingNeedsFieldDiscovery
      ? await discoverFieldsForInteractiveConfigure({
          appId: larkAppId,
          appSecret: larkAppSecret,
          appToken: parsedUrl.appToken,
          domain: larkDomain,
          tableId: parsedUrl.tableId,
        })
      : {
          summary: {
            reason:
              interactive && (!larkAppId || !larkAppSecret)
                ? "Lark app credentials were not provided."
                : "Field mapping flags were provided or configure is running non-interactively.",
            status: "skipped",
          } satisfies FieldDiscoverySummary,
        };
    const discoveredFields = discovery.fields ?? [];
    const statusField =
      flags["status-field"] ??
      (interactive && discoveredFields.length > 0
        ? await promptFieldChoice(
            "Choose the bug status field",
            discoveredFields,
            previous?.statusField,
          )
        : interactive
          ? requireDiscoveredFields(discovery.summary)
          : undefined);
    const priorityField =
      flags["priority-field"] ??
      (interactive && discoveredFields.length > 0
        ? await promptFieldChoice(
            "Choose the bug priority field",
            discoveredFields,
            previous?.priorityField,
          )
        : interactive
          ? requireDiscoveredFields(discovery.summary)
          : undefined);
    const titleField =
      flags["title-field"] ??
      (interactive && discoveredFields.length > 0
        ? await promptFieldChoice(
            "Choose the bug title field",
            discoveredFields,
            previous?.fieldAliases.title,
          )
        : interactive
          ? requireDiscoveredFields(discovery.summary)
          : undefined);
    const ownerField =
      flags["owner-field"] ??
      (interactive && discoveredFields.length > 0
        ? await promptOptionalFieldChoice(
            "Choose the optional owner field",
            discoveredFields,
            previous?.fieldAliases.owner,
          )
        : undefined);
    const actionableStatusValues =
      interactive && !flags["actionable-status"] && statusField
        ? await discoverActionableStatusValues({
            appId: larkAppId,
            appSecret: larkAppSecret,
            appToken: parsedUrl.appToken,
            defaultValue: previous?.actionableStatus ?? "待處理",
            domain: larkDomain,
            fields: discoveredFields,
            statusField,
            summary: discovery.summary,
            tableId: parsedUrl.tableId,
            viewId: parsedUrl.viewId,
          })
        : [];
    if (actionableStatusValues.length > 0) {
      discovery.summary.actionableValuesReturned =
        actionableStatusValues.length;
    }
    const actionableStatus =
      flags["actionable-status"] ??
      (interactive && statusField
        ? await promptValueChoice(
            "Actionable status value",
            actionableStatusValues,
            previous?.actionableStatus ?? "待處理",
          )
        : undefined);

    const source = bitableSourceSchema.parse({
      sourceUrl: parsedUrl.sourceUrl,
      appToken: parsedUrl.appToken,
      tableId: parsedUrl.tableId,
      viewId: parsedUrl.viewId,
      name: flags.name ?? previous?.name,
      statusField: statusField ?? previous?.statusField,
      actionableStatus: actionableStatus ?? previous?.actionableStatus,
      priorityField: priorityField ?? previous?.priorityField,
      priorityOrder:
        flags["priority-order"]
          ?.split(",")
          .map((part) => part.trim())
          .filter(Boolean) ?? previous?.priorityOrder,
      fieldAliases: {
        ...previous?.fieldAliases,
        title: titleField ?? previous?.fieldAliases.title,
        owner: ownerField ?? previous?.fieldAliases.owner,
      },
      updatedAt: new Date().toISOString(),
    });

    store.setSource(source);
    store.setActiveMode({
      configuredBy: "configure",
      mode: activeMode,
    });
    const defaultOwner = flags["default-owner"];
    const workflowWithOwner =
      defaultOwner !== undefined
        ? store.setModeDefaultOwner({
            mode: activeMode,
            owner: defaultOwner,
          })
        : store.getWorkflowConfig();

    const larkApp =
      larkAppId && larkAppSecret
        ? store.setLarkApp(
            larkAppConfigSchema.parse({
              appId: larkAppId,
              appSecret: larkAppSecret,
              callbackPort,
              domain: larkDomain,
              redirectUri: larkRedirectUri,
              scopes: flags["lark-scope"]?.length
                ? flags["lark-scope"]
                : (previousLarkApp?.scopes ?? ["bitable:app:readonly"]),
              updatedAt: new Date().toISOString(),
            }),
          )
        : store.getLarkApp();

    const output: CommandOutput = {
      command: "configure",
      status: "ok",
      source: {
        appToken: source.appToken,
        tableId: source.tableId,
        viewId: source.viewId,
        retrievedAt: source.updatedAt,
      },
      data: {
        result: previous ? "replaced" : "stored",
        previous: previous
          ? {
              appToken: previous.appToken,
              tableId: previous.tableId,
              viewId: previous.viewId,
            }
          : null,
        active: {
          name: source.name,
          appToken: source.appToken,
          tableId: source.tableId,
          viewId: source.viewId,
          statusField: source.statusField,
          actionableStatus: source.actionableStatus,
          priorityField: source.priorityField,
          fieldAliases: source.fieldAliases,
        },
        mode: {
          active: activeMode,
          defaultOwner:
            workflowWithOwner?.modeConfigs?.[activeMode]?.defaultOwner ?? null,
        },
        larkApp: larkApp
          ? {
              appId: larkApp.appId,
              callbackPort: larkApp.callbackPort,
              domain: larkApp.domain,
              redirectUri: larkApp.redirectUri,
              scopes: larkApp.scopes,
              secretState: "stored",
            }
          : null,
        fieldDiscovery: discovery.summary,
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}

async function promptWorkflowMode(defaultValue: "QA" | "Developer") {
  return await promptRawlist({
    choices: [
      { name: "QA", value: "QA" },
      { name: "Developer", value: "Developer" },
    ],
    default: defaultValue,
    message: "Choose workflow mode",
  });
}

async function discoverFieldsForInteractiveConfigure(input: {
  appId: string;
  appSecret: string;
  appToken: string;
  domain?: string;
  tableId: string;
}): Promise<{
  fields?: BitableFieldInfo[];
  summary: FieldDiscoverySummary;
}> {
  try {
    const fields = await discoverBitableFieldsWithAppCredentials(input);
    if (fields.length === 0) {
      return {
        summary: {
          reason: "Lark returned no visible fields for this table.",
          remediation: fieldDiscoveryPermissionRemediation(),
          status: "partial",
        },
      };
    }
    return {
      fields,
      summary: {
        fieldsReturned: fields.length,
        status: "ready",
      },
    };
  } catch (error) {
    return {
      summary: {
        reason: sanitizeDiscoveryFailure(error),
        remediation: fieldDiscoveryPermissionRemediation(),
        status: "partial",
      },
    };
  }
}

async function discoverActionableStatusValues(input: {
  appId?: string;
  appSecret?: string;
  appToken: string;
  defaultValue: string;
  domain?: string;
  fields: BitableFieldInfo[];
  statusField: string;
  summary: FieldDiscoverySummary;
  tableId: string;
  viewId?: string;
}): Promise<string[]> {
  const fromOptions = input.fields.find(
    (field) => field.fieldName === input.statusField,
  )?.options;
  if (fromOptions?.length) {
    return ensureValueChoice(
      fromOptions.map((option) => option.name),
      {
        defaultValue: input.defaultValue,
        preferredValue: input.defaultValue,
      },
    );
  }

  if (!input.appId || !input.appSecret) {
    return ensureValueChoice([], {
      defaultValue: input.defaultValue,
      preferredValue: input.defaultValue,
    });
  }

  try {
    const fromRecords = await discoverBitableFieldValuesWithAppCredentials({
      appId: input.appId,
      appSecret: input.appSecret,
      appToken: input.appToken,
      domain: input.domain,
      fieldName: input.statusField,
      tableId: input.tableId,
      viewId: input.viewId,
    });
    return ensureValueChoice(fromRecords, {
      defaultValue: input.defaultValue,
      preferredValue: input.defaultValue,
    });
  } catch (error) {
    input.summary.status =
      input.summary.status === "skipped" ? "partial" : input.summary.status;
    input.summary.reason = [
      input.summary.reason,
      `Actionable status values could not be read: ${sanitizeDiscoveryFailure(error)}`,
    ]
      .filter(Boolean)
      .join(" ");
    return ensureValueChoice([], {
      defaultValue: input.defaultValue,
      preferredValue: input.defaultValue,
    });
  }
}

async function promptFieldChoice(
  message: string,
  fields: BitableFieldInfo[],
  defaultValue?: string,
): Promise<string> {
  return await promptRawlist({
    choices: fields.map((field) => ({
      name: field.fieldName,
      value: field.fieldName,
    })),
    default: defaultValue,
    message,
  });
}

async function promptOptionalFieldChoice(
  message: string,
  fields: BitableFieldInfo[],
  defaultValue?: string,
): Promise<string | undefined> {
  const noneValue = "__none__";
  const selected = await promptRawlist({
    choices: [
      { name: "(leave blank)", value: noneValue },
      ...fields.map((field) => ({
        name: field.fieldName,
        value: field.fieldName,
      })),
    ],
    default: defaultValue ?? noneValue,
    message,
  });
  return selected === noneValue ? undefined : selected;
}

async function promptValueChoice(
  message: string,
  values: string[],
  defaultValue: string,
): Promise<string> {
  return await promptRawlist({
    choices: values.map((value) => ({
      name: value,
      value,
    })),
    default: values.includes(defaultValue) ? defaultValue : values[0],
    message,
  });
}

function requireDiscoveredFields(summary: FieldDiscoverySummary): never {
  throw new CliError({
    code: "field-discovery-required",
    message:
      "Interactive configure could not load Bitable fields, so it cannot show numbered field choices.",
    remediation: [summary.reason, summary.remediation]
      .filter(Boolean)
      .join(" "),
  });
}

function fieldDiscoveryPermissionRemediation(): string {
  return [
    "Interactive configure reads Bitable field metadata with the Lark app tenant_access_token.",
    "Open Lark Developer Console > Permissions and add the application-identity permissions needed by configure: base:field:read for field metadata and application-identity bitable:app:readonly for Bitable record reads used when deriving existing status values.",
    "Publish a new app version and wait for enterprise approval if the console marks the permission as requiring review.",
    "User-identity bitable:app:readonly is also required for browser login and user-token table reads, but it does not satisfy application-identity configure calls.",
    "Also confirm the app id/secret are correct and the app can access the target Base.",
  ].join(" ");
}

async function promptRequiredInput(
  message: string,
  defaultValue?: string,
): Promise<string | undefined> {
  const value = await promptInput({
    message,
    default: defaultValue,
    required: !defaultValue,
  });
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : defaultValue;
}

async function promptDefaultInput(
  message: string,
  defaultValue: string,
): Promise<string> {
  const value = await promptInput({
    message,
    default: defaultValue,
  });
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : defaultValue;
}

async function promptSecret(
  message: string,
  existingSecret?: string,
): Promise<string | undefined> {
  const value = await promptPassword({
    message: existingSecret
      ? `${message} (press Enter to keep stored secret)`
      : message,
    mask: "*",
    validate: (candidate) =>
      existingSecret || candidate.trim().length > 0
        ? true
        : "Lark app secret is required.",
  });
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : existingSecret;
}

function sanitizeDiscoveryFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Lark field discovery failed.";
  }
  return error.message.replace(
    /(secret|token)\s*[:=]\s*[^,\s]+/gi,
    "$1=[REDACTED]",
  );
}

function ensureValueChoice(
  values: string[],
  input: {
    defaultValue: string;
    preferredValue: string;
  },
): string[] {
  const seen = new Set<string>();
  const choices: string[] = [];
  for (const value of [input.preferredValue, ...values, input.defaultValue]) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    choices.push(trimmed);
  }
  return choices;
}
