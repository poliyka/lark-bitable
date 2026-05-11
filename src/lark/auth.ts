import { authSessionSchema, type LarkAuthSession } from "../config/schema.js";

export interface LoginInput {
  accessToken: string;
  accountLabel?: string;
  appIdentity?: string;
  domain?: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
  refreshToken?: string;
  scopes?: string[];
  storagePath: string;
}

export interface TokenExchangeInput {
  appId?: string;
  appSecret?: string;
  code: string;
  domain?: string;
  httpPost?: LarkAuthHttpPost;
  mockAccessToken?: string;
  mockRefreshToken?: string;
  sdk?: LarkAuthSdk;
}

export interface SsoAuthorizationUrlInput {
  appId: string;
  codeChallenge?: string;
  codeChallengeMethod?: "plain" | "S256";
  domain?: string;
  redirectUri: string;
  scopes?: string[];
  state?: string;
}

export interface TokenRefreshInput {
  appId?: string;
  appSecret?: string;
  domain?: string;
  httpPost?: LarkAuthHttpPost;
  refreshToken: string;
  sdk?: LarkAuthSdk;
}

export interface TokenExchangeResult {
  accessToken: string;
  accountLabel?: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
  refreshToken?: string;
  scopes?: string[];
}

export interface LarkAuthSdk {
  authen: {
    accessToken: {
      create(input: {
        data: { code: string; grant_type: "authorization_code" };
      }): Promise<LarkAuthResponse>;
    };
    refreshAccessToken: {
      create(input: {
        data: { grant_type: "refresh_token"; refresh_token: string };
      }): Promise<LarkAuthResponse>;
    };
  };
}

interface LarkAuthResponse {
  code?: number;
  data?: {
    access_token?: string;
    email?: string;
    en_name?: string;
    enterprise_email?: string;
    expires_in?: number;
    mobile?: string;
    name?: string;
    open_id?: string;
    refresh_expires_in?: number;
    refresh_token?: string;
    scope?: string;
    user_id?: string;
  };
  msg?: string;
}

export type LarkAuthHttpPost = (
  url: string,
  body: Record<string, string>,
) => Promise<LarkAuthResponse>;

function expirationFromNow(seconds: number | undefined): string | undefined {
  if (!seconds) return undefined;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function accountLabelFrom(data: LarkAuthResponse["data"]): string | undefined {
  return (
    data?.email ??
    data?.enterprise_email ??
    data?.name ??
    data?.en_name ??
    data?.user_id ??
    data?.open_id ??
    data?.mobile
  );
}

export function normalizeOpenApiDomain(domain?: string): string {
  if (
    !domain ||
    domain === "larksuite.com" ||
    domain.endsWith(".larksuite.com")
  ) {
    return "https://open.larksuite.com";
  }
  if (domain === "feishu.cn" || domain.endsWith(".feishu.cn")) {
    return "https://open.feishu.cn";
  }
  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return domain;
  }
  return `https://${domain}`;
}

export function normalizeAccountsDomain(domain?: string): string {
  if (
    !domain ||
    domain === "larksuite.com" ||
    domain.endsWith(".larksuite.com")
  ) {
    return "https://accounts.larksuite.com";
  }
  if (domain === "feishu.cn" || domain.endsWith(".feishu.cn")) {
    return "https://accounts.feishu.cn";
  }
  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return domain;
  }
  return `https://${domain}`;
}

export function createSsoAuthorizationUrl(
  input: SsoAuthorizationUrlInput,
): string {
  const url = new URL(
    "/open-apis/authen/v1/authorize",
    normalizeAccountsDomain(input.domain),
  );
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  if (input.scopes?.length) {
    url.searchParams.set("scope", input.scopes.join(" "));
  }
  if (input.state) {
    url.searchParams.set("state", input.state);
  }
  if (input.codeChallenge) {
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set(
      "code_challenge_method",
      input.codeChallengeMethod ?? "S256",
    );
  }
  return url.toString();
}

async function createDefaultAuthSdk(input: {
  appId?: string;
  appSecret?: string;
  domain?: string;
}): Promise<LarkAuthSdk> {
  if (!input.appId || !input.appSecret) {
    throw new Error(
      "Lark app credentials are required for live login. Set LARK_APP_ID and LARK_APP_SECRET, or pass --app-id and --app-secret to lark-bitable lark --login.",
    );
  }

  const { Client, LoggerLevel } = await import("@larksuiteoapi/node-sdk");
  return new Client({
    appId: input.appId,
    appSecret: input.appSecret,
    domain: normalizeOpenApiDomain(input.domain),
    loggerLevel: LoggerLevel.error,
    source: "hybrid-im-qa-lark-cli",
  }) as unknown as LarkAuthSdk;
}

function parseAuthResponse(response: LarkAuthResponse): TokenExchangeResult {
  if (response.code && response.code !== 0) {
    throw new Error(
      response.msg ?? `Lark auth failed with code ${response.code}`,
    );
  }

  if (!response.data?.access_token) {
    throw new Error("Lark auth response did not include an access token.");
  }

  return {
    accessToken: response.data.access_token,
    accountLabel: accountLabelFrom(response.data),
    expiresAt: expirationFromNow(response.data.expires_in),
    refreshExpiresAt: expirationFromNow(response.data.refresh_expires_in),
    refreshToken: response.data.refresh_token,
    scopes: response.data.scope
      ?.split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean),
  };
}

function isSdkCredentialShapeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("app id") ||
    message.includes("app_id") ||
    message.includes("app secret") ||
    message.includes("app_secret")
  );
}

async function defaultAuthHttpPost(
  url: string,
  body: Record<string, string>,
): Promise<LarkAuthResponse> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  return (await response.json()) as LarkAuthResponse;
}

async function directExchangeAuthorizationCode(input: {
  appId?: string;
  appSecret?: string;
  code: string;
  domain?: string;
  httpPost?: LarkAuthHttpPost;
}): Promise<TokenExchangeResult> {
  if (!input.appId || !input.appSecret) {
    throw new Error(
      "Lark app credentials are required for live login. Set LARK_APP_ID and LARK_APP_SECRET, or pass --app-id and --app-secret to lark-bitable lark --login.",
    );
  }

  const post = input.httpPost ?? defaultAuthHttpPost;
  return parseAuthResponse(
    await post(
      `${normalizeOpenApiDomain(input.domain)}/open-apis/authen/v1/access_token`,
      {
        app_id: input.appId,
        app_secret: input.appSecret,
        code: input.code,
        grant_type: "authorization_code",
      },
    ),
  );
}

async function directRefreshAuthorizationToken(input: {
  appId?: string;
  appSecret?: string;
  domain?: string;
  httpPost?: LarkAuthHttpPost;
  refreshToken: string;
}): Promise<TokenExchangeResult> {
  if (!input.appId || !input.appSecret) {
    throw new Error(
      "Lark app credentials are required for token refresh. Set LARK_APP_ID and LARK_APP_SECRET, or run lark-bitable lark --login again.",
    );
  }

  const post = input.httpPost ?? defaultAuthHttpPost;
  return parseAuthResponse(
    await post(
      `${normalizeOpenApiDomain(input.domain)}/open-apis/authen/v1/refresh_access_token`,
      {
        app_id: input.appId,
        app_secret: input.appSecret,
        grant_type: "refresh_token",
        refresh_token: input.refreshToken,
      },
    ),
  );
}

export async function exchangeAuthorizationCode(
  input: TokenExchangeInput,
): Promise<TokenExchangeResult> {
  if (input.mockAccessToken) {
    return {
      accessToken: input.mockAccessToken,
      refreshToken: input.mockRefreshToken,
    };
  }

  if (!input.sdk && input.httpPost) {
    return directExchangeAuthorizationCode(input);
  }

  try {
    const sdk =
      input.sdk ??
      (await createDefaultAuthSdk({
        appId: input.appId,
        appSecret: input.appSecret,
        domain: input.domain,
      }));
    return parseAuthResponse(
      await sdk.authen.accessToken.create({
        data: {
          grant_type: "authorization_code",
          code: input.code,
        },
      }),
    );
  } catch (error) {
    if (!input.sdk && isSdkCredentialShapeError(error)) {
      return directExchangeAuthorizationCode(input);
    }
    throw error;
  }
}

export async function refreshAuthorizationToken(
  input: TokenRefreshInput,
): Promise<TokenExchangeResult> {
  if (!input.sdk && input.httpPost) {
    return directRefreshAuthorizationToken(input);
  }

  try {
    const sdk =
      input.sdk ??
      (await createDefaultAuthSdk({
        appId: input.appId,
        appSecret: input.appSecret,
        domain: input.domain,
      }));
    return parseAuthResponse(
      await sdk.authen.refreshAccessToken.create({
        data: {
          grant_type: "refresh_token",
          refresh_token: input.refreshToken,
        },
      }),
    );
  } catch (error) {
    if (!input.sdk && isSdkCredentialShapeError(error)) {
      return directRefreshAuthorizationToken(input);
    }
    throw error;
  }
}

export function createAuthSession(input: LoginInput): LarkAuthSession {
  return authSessionSchema.parse({
    storagePath: input.storagePath,
    domain: input.domain,
    accountLabel: input.accountLabel,
    appIdentity: input.appIdentity,
    scopes: input.scopes ?? ["bitable:app:readonly"],
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt:
      input.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    refreshExpiresAt: input.refreshExpiresAt,
    status: "ready",
    updatedAt: new Date().toISOString(),
  });
}

export function authStatusFor(session: LarkAuthSession | undefined): {
  status: "ready" | "missing" | "expired" | "invalid" | "insufficient-scope";
  shouldRelogin: boolean;
} {
  if (!session) return { status: "missing", shouldRelogin: true };
  if (session.status !== "ready") {
    return {
      status: session.status,
      shouldRelogin: session.status !== "expired" || !session.refreshToken,
    };
  }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    return {
      status: session.refreshToken ? "expired" : "invalid",
      shouldRelogin: !session.refreshToken,
    };
  }
  return { status: "ready", shouldRelogin: false };
}
