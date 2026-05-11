import { describe, expect, it } from "vitest";

import {
  discoverBitableFieldsWithAppCredentials,
  discoverBitableFieldValuesWithAppCredentials,
} from "../../src/lark/field-discovery.js";

describe("field discovery", () => {
  it("uses app credentials to request a tenant token and list Bitable fields", async () => {
    const calls: Array<{ body?: unknown; headers?: unknown; url: string }> = [];

    const fields = await discoverBitableFieldsWithAppCredentials({
      appId: "cli-app",
      appSecret: "cli-secret",
      appToken: "app-token",
      http: async (url, init) => {
        calls.push({
          body: init?.body,
          headers: init?.headers,
          url: url.toString(),
        });

        if (url.toString().includes("tenant_access_token")) {
          return jsonResponse({
            code: 0,
            tenant_access_token: "tenant-token",
          });
        }

        return jsonResponse({
          code: 0,
          data: {
            has_more: false,
            items: [
              { field_name: "標題", type: 1 },
              {
                field_name: "狀態",
                property: {
                  options: [
                    { color: 0, id: "opt-1", name: "待處理" },
                    { color: 1, id: "opt-2", name: "處理中" },
                    { color: 2, id: "opt-3", name: "待處理" },
                    { color: 3, id: "opt-4", name: "  " },
                  ],
                },
                type: 3,
                ui_type: "SingleSelect",
              },
              { field_name: "狀態", type: 3 },
              { field_name: "  ", type: 1 },
            ],
          },
        });
      },
      tableId: "tbl",
    });

    expect(fields).toEqual([
      { fieldName: "標題", type: 1 },
      {
        fieldName: "狀態",
        options: [
          { color: 0, id: "opt-1", name: "待處理" },
          { color: 1, id: "opt-2", name: "處理中" },
        ],
        type: 3,
        uiType: "SingleSelect",
      },
    ]);
    expect(calls.map((call) => call.url)).toEqual([
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      "https://open.larksuite.com/open-apis/bitable/v1/apps/app-token/tables/tbl/fields?page_size=100",
    ]);
    expect(JSON.stringify(calls[0]?.body)).toContain("cli-app");
    expect(JSON.stringify(calls[0]?.body)).toContain("cli-secret");
    expect(JSON.stringify(calls[1]?.headers)).toContain("Bearer tenant-token");
  });

  it("returns paginated fields", async () => {
    const urls: string[] = [];

    const fields = await discoverBitableFieldsWithAppCredentials({
      appId: "cli-app",
      appSecret: "cli-secret",
      appToken: "app-token",
      http: async (url) => {
        urls.push(url.toString());
        if (url.toString().includes("tenant_access_token")) {
          return jsonResponse({
            code: 0,
            data: {
              tenant_access_token: "tenant-token",
            },
          });
        }
        if (!url.toString().includes("page_token=next-page")) {
          return jsonResponse({
            code: 0,
            data: {
              has_more: true,
              items: [{ field_name: "標題", type: 1 }],
              page_token: "next-page",
            },
          });
        }
        return jsonResponse({
          code: 0,
          data: {
            has_more: false,
            items: [{ field_name: "狀態", type: 3 }],
          },
        });
      },
      tableId: "tbl",
    });

    expect(fields.map((field) => field.fieldName)).toEqual(["標題", "狀態"]);
    expect(urls.at(-1)).toContain("page_token=next-page");
  });

  it("throws a sanitized error when Lark does not return a tenant token", async () => {
    await expect(
      discoverBitableFieldsWithAppCredentials({
        appId: "cli-app",
        appSecret: "cli-secret",
        appToken: "app-token",
        http: async () =>
          jsonResponse({
            code: 999,
            msg: "bad app_secret cli-secret",
          }),
        tableId: "tbl",
      }),
    ).rejects.toThrow("Lark tenant token request failed with code 999");
  });

  it("includes sanitized Lark error details when field list returns HTTP 400", async () => {
    await expect(
      discoverBitableFieldsWithAppCredentials({
        appId: "cli-app",
        appSecret: "cli-secret",
        appToken: "app-token",
        http: async (url) => {
          if (url.toString().includes("tenant_access_token")) {
            return jsonResponse({
              code: 0,
              tenant_access_token: "tenant-token",
            });
          }
          return jsonResponse(
            {
              code: 1254004,
              msg: "WrongTableId app_secret=cli-secret tenant_access_token=tenant-token",
            },
            400,
          );
        },
        tableId: "tbl",
      }),
    ).rejects.toThrow(
      "Lark field list failed with HTTP 400: code=1254004 msg=WrongTableId app_secret=[REDACTED] tenant_access_token=[REDACTED]",
    );
  });

  it("discovers distinct status values from table records", async () => {
    const urls: string[] = [];

    const values = await discoverBitableFieldValuesWithAppCredentials({
      appId: "cli-app",
      appSecret: "cli-secret",
      appToken: "app-token",
      fieldName: "狀態",
      http: async (url) => {
        urls.push(url.toString());
        if (url.toString().includes("tenant_access_token")) {
          return jsonResponse({
            code: 0,
            tenant_access_token: "tenant-token",
          });
        }
        return jsonResponse({
          code: 0,
          data: {
            has_more: false,
            items: [
              { fields: { 狀態: "待處理" }, record_id: "rec-1" },
              { fields: { 狀態: { text: "處理中" } }, record_id: "rec-2" },
              {
                fields: { 狀態: [{ name: "已完成" }, { text: "待處理" }] },
                record_id: "rec-3",
              },
              { fields: { 狀態: "  " }, record_id: "rec-4" },
            ],
          },
        });
      },
      tableId: "tbl",
      viewId: "vew",
    });

    expect(values).toEqual(["待處理", "處理中", "已完成"]);
    expect(urls.at(-1)).toBe(
      "https://open.larksuite.com/open-apis/bitable/v1/apps/app-token/tables/tbl/records?page_size=100&view_id=vew",
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });
}
