import { Flags } from "@oclif/core";
import { input as promptInput } from "@inquirer/prompts";
import open from "open";

import { BaseCommand } from "../base-command.js";
import { CliError } from "../errors.js";
import type { CommandOutput } from "../output.js";
import { AuthStore, defaultAuthPath } from "../../config/auth-store.js";
import { ConfigStore } from "../../config/store.js";
import {
  createAuthSession,
  createSsoAuthorizationUrl,
  exchangeAuthorizationCode,
} from "../../lark/auth.js";
import {
  createLocalSsoServer,
  parseLocalRedirectUri,
  type LocalSsoServer,
} from "../../lark/local-callback.js";

export default class LarkCommand extends BaseCommand {
  static description =
    "Manage Lark authentication through authorization-code or SSO login.";
  static examples = [
    {
      command: "lark-bitable lark --login",
      description:
        "Start browser-based Lark SSO login using configured app settings.",
    },
    {
      command: "lark-bitable lark --logout",
      description: "Remove local Lark auth state.",
    },
  ];
  static flags = {
    ...BaseCommand.baseFlags,
    account: Flags.string({
      description: "Redacted account label for status output.",
    }),
    "app-id": Flags.string({
      description: "Lark app id used for authorization.",
      env: "LARK_APP_ID",
    }),
    "app-secret": Flags.string({
      description: "Lark app secret used only for authorization code exchange.",
      env: "LARK_APP_SECRET",
      hidden: true,
    }),
    "auth-mode": Flags.string({
      default: "sso",
      description: "Login mode.",
      options: ["sso", "code"],
    }),
    "auth-path": Flags.string({
      default: defaultAuthPath(),
      description: "Auth storage path for tests or advanced use.",
    }),
    "config-cwd": Flags.string({
      description: "Config storage directory for tests or advanced use.",
      hidden: true,
    }),
    cancel: Flags.boolean({
      description: "Cancel the login flow before token exchange.",
      hidden: true,
    }),
    code: Flags.string({
      description: "Authorization code returned by Lark SSO/OAuth.",
    }),
    domain: Flags.string({
      default: "larksuite.com",
      description: "Lark domain or region used for authorization.",
    }),
    expiresAt: Flags.string({
      description: "Access token expiration timestamp.",
      hidden: true,
    }),
    login: Flags.boolean({
      description: "Log in to Lark and store user access token state.",
      exclusive: ["logout"],
    }),
    logout: Flags.boolean({
      description: "Clear locally stored Lark token state.",
      exclusive: ["login"],
    }),
    "mock-access-token": Flags.string({
      description: "Mock token used by deterministic tests.",
      hidden: true,
    }),
    "mock-refresh-token": Flags.string({
      description: "Mock refresh token used by deterministic tests.",
      hidden: true,
    }),
    "redirect-uri": Flags.string({
      description: "Registered Lark OAuth redirect URI for SSO mode.",
      env: "LARK_REDIRECT_URI",
    }),
    "sso-timeout-ms": Flags.integer({
      default: 180_000,
      description: "Milliseconds to wait for the local SSO callback.",
      hidden: true,
    }),
    scope: Flags.string({
      char: "s",
      description: "Requested Lark OAuth scope.",
      multiple: true,
    }),
    state: Flags.string({
      description: "Optional SSO state returned by the OAuth callback.",
    }),
    yes: Flags.boolean({
      char: "y",
      description: "Skip logout confirmation prompts.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(LarkCommand);
    if (flags.logout) return this.logout(flags);
    if (flags.login) return this.login(flags);

    throw new CliError({
      code: "missing-lark-action",
      message: "Choose either --login or --logout.",
      remediation:
        "Run lark-bitable lark --login or lark-bitable lark --logout.",
    });
  }

  private async logout(flags: Record<string, unknown>): Promise<CommandOutput> {
    const authPath = flags["auth-path"] as string;
    const authStore = new AuthStore(authPath);
    const removed = await authStore.delete();
    const output: CommandOutput = {
      command: "lark",
      status: "ok",
      auth: {
        status: "missing",
        storagePath: authStore.path,
      },
      data: {
        result: removed ? "removed" : "already absent",
        confirmed: Boolean(flags.yes),
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }

  private async login(flags: Record<string, unknown>): Promise<CommandOutput> {
    if (flags.cancel) {
      throw new CliError({
        code: "login-canceled",
        message: "Login was canceled.",
        remediation:
          "Run lark-bitable lark --login again when authorization is available.",
      });
    }

    const mode = flags["auth-mode"] as "code" | "sso";
    const configured = new ConfigStore({
      cwd: flags["config-cwd"] as string | undefined,
    }).getLarkApp();
    const appId = (flags["app-id"] as string | undefined) ?? configured?.appId;
    const appSecret =
      (flags["app-secret"] as string | undefined) ?? configured?.appSecret;
    const flagDomain = flags.domain as string | undefined;
    const domain =
      flagDomain && flagDomain !== "larksuite.com"
        ? flagDomain
        : (configured?.domain ?? flagDomain ?? "larksuite.com");
    const scopes =
      (flags.scope as string[] | undefined) ?? configured?.scopes ?? undefined;
    if (mode === "sso" && !appId) {
      throw new CliError({
        code: "missing-sso-config",
        message: "SSO login requires configured Lark app credentials.",
        remediation:
          "Run lark-bitable configure and fill Lark app settings first. Use the OAuth Redirect URL from Lark Developer Console > Security Settings, not the Event Callback URL.",
      });
    }
    const configuredRedirectUri =
      (flags["redirect-uri"] as string | undefined) ?? configured?.redirectUri;
    const localRedirect = configuredRedirectUri
      ? parseLocalRedirectUri(configuredRedirectUri)
      : undefined;
    const localSso =
      mode === "sso" && !flags.code && (!configuredRedirectUri || localRedirect)
        ? await createLocalSsoServer({
            host: localRedirect?.host,
            port: localRedirect?.port ?? configured?.callbackPort ?? 14543,
            redirectPath: localRedirect?.redirectPath,
          })
        : undefined;
    const redirectUri = configuredRedirectUri ?? localSso?.redirectUri;
    const ssoAuthorizationUrl =
      mode === "sso"
        ? this.requireSsoAuthorizationUrl(
            domain,
            flags,
            appId,
            redirectUri,
            scopes,
          )
        : undefined;

    const authorizationCode =
      (flags.code as string | undefined) ??
      (localSso && ssoAuthorizationUrl
        ? (
            await this.waitForLocalSsoCode(localSso, {
              authorizationUrl: ssoAuthorizationUrl,
              mockCode: flags["mock-access-token"] ? "mock-code" : undefined,
              timeoutMs: flags["sso-timeout-ms"] as number | undefined,
            })
          ).code
        : undefined) ??
      (process.stdin.isTTY
        ? await promptInput({
            message:
              mode === "sso"
                ? `Open this Lark SSO authorization URL, then paste the callback code: ${ssoAuthorizationUrl}`
                : "Paste the Lark authorization code",
            required: true,
          })
        : undefined);

    if (!authorizationCode) {
      throw new CliError({
        code: "missing-authorization-code",
        message: "No Lark authorization code was provided.",
        remediation:
          mode === "sso"
            ? `Open the SSO authorization URL and provide the callback code: ${ssoAuthorizationUrl}`
            : "Complete the authorization-code flow or provide --code.",
      });
    }

    const exchanged = await exchangeAuthorizationCode({
      appId,
      appSecret,
      code: authorizationCode,
      domain,
      mockAccessToken: flags["mock-access-token"] as string | undefined,
      mockRefreshToken: flags["mock-refresh-token"] as string | undefined,
    });

    const authPath = flags["auth-path"] as string;
    const authStore = new AuthStore(authPath);
    const session = createAuthSession({
      accessToken: exchanged.accessToken,
      refreshToken: exchanged.refreshToken,
      storagePath: authStore.path,
      domain,
      accountLabel: flags.account as string | undefined,
      appIdentity: appId,
      scopes: scopes ?? exchanged.scopes,
      expiresAt: (flags.expiresAt as string | undefined) ?? exchanged.expiresAt,
      refreshExpiresAt: exchanged.refreshExpiresAt,
    });

    await authStore.write(session);

    const output: CommandOutput = {
      command: "lark",
      status: "ok",
      auth: {
        status: "ready",
        storagePath: authStore.path,
        domain: session.domain,
        accountLabel: session.accountLabel,
        expiresAt: session.expiresAt,
      },
      data: {
        accountLabel: session.accountLabel,
        appIdentity: session.appIdentity,
        authMode: mode === "sso" ? "single-sign-on" : "authorization-code",
        callbackMode: localSso ? "local-callback" : "manual-code",
        scopes: session.scopes,
        ssoAuthorizationUrl,
        tokenState: "ready",
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }

  private requireSsoAuthorizationUrl(
    domain: string,
    flags: Record<string, unknown>,
    appId: string | undefined,
    redirectUri: string | undefined,
    scopes: string[] | undefined,
  ): string {
    if (!appId || !redirectUri) {
      throw new CliError({
        code: "missing-sso-config",
        message:
          "SSO login requires configured Lark app credentials and a redirect URI.",
        remediation:
          "Run lark-bitable configure and fill Lark app settings first, or pass --app-id and --redirect-uri. The redirect URI must exactly match Lark Developer Console > Security Settings > Redirect URL; do not use the Event Callback URL.",
      });
    }

    return createSsoAuthorizationUrl({
      appId,
      domain,
      redirectUri,
      scopes,
      state: flags.state as string | undefined,
    });
  }

  private async waitForLocalSsoCode(
    server: LocalSsoServer,
    input: {
      authorizationUrl: string;
      mockCode?: string;
      timeoutMs?: number;
    },
  ) {
    if (!input.mockCode) {
      await open(input.authorizationUrl, { wait: false });
    }
    return server.waitForCode(input);
  }
}
