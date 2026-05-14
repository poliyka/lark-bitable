import open from "open";

import { AuthStore } from "../config/auth-store.js";
import type { Issue } from "../config/schema.js";
import type { ConfigStore } from "../config/store.js";
import {
  authStatusFor,
  createAuthSession,
  createSsoAuthorizationUrl,
  exchangeAuthorizationCode,
} from "../lark/auth.js";
import {
  createLocalSsoServer,
  parseLocalRedirectUri,
} from "../lark/local-callback.js";
import { redactDashboardPayload } from "./api.js";

export interface LoginFlowView {
  authorizationUrl?: string;
  callbackMode: "local-callback" | "manual";
  flowId: string;
  issues: Issue[];
  status: "waiting" | "ready" | "canceled" | "failed" | "expired";
}

export interface DashboardAuthService {
  loginStatus(flowId: string): Promise<LoginFlowView>;
  logout(): Promise<{ auth: Awaited<ReturnType<typeof projectAuthState>> }>;
  startLogin(input?: {
    callbackMode?: "local" | "manual";
    openBrowser?: boolean;
    scopes?: string[];
    timeoutMs?: number;
  }): Promise<LoginFlowView>;
}

const flows = new Map<string, LoginFlowView>();

export async function projectAuthState(authStore: AuthStore) {
  const session = await authStore.read();
  const status = authStatusFor(session);
  return redactDashboardPayload({
    status: status.status,
    storagePath: authStore.path,
    domain: session?.domain,
    accountLabel: session?.accountLabel,
    scopes: session?.scopes ?? [],
    expiresAt: session?.expiresAt,
    issues:
      status.status === "ready"
        ? []
        : [
            {
              code:
                status.status === "missing"
                  ? "missing-auth"
                  : `auth-${status.status}`,
              message: `Lark auth is ${status.status}.`,
              remediation: "Start Lark login from the dashboard.",
            },
          ],
  });
}

export function createDashboardAuthService(input: {
  authStore: AuthStore;
  configStore: ConfigStore;
}): DashboardAuthService {
  return {
    async loginStatus(flowId) {
      const flow = flows.get(flowId);
      if (!flow) {
        return {
          callbackMode: "manual",
          flowId,
          issues: [
            {
              code: "login-flow-missing",
              message: "Login flow was not found.",
              remediation: "Start a new Lark login flow.",
            },
          ],
          status: "failed",
        };
      }
      return redactDashboardPayload(flow);
    },
    async logout() {
      await input.authStore.delete();
      return { auth: await projectAuthState(input.authStore) };
    },
    async startLogin(options = {}) {
      const app = input.configStore.getLarkApp();
      if (!app?.appId) {
        return {
          callbackMode: "manual",
          flowId: crypto.randomUUID(),
          issues: [
            {
              code: "missing-lark-app",
              message: "Lark app settings are missing.",
              remediation: "Save Lark app id and secret on the config page.",
            },
          ],
          status: "failed",
        };
      }

      const flowId = crypto.randomUUID();
      const localRedirect = app.redirectUri
        ? parseLocalRedirectUri(app.redirectUri)
        : undefined;
      const useLocalCallback =
        options.callbackMode === "local" && (!app.redirectUri || localRedirect);
      const flowIssues: Issue[] = [];
      const localSso = useLocalCallback
        ? await createLocalSsoServer({
            host: localRedirect?.host,
            port: localRedirect?.port ?? app.callbackPort,
            redirectPath: localRedirect?.redirectPath,
          }).catch((error) => {
            flowIssues.push({
              code: "login-callback-unavailable",
              message: error instanceof Error ? error.message : String(error),
              remediation:
                "Use the authorization URL manually or free the configured callback port.",
            });
            return undefined;
          })
        : undefined;
      const redirectUri =
        localSso?.redirectUri ??
        app.redirectUri ??
        `http://127.0.0.1:${app.callbackPort}/callback`;
      const authorizationUrl = createSsoAuthorizationUrl({
        appId: app.appId,
        domain: app.domain,
        redirectUri,
        scopes: options.scopes ?? app.scopes,
        state: flowId,
      });
      const flow: LoginFlowView = {
        authorizationUrl,
        callbackMode: localSso ? "local-callback" : "manual",
        flowId,
        issues: flowIssues,
        status: "waiting",
      };
      flows.set(flowId, flow);

      if (options.openBrowser) {
        await open(authorizationUrl, { wait: false }).catch((error) => {
          flow.issues.push({
            code: "browser-open-failed",
            message: (error as Error).message,
            remediation: "Open the authorization URL manually.",
          });
        });
      }

      if (localSso) {
        void localSso
          .waitForCode({
            authorizationUrl,
            timeoutMs: options.timeoutMs,
          })
          .then(async ({ code }) => {
            const exchanged = await exchangeAuthorizationCode({
              appId: app.appId,
              appSecret: app.appSecret,
              code,
              domain: app.domain,
            });
            await input.authStore.write(
              createAuthSession({
                accessToken: exchanged.accessToken,
                accountLabel: exchanged.accountLabel,
                appIdentity: app.appId,
                domain: app.domain,
                expiresAt: exchanged.expiresAt,
                refreshExpiresAt: exchanged.refreshExpiresAt,
                refreshToken: exchanged.refreshToken,
                scopes: exchanged.scopes ?? app.scopes,
                storagePath: input.authStore.path,
              }),
            );
            flow.status = "ready";
          })
          .catch((error) => {
            flow.status = "failed";
            flow.issues.push({
              code: "login-flow-failed",
              message: error instanceof Error ? error.message : String(error),
              remediation: "Start a new login flow and retry authorization.",
            });
          });
      }

      return redactDashboardPayload(flow);
    },
  };
}
