import { describe, expect, it, vi } from "vitest";

import {
  LarkClient,
  createLarkSdkTransport,
  type LarkClientTransport,
} from "../../src/lark/client.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureSource } from "../fixtures/lark.js";

describe("LarkClient", () => {
  it("lists fields and paginated records through the transport seam", async () => {
    const transport: LarkClientTransport = {
      async downloadMedia(input) {
        return { outPath: input.outPath };
      },
      async getRecord() {
        return { record_id: "recA", fields: { title: "A" } };
      },
      async listFields() {
        return [{ field_name: "title", type: 1 }];
      },
      async listRecords(input) {
        if (!input.pageToken) {
          return {
            items: [{ record_id: "recA", fields: { title: "A" } }],
            pageToken: "next",
          };
        }
        return {
          items: [{ record_id: "recB", fields: { title: "B" } }],
        };
      },
    };

    const client = new LarkClient(transport);

    expect(await client.listFields(fixtureSource)).toHaveLength(1);
    expect(await client.listRecords(fixtureSource)).toHaveLength(2);
    expect((await client.getRecord(fixtureSource, "recA")).recordId).toBe(
      "recA",
    );
  });

  it("limits records across pages", async () => {
    const transport: LarkClientTransport = {
      async downloadMedia(input) {
        return { outPath: input.outPath };
      },
      async getRecord() {
        return { record_id: "recA", fields: {} };
      },
      async listFields() {
        return [];
      },
      async listRecords() {
        return {
          items: [
            { record_id: "recA", fields: {} },
            { record_id: "recB", fields: {} },
          ],
        };
      },
    };

    expect(
      await new LarkClient(transport).listRecords(fixtureSource, { limit: 1 }),
    ).toHaveLength(1);
  });

  it("adapts official SDK Bitable APIs with a stored user access token", async () => {
    const requests: Array<{
      options: unknown;
      payload: unknown;
      target: string;
    }> = [];
    const sdk = {
      bitable: {
        appTableField: {
          async list(payload: unknown, options: unknown) {
            requests.push({ target: "fields", payload, options });
            return {
              code: 0,
              data: {
                items: [{ field_name: "標題", type: 1 }],
              },
            };
          },
        },
        appTableRecord: {
          async get(payload: unknown, options: unknown) {
            requests.push({ target: "get", payload, options });
            return {
              code: 0,
              data: {
                record: { record_id: "recLive", fields: { 標題: "Live bug" } },
              },
            };
          },
          async list(payload: unknown, options: unknown) {
            requests.push({ target: "records", payload, options });
            return {
              code: 0,
              data: {
                has_more: false,
                items: [{ record_id: "recLive", fields: { 標題: "Live bug" } }],
              },
            };
          },
        },
      },
    };

    const transport = createLarkSdkTransport(readyAuthSession, { sdk });
    const client = new LarkClient(transport);

    expect(await client.listFields(fixtureSource)).toEqual([
      { fieldName: "標題", type: 1 },
    ]);
    expect(await client.listRecords(fixtureSource, { limit: 1 })).toHaveLength(
      1,
    );
    expect((await client.getRecord(fixtureSource, "recLive")).fields).toEqual({
      標題: "Live bug",
    });
    expect(JSON.stringify(requests)).toContain("TypDbjKBfaJcaSsoEI1lZjHsgIY");
    expect(JSON.stringify(requests)).toContain("tblp8ig36Itp0yOU");
    expect(JSON.stringify(requests)).toContain("Bearer access-secret");
  });

  it("downloads drive media with authenticated requests", async () => {
    const requests: Array<{
      options: unknown;
      payload: unknown;
    }> = [];
    const sdk = {
      drive: {
        media: {
          async download(payload: unknown, options: unknown) {
            requests.push({ payload, options });
            return {
              headers: {
                "content-disposition": "attachment; filename=image.png",
                "content-type": "image/png",
              },
              async writeFile() {
                return "written";
              },
            };
          },
        },
      },
    };

    const result = await new LarkClient(
      createLarkSdkTransport(readyAuthSession, { sdk: sdk as never }),
    ).downloadMedia({
      fileToken: "boxcnabcdefg",
      outPath: "/tmp/image.png",
      extra: "extra-value",
      range: "bytes=0-1024",
    });

    expect(result).toEqual({
      contentDisposition: "attachment; filename=image.png",
      contentType: "image/png",
      outPath: "/tmp/image.png",
    });
    expect(JSON.stringify(requests)).toContain("boxcnabcdefg");
    expect(JSON.stringify(requests)).toContain("Bearer access-secret");
    expect(JSON.stringify(requests)).toContain("bytes=0-1024");
    expect(JSON.stringify(requests)).toContain("extra-value");
  });

  it("normalizes stored Lark domains before constructing the official SDK", async () => {
    const constructedDomains: unknown[] = [];
    vi.doMock("@larksuiteoapi/node-sdk", () => ({
      Client: class {
        bitable = {
          appTableField: {
            async list() {
              return { code: 0, data: { items: [] } };
            },
          },
          appTableRecord: {
            async get() {
              return { code: 0, data: { record: { fields: {} } } };
            },
            async list() {
              return { code: 0, data: { has_more: false, items: [] } };
            },
          },
        };

        constructor(config: { domain?: string }) {
          constructedDomains.push(config.domain);
        }
      },
      LoggerLevel: { error: "error" },
    }));

    try {
      const transport = createLarkSdkTransport({
        ...readyAuthSession,
        domain: "larksuite.com",
      });

      await transport.listRecords({
        appToken: fixtureSource.appToken,
        tableId: fixtureSource.tableId,
      });

      expect(constructedDomains).toEqual(["https://open.larksuite.com"]);
    } finally {
      vi.doUnmock("@larksuiteoapi/node-sdk");
    }
  });
});
