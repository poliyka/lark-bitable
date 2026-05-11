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
      async createRecord(input) {
        return { record_id: "recCreated", fields: input.fields };
      },
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
      async updateRecord(input) {
        return { record_id: input.recordId, fields: input.fields };
      },
    };

    const client = new LarkClient(transport);

    expect(
      await client.createRecord(
        fixtureSource,
        { title: "Created" },
        { clientToken: "token-1" },
      ),
    ).toMatchObject({
      recordId: "recCreated",
      fields: { title: "Created" },
    });
    expect(await client.listFields(fixtureSource)).toHaveLength(1);
    expect(await client.listRecords(fixtureSource)).toHaveLength(2);
    expect((await client.getRecord(fixtureSource, "recA")).recordId).toBe(
      "recA",
    );
    expect(
      await client.updateRecord(fixtureSource, "recA", { title: "Updated" }),
    ).toMatchObject({
      recordId: "recA",
      fields: { title: "Updated" },
    });
  });

  it("limits records across pages", async () => {
    const transport: LarkClientTransport = {
      async createRecord(input) {
        return { record_id: "recCreated", fields: input.fields };
      },
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
      async updateRecord(input) {
        return { record_id: input.recordId, fields: input.fields };
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
          async create(payload: unknown, options: unknown) {
            requests.push({ target: "create", payload, options });
            return {
              code: 0,
              data: {
                record: {
                  record_id: "recCreated",
                  fields: { 標題: "Created bug" },
                },
              },
            };
          },
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
          async update(payload: unknown, options: unknown) {
            requests.push({ target: "update", payload, options });
            return {
              code: 0,
              data: {
                record: {
                  record_id: "recLive",
                  fields: { 標題: "Updated bug" },
                },
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
    expect(
      await client.createRecord(
        fixtureSource,
        { 標題: "Created bug" },
        { clientToken: "create-token" },
      ),
    ).toMatchObject({
      recordId: "recCreated",
      fields: { 標題: "Created bug" },
    });
    expect(
      await client.updateRecord(fixtureSource, "recLive", {
        標題: "Updated bug",
      }),
    ).toMatchObject({
      recordId: "recLive",
      fields: { 標題: "Updated bug" },
    });
    expect(JSON.stringify(requests)).toContain("TypDbjKBfaJcaSsoEI1lZjHsgIY");
    expect(JSON.stringify(requests)).toContain("tblp8ig36Itp0yOU");
    expect(JSON.stringify(requests)).toContain("Bearer access-secret");
    expect(JSON.stringify(requests)).toContain("create-token");
    expect(requests.map((request) => request.target)).toEqual(
      expect.arrayContaining(["create", "update"]),
    );
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
            async create() {
              return { code: 0, data: { record: { record_id: "rec" } } };
            },
            async get() {
              return { code: 0, data: { record: { fields: {} } } };
            },
            async list() {
              return { code: 0, data: { has_more: false, items: [] } };
            },
            async update() {
              return { code: 0, data: { record: { record_id: "rec" } } };
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
