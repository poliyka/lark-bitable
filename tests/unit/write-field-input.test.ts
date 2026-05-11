import { describe, expect, it } from "vitest";

import { parseFieldInput } from "../../src/write/field-input.js";

describe("write field input parsing", () => {
  it("parses repeated field assignments and JSON scalar values", () => {
    expect(
      parseFieldInput({
        fieldAssignments: [
          "標題=Login error",
          "優先級=1",
          "啟用=true",
          '連結={"text":"Bug","link":"https://example.test/bug"}',
        ],
      }),
    ).toEqual({
      標題: "Login error",
      優先級: 1,
      啟用: true,
      連結: {
        text: "Bug",
        link: "https://example.test/bug",
      },
    });
  });

  it("merges structured fields-json values", () => {
    expect(
      parseFieldInput({
        fieldsJson: '{"標題":"Created by JSON","狀態":"待處理"}',
      }),
    ).toEqual({
      標題: "Created by JSON",
      狀態: "待處理",
    });
  });

  it("rejects malformed fields-json", () => {
    expect(() => parseFieldInput({ fieldsJson: '{"標題"' })).toThrow(
      "fields-json must be a valid JSON object",
    );
  });

  it("rejects empty field names and duplicate field names", () => {
    expect(() => parseFieldInput({ fieldAssignments: [" =value"] })).toThrow(
      "Field name cannot be empty",
    );

    expect(() =>
      parseFieldInput({
        fieldAssignments: ["標題=A"],
        fieldsJson: '{"標題":"B"}',
      }),
    ).toThrow("Duplicate field name: 標題");
  });
});
