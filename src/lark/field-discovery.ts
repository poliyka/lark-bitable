import { normalizeOpenApiDomain } from "./auth.js";

export interface BitableFieldInfo {
  fieldName: string;
  options?: BitableFieldOption[];
  type?: number;
  uiType?: string;
}

export interface BitableFieldOption {
  color?: number;
  id?: string;
  name: string;
}

export interface RawBitableFieldInfo {
  field_name?: string;
  property?: {
    options?: Array<{ color?: number; id?: string; name?: string }>;
  };
  type?: number;
  ui_type?: string;
}

export interface FieldDiscoveryInput {
  appId: string;
  appSecret: string;
  appToken: string;
  domain?: string;
  http?: typeof fetch;
  tableId: string;
}

interface TenantTokenResponse {
  code?: number;
  data?: {
    tenant_access_token?: string;
  };
  msg?: string;
  tenant_access_token?: string;
}

interface FieldListResponse {
  code?: number;
  data?: {
    has_more?: boolean;
    items?: Array<{
      field_name?: string;
      property?: {
        options?: Array<{ color?: number; id?: string; name?: string }>;
      };
      type?: number;
      ui_type?: string;
    }>;
    page_token?: string;
  };
  msg?: string;
}

interface RecordListResponse {
  code?: number;
  data?: {
    has_more?: boolean;
    items?: Array<{ fields?: Record<string, unknown>; record_id?: string }>;
    page_token?: string;
  };
  msg?: string;
}

interface LarkErrorShape {
  code?: number;
  msg?: string;
}

export async function discoverBitableFieldsWithAppCredentials(
  input: FieldDiscoveryInput,
): Promise<BitableFieldInfo[]> {
  const http = input.http ?? fetch;
  const baseUrl = normalizeOpenApiDomain(input.domain);
  const tenantToken = await requestTenantToken(input, http, baseUrl);
  const fields: BitableFieldInfo[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(input.appToken)}/tables/${encodeURIComponent(input.tableId)}/fields`,
      baseUrl,
    );
    url.searchParams.set("page_size", "100");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const response = await parseJsonResponse<FieldListResponse>(
      await http(url, {
        headers: {
          authorization: `Bearer ${tenantToken}`,
        },
        method: "GET",
      }),
      "Lark field list",
    );
    assertLarkOk(response, "Lark field list");

    for (const item of response.data?.items ?? []) {
      const normalized = normalizeBitableFieldInfo(item);
      if (!normalized || seen.has(normalized.fieldName)) continue;
      seen.add(normalized.fieldName);
      fields.push(normalized);
    }

    pageToken =
      response.data?.has_more && response.data.page_token
        ? response.data.page_token
        : undefined;
  } while (pageToken);

  return fields;
}

export function normalizeBitableFieldInfo(
  item: RawBitableFieldInfo,
): BitableFieldInfo | undefined {
  const fieldName = item.field_name?.trim();
  if (!fieldName) return undefined;
  const options = normalizeFieldOptions(item.property?.options);
  return {
    fieldName,
    ...(options.length > 0 ? { options } : {}),
    type: item.type,
    ...(item.ui_type ? { uiType: item.ui_type } : {}),
  };
}

export async function discoverBitableFieldValuesWithAppCredentials(
  input: FieldDiscoveryInput & {
    fieldName: string;
    limit?: number;
    viewId?: string;
  },
): Promise<string[]> {
  const http = input.http ?? fetch;
  const baseUrl = normalizeOpenApiDomain(input.domain);
  const tenantToken = await requestTenantToken(input, http, baseUrl);
  const values = new Set<string>();
  let fetched = 0;
  let pageToken: string | undefined;
  const limit = input.limit ?? 100;

  do {
    const pageSize = Math.min(limit - fetched, 100);
    const url = new URL(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(input.appToken)}/tables/${encodeURIComponent(input.tableId)}/records`,
      baseUrl,
    );
    url.searchParams.set("page_size", String(pageSize));
    if (input.viewId) url.searchParams.set("view_id", input.viewId);
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const response = await parseJsonResponse<RecordListResponse>(
      await http(url, {
        headers: {
          authorization: `Bearer ${tenantToken}`,
        },
        method: "GET",
      }),
      "Lark record list",
    );
    assertLarkOk(response, "Lark record list");

    const items = response.data?.items ?? [];
    fetched += items.length;
    for (const item of items) {
      for (const value of normalizeFieldValueLabels(
        item.fields?.[input.fieldName],
      )) {
        values.add(value);
      }
    }

    pageToken =
      response.data?.has_more && response.data.page_token && fetched < limit
        ? response.data.page_token
        : undefined;
  } while (pageToken);

  return [...values];
}

async function requestTenantToken(
  input: Pick<FieldDiscoveryInput, "appId" | "appSecret">,
  http: typeof fetch,
  baseUrl: string,
): Promise<string> {
  const response = await parseJsonResponse<TenantTokenResponse>(
    await http(`${baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
      body: JSON.stringify({
        app_id: input.appId,
        app_secret: input.appSecret,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    }),
    "Lark tenant token request",
  );
  assertLarkOk(response, "Lark tenant token request");

  const token =
    response.tenant_access_token ?? response.data?.tenant_access_token;
  if (!token) {
    throw new Error("Lark tenant token request did not return a tenant token.");
  }
  return token;
}

function normalizeFieldOptions(
  options?: Array<{ color?: number; id?: string; name?: string }>,
): BitableFieldOption[] {
  const seen = new Set<string>();
  const normalized: BitableFieldOption[] = [];
  for (const option of options ?? []) {
    const name = option.name?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    normalized.push({
      ...(option.color === undefined ? {} : { color: option.color }),
      ...(option.id ? { id: option.id } : {}),
      name,
    });
  }
  return normalized;
}

function normalizeFieldValueLabels(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeFieldValueLabels(item));
  }
  if (value && typeof value === "object") {
    const labels: string[] = [];
    for (const key of ["text", "name", "value", "option_value"]) {
      const candidate = (value as Record<string, unknown>)[key];
      if (typeof candidate !== "string") continue;
      const trimmed = candidate.trim();
      if (trimmed) labels.push(trimmed);
    }
    return labels;
  }
  return [];
}

async function parseJsonResponse<T>(
  response: Response,
  operation: string,
): Promise<T> {
  const parsed = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(
      `${operation} failed with HTTP ${response.status}${formatLarkErrorDetails(parsed)}`,
    );
  }
  return parsed as T;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { msg: text };
  }
}

function formatLarkErrorDetails(response: unknown): string {
  const error = response as LarkErrorShape;
  const details: string[] = [];
  if (typeof error.code === "number") {
    details.push(`code=${error.code}`);
  }
  if (typeof error.msg === "string" && error.msg.trim()) {
    details.push(`msg=${sanitizeLarkDiagnostic(error.msg)}`);
  }
  return details.length > 0 ? `: ${details.join(" ")}` : "";
}

function assertLarkOk(response: LarkErrorShape, operation: string): void {
  if (response.code && response.code !== 0) {
    throw new Error(
      `${operation} failed with code ${response.code}${formatLarkErrorDetails(response)}`,
    );
  }
}

function sanitizeLarkDiagnostic(value: string): string {
  return value.replace(
    /(secret|token|authorization|access_token|refresh_token|tenant_access_token|app_secret)\s*[:=]\s*[^,\s]+/gi,
    "$1=[REDACTED]",
  );
}
