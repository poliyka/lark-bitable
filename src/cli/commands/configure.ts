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
import { parseBitableUrl } from "../../lark/url-parser.js";

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
    {
      command:
        'lark-bitable configure "https://example.larksuite.com/base/<appToken>?table=<tableId>" --table-profile req',
      description:
        "Save a named table profile without changing the active source.",
    },
    {
      command: "lark-bitable configure --list-table-profiles",
      description: "List saved table profiles and their source identities.",
    },
    {
      command: "lark-bitable configure --table-profile req --remove",
      description: "Remove a saved table profile.",
    },
  ];
  static flags = {
    ...BaseCommand.baseFlags,
    clear: Flags.boolean({
      description: "Clear the active source configuration.",
      exclusive: ["table-profile", "list-table-profiles", "remove"],
    }),
    "table-profile": Flags.string({
      description:
        "Save or remove a named table profile (e.g. req); keep the active source unchanged.",
      exclusive: ["list-table-profiles"],
    }),
    "list-table-profiles": Flags.boolean({
      description:
        "List table profile names, app tokens, table IDs, and recorded view IDs.",
    }),
    remove: Flags.boolean({
      description:
        "Remove the named --table-profile (e.g. --table-profile req --remove).",
      dependsOn: ["table-profile"],
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
    mode: Flags.string({
      description: "Workflow mode to activate.",
      options: ["QA", "Developer"],
    }),
    name: Flags.string({
      description: "Optional source name.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { args, flags } = await this.parse(ConfigureCommand);
    const store = new ConfigStore({ cwd: flags["config-cwd"] });

    if (flags["list-table-profiles"]) {
      const output: CommandOutput = {
        command: "configure",
        status: "ok",
        data: {
          tableProfiles: Object.entries(store.listTableProfiles()).map(
            ([name, source]) => ({
              name,
              appToken: source.appToken,
              tableId: source.tableId,
              viewId: source.viewId,
            }),
          ),
        },
      };
      this.emit(output, Boolean(flags.json));
      return output;
    }

    if (flags["table-profile"] !== undefined) {
      const name = flags["table-profile"];
      const previous = store.getTableProfile(name);
      if (flags.remove) {
        if (args.url) {
          throw new CliError({
            code: "conflicting-table-profile-options",
            message: "A profile cannot be saved and removed together.",
            remediation: "Omit the URL when using --remove.",
          });
        }
        store.removeTableProfile(name);
        const output: CommandOutput = {
          command: "configure",
          status: "ok",
          data: { result: "removed", tableProfile: { name } },
        };
        this.emit(output, Boolean(flags.json));
        return output;
      }
      if (!args.url) {
        throw new CliError({
          code: "missing-url",
          message:
            "A Lark Base/Bitable URL is required to save a table profile.",
          remediation:
            'Run lark-bitable configure "https://example.larksuite.com/base/<appToken>?table=<tableId>" --table-profile <name>',
        });
      }
      const parsedUrl = parseBitableUrl(args.url);
      const source = store.setTableProfile(name, {
        sourceUrl: parsedUrl.sourceUrl,
        appToken: parsedUrl.appToken,
        tableId: parsedUrl.tableId,
        viewId: parsedUrl.viewId,
        updatedAt: new Date().toISOString(),
      });
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
          tableProfile: {
            name,
            appToken: source.appToken,
            tableId: source.tableId,
            viewId: source.viewId,
          },
        },
      };
      this.emit(output, Boolean(flags.json));
      return output;
    }

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

    const source = bitableSourceSchema.parse({
      sourceUrl: parsedUrl.sourceUrl,
      appToken: parsedUrl.appToken,
      tableId: parsedUrl.tableId,
      viewId: parsedUrl.viewId,
      name: flags.name ?? previous?.name,
      updatedAt: new Date().toISOString(),
    });

    store.setSource(source);
    store.setActiveMode({
      configuredBy: "configure",
      mode: activeMode,
    });
    const larkApp =
      larkAppId && larkAppSecret
        ? store.setLarkApp(
            larkAppConfigSchema.parse({
              appId: larkAppId,
              appSecret: larkAppSecret,
              callbackPort,
              domain: larkDomain,
              redirectUri: larkRedirectUri,
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
        },
        mode: {
          active: activeMode,
        },
        larkApp: larkApp
          ? {
              appId: larkApp.appId,
              callbackPort: larkApp.callbackPort,
              domain: larkApp.domain,
              redirectUri: larkApp.redirectUri,
              secretState: "stored",
            }
          : null,
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
