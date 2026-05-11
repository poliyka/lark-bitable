import { describe, expect, it } from "vitest";

import { CliError } from "../../src/cli/errors.js";
import { parseBitableUrl } from "../../src/lark/url-parser.js";

describe("parseBitableUrl", () => {
  it("accepts a valid Lark Base URL with table and view", () => {
    expect(
      parseBitableUrl(
        "https://u5ijellsw5.sg.larksuite.com/base/TypDbjKBfaJcaSsoEI1lZjHsgIY?table=tblp8ig36Itp0yOU&view=vewb6FrjBe",
      ),
    ).toMatchObject({
      appToken: "TypDbjKBfaJcaSsoEI1lZjHsgIY",
      tableId: "tblp8ig36Itp0yOU",
      viewId: "vewb6FrjBe",
    });
  });

  it("rejects URLs missing table id, app token, or Lark domain", () => {
    expect(() =>
      parseBitableUrl("https://example.com/base/app?table=tbl"),
    ).toThrow(CliError);
    expect(() =>
      parseBitableUrl("https://example.larksuite.com/base/app"),
    ).toThrow("table id");
    expect(() =>
      parseBitableUrl("https://example.larksuite.com/base?table=tbl"),
    ).toThrow("app token");
  });
});
