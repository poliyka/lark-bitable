import type {
  BitableRecord,
  BitableSource,
  LarkAuthSession,
} from "../config/schema.js";
import { normalizeOpenApiDomain } from "./auth.js";
import { normalizeBitableFieldInfo } from "./field-discovery.js";
import type { BitableFieldInfo } from "./field-discovery.js";
import { mapRecord } from "./record-mapper.js";

export interface LarkClientTransport {
  downloadMedia(input: {
    extra?: string;
    fileToken: string;
    outPath: string;
    range?: string;
  }): Promise<DownloadResult>;
  getRecord(input: {
    appToken: string;
    tableId: string;
    recordId: string;
  }): Promise<{ fields?: Record<string, unknown>; record_id?: string }>;
  listFields(input: { appToken: string; tableId: string }): Promise<
    Array<{
      field_name: string;
      property?: {
        options?: Array<{ color?: number; id?: string; name?: string }>;
      };
      type?: number;
      ui_type?: string;
    }>
  >;
  listRecords(input: {
    appToken: string;
    pageToken?: string;
    pageSize?: number;
    tableId: string;
    viewId?: string;
  }): Promise<{
    hasMore?: boolean;
    items: Array<{ fields?: Record<string, unknown>; record_id?: string }>;
    pageToken?: string;
  }>;
}

export interface DownloadResult {
  contentDisposition?: string;
  contentType?: string;
  outPath: string;
}

export interface LarkSdkTransportOptions {
  sdk?: LarkBitableSdk;
}

export interface LarkBitableSdk {
  bitable: {
    appTableField: {
      list(
        payload: {
          params?: {
            page_size?: number;
            page_token?: string;
            text_field_as_array?: boolean;
            view_id?: string;
          };
          path: { app_token: string; table_id: string };
        },
        options?: unknown,
      ): Promise<{
        code?: number;
        data?: {
          items?: Array<{ field_name: string; type?: number }>;
          page_token?: string;
        };
        msg?: string;
      }>;
    };
    appTableRecord: {
      get(
        payload: {
          params?: {
            automatic_fields?: boolean;
            text_field_as_array?: boolean;
          };
          path: {
            app_token: string;
            record_id: string;
            table_id: string;
          };
        },
        options?: unknown,
      ): Promise<{
        code?: number;
        data?: {
          record?: { fields?: Record<string, unknown>; record_id?: string };
        };
        msg?: string;
      }>;
      list(
        payload: {
          params?: {
            automatic_fields?: boolean;
            page_size?: number;
            page_token?: string;
            text_field_as_array?: boolean;
            view_id?: string;
          };
          path: { app_token: string; table_id: string };
        },
        options?: unknown,
      ): Promise<{
        code?: number;
        data?: {
          has_more?: boolean;
          items?: Array<{
            fields?: Record<string, unknown>;
            record_id?: string;
          }>;
          page_token?: string;
        };
        msg?: string;
      }>;
    };
  };
  drive?: {
    media?: {
      download(
        payload: {
          params?: {
            extra?: string;
          };
          path: { file_token: string };
        },
        options?: unknown,
      ): Promise<{
        headers?: Record<string, string | string[] | undefined>;
        writeFile(filePath: string): Promise<unknown>;
      }>;
    };
  };
}

function assertOk(
  response: { code?: number; msg?: string },
  operation: string,
) {
  if (response.code && response.code !== 0) {
    throw new Error(
      response.msg ?? `Lark ${operation} failed with code ${response.code}`,
    );
  }
}

async function createDefaultBitableSdk(
  session: LarkAuthSession,
): Promise<LarkBitableSdk> {
  const { Client, LoggerLevel } = await import("@larksuiteoapi/node-sdk");
  return new Client({
    appId: session.appIdentity ?? "lark-bitable-cli",
    appSecret: "unused-for-user-access-token",
    disableTokenCache: true,
    domain: normalizeOpenApiDomain(session.domain),
    loggerLevel: LoggerLevel.error,
    source: "hybrid-im-qa-lark-cli",
  }) as unknown as LarkBitableSdk;
}

