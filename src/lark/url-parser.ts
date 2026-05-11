import { CliError } from "../cli/errors.js";

export interface ParsedBitableUrl {
  appToken: string;
  tableId: string;
  viewId?: string;
  domain: string;
  sourceUrl: string;
}

const allowedHosts = [
  "larksuite.com",
  "feishu.cn",
  "larkoffice.com",
  "larksuite.cn",
];

export function parseBitableUrl(input: string): ParsedBitableUrl {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new CliError({
      code: "invalid-url",
      message: "The provided value is not a valid URL.",
      remediation:
        "Run configure with a Lark Base URL containing /base/<appToken>?table=<tableId>.",
    });
  }

  const hostAllowed = allowedHosts.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
  if (!hostAllowed) {
    throw new CliError({
      code: "invalid-lark-domain",
      message: "The URL is not a supported Lark or Feishu domain.",
      remediation: "Paste the original Lark Base/Bitable URL from the browser.",
    });
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const baseIndex = pathParts.findIndex((part) => part === "base");
  const appToken = baseIndex >= 0 ? pathParts[baseIndex + 1] : undefined;
  const tableId = url.searchParams.get("table") ?? undefined;
  const viewId = url.searchParams.get("view") ?? undefined;

  if (!appToken) {
    throw new CliError({
      code: "missing-app-token",
      message: "The URL does not include a Base app token.",
      remediation: "Use a URL with /base/<appToken>.",
    });
  }

  if (!tableId) {
    throw new CliError({
      code: "missing-table-id",
      message: "The URL does not include a table id.",
      remediation: "Use a URL with ?table=<tableId>.",
    });
  }

  return {
    appToken,
    tableId,
    viewId,
    domain: url.hostname,
    sourceUrl: url.toString(),
  };
}
