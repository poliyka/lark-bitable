import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { CliError } from "../cli/errors.js";

export interface LocalSsoCallbackInput {
  authorizationUrl: string;
  mockCode?: string;
  timeoutMs?: number;
}

export interface LocalSsoCallbackResult {
  code: string;
  method: "local-callback" | "provided-code";
}

export interface LocalSsoServer {
  origin: string;
  redirectUri: string;
  waitForCode(input: LocalSsoCallbackInput): Promise<LocalSsoCallbackResult>;
}

export async function createLocalSsoServer(
  input: {
    host?: "127.0.0.1" | "localhost";
    port?: number;
    redirectPath?: string;
  } = {},
): Promise<LocalSsoServer> {
  const host = input.host ?? "127.0.0.1";
  const port = input.port ?? 14543;
  const redirectPath = normalizeRedirectPath(input.redirectPath);
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;
  const origin = `http://${host}:${address.port}`;
  const redirectUri = `${origin}${redirectPath}`;

  return {
    origin,
    redirectUri,
    async waitForCode(input) {
      if (input.mockCode) {
        await closeServer(server);
        return {
          code: input.mockCode,
          method: "provided-code",
        };
      }

      return await new Promise<LocalSsoCallbackResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          void closeServer(server);
          reject(
            new CliError({
              code: "sso-callback-timeout",
              message: "Timed out waiting for the Lark SSO callback.",
              remediation:
                "Run lark-bitable lark --login again and complete login in the browser. If Lark shows error 20027 or says bitable:app:readonly is missing, open Lark Developer Console > Permissions, add the user-identity bitable:app:readonly permission, publish the app version, wait for enterprise approval if required, then retry login.",
            }),
          );
        }, input.timeoutMs ?? 180_000);

        server.on("request", (request, response) => {
          const url = new URL(request.url ?? "/", origin);
          if (url.pathname !== redirectPath) {
            response.writeHead(404);
            response.end("Not found");
            return;
          }

          const code = url.searchParams.get("code");
          if (!code) {
            response.writeHead(400, { "content-type": "text/plain" });
            response.end("Missing Lark callback code.");
            return;
          }

          clearTimeout(timer);
          response.writeHead(200, { "content-type": "text/plain" });
          response.end("Lark login completed. You can close this window.");
          void closeServer(server).then(() =>
            resolve({
              code,
              method: "local-callback",
            }),
          );
        });
      });
    },
  };
}

export function parseLocalRedirectUri(
  redirectUri: string,
):
  | { host: "127.0.0.1" | "localhost"; port: number; redirectPath: string }
  | undefined {
  const url = new URL(redirectUri);
  if (
    url.protocol !== "http:" ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
  ) {
    return undefined;
  }
  const port = Number.parseInt(url.port, 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    return undefined;
  }
  return {
    host: url.hostname === "localhost" ? "localhost" : "127.0.0.1",
    port,
    redirectPath: normalizeRedirectPath(url.pathname),
  };
}

function normalizeRedirectPath(path = "/callback"): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/callback";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function closeServer(server: ReturnType<typeof createServer>) {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