export function createUserAccessTokenOptions(accessToken: string): {
  headers: { Authorization: string };
} {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

export function createLarkSdkTransport(
  session: LarkAuthSession,
  options: LarkSdkTransportOptions = {},
): LarkClientTransport {
  let sdkPromise: Promise<LarkBitableSdk> | undefined;
  const sdk = async () => {
    sdkPromise ??= Promise.resolve(
      options.sdk ?? createDefaultBitableSdk(session),
    );
    return sdkPromise;
  };
  const tokenOptions = createUserAccessTokenOptions(session.accessToken);

  return {
    async downloadMedia(input) {
      const response = await (
        await sdk()
      ).drive?.media?.download(
        {
          params: {
            extra: input.extra,
          },
          path: {
            file_token: input.fileToken,
          },
        },
        {
          ...tokenOptions,
          headers: {
            ...tokenOptions.headers,
            ...(input.range ? { Range: input.range } : {}),
          },
        },
      );
      if (!response) {
        throw new Error("Lark media download is unavailable in the SDK");
      }
      await response.writeFile(input.outPath);
      return {
        contentDisposition: headerValue(
          response.headers?.["content-disposition"],
        ),
        contentType: headerValue(response.headers?.["content-type"]),
        outPath: input.outPath,
      };
    },
    async getRecord(input) {
      const response = await (
        await sdk()
      ).bitable.appTableRecord.get(
        {
          params: {
            automatic_fields: true,
            text_field_as_array: false,
          },
          path: {
            app_token: input.appToken,
            table_id: input.tableId,
            record_id: input.recordId,
          },
        },
        tokenOptions,
      );
      assertOk(response, "record get");
      return response.data?.record ?? { record_id: input.recordId, fields: {} };
    },
    async listFields(input) {
      const response = await (
        await sdk()
      ).bitable.appTableField.list(
        {
          params: {
            page_size: 100,
            text_field_as_array: false,
          },
          path: {
            app_token: input.appToken,
            table_id: input.tableId,
          },
        },
        tokenOptions,
      );
      assertOk(response, "field list");
      return response.data?.items ?? [];
    },
    async listRecords(input) {
      const response = await (
        await sdk()
      ).bitable.appTableRecord.list(
        {
          params: {
            automatic_fields: true,
            page_size: input.pageSize,
            page_token: input.pageToken,
            text_field_as_array: false,
            view_id: input.viewId,
          },
          path: {
            app_token: input.appToken,
            table_id: input.tableId,
          },
        },
        tokenOptions,
      );
      assertOk(response, "record list");
      return {
        hasMore: response.data?.has_more,
        items: response.data?.items ?? [],
        pageToken: response.data?.page_token,
      };
    },
  };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

export class LarkClient {
  constructor(private readonly transport: LarkClientTransport) {}

  async downloadMedia(input: {
    extra?: string;
    fileToken: string;
    outPath: string;
    range?: string;
  }): Promise<DownloadResult> {
    return this.transport.downloadMedia(input);
  }

  async listFields(source: BitableSource) {
    const fields = await this.transport.listFields({
      appToken: source.appToken,
      tableId: source.tableId,
    });
    return fields
      .map((field) => normalizeBitableFieldInfo(field))
      .filter((field): field is BitableFieldInfo => Boolean(field));
  }

  async listRecords(
    source: BitableSource,
    options: { limit?: number; pageSize?: number } = {},
  ): Promise<BitableRecord[]> {
    const records: BitableRecord[] = [];
    let pageToken: string | undefined;
    const pageSize = options.pageSize ?? Math.min(options.limit ?? 100, 100);

    do {
      const page = await this.transport.listRecords({
        appToken: source.appToken,
        tableId: source.tableId,
        viewId: source.viewId,
        pageSize,
        pageToken,
      });
      const retrievedAt = new Date().toISOString();
      records.push(
        ...page.items.map((item) =>
          mapRecord({
            ...item,
            source: {
              appToken: source.appToken,
              tableId: source.tableId,
              viewId: source.viewId,
              retrievedAt,
            },
          }),
        ),
      );
      pageToken = page.pageToken;
    } while (pageToken && (!options.limit || records.length < options.limit));

    return options.limit ? records.slice(0, options.limit) : records;
  }

  async getRecord(
    source: BitableSource,
    recordId: string,
  ): Promise<BitableRecord> {
    const item = await this.transport.getRecord({
      appToken: source.appToken,
      tableId: source.tableId,
      recordId,
    });
    return mapRecord({
      ...item,
      record_id: item.record_id ?? recordId,
      source: {
        appToken: source.appToken,
        tableId: source.tableId,
        viewId: source.viewId,
        retrievedAt: new Date().toISOString(),
      },
    });
  }
}
