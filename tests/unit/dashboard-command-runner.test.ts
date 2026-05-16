import { dirname } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCommandArgv,
  runDashboardCommand,
} from "../../src/dashboard/command-runner.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";

describe("dashboard command runner", () => {
  it("allows supported workflows and shapes safe argv", () => {
    expect(
      buildCommandArgv({
        command: "valid",
        parameters: { workflow: "dashboard" },
      }),
    ).toContain("--workflow");

    expect(() => buildCommandArgv({ command: "lark", parameters: {} })).toThrow(
      "not supported",
    );
  });

  it("runs validation through the command boundary and redacts output", async () => {
    const paths = await createDashboardTestPaths("dashboard-runner-");
    const result = await runDashboardCommand({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      command: "valid",
      configCwd: paths.configCwd,
      parameters: { workflow: "dashboard" },
      timeoutMs: 5_000,
    });

    expect(result.command).toBe("valid");
    expect(result.structuredOutput.command).toBe("valid");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("runs dashboard commands even when the dashboard process cwd is the workspace parent", async () => {
    const paths = await createDashboardTestPaths("dashboard-runner-parent-");
    const originalCwd = process.cwd();
    process.chdir(dirname(originalCwd));
    try {
      const result = await runDashboardCommand({
        auditPath: paths.auditPath,
        authPath: paths.authPath,
        command: "valid",
        configCwd: paths.configCwd,
        parameters: { workflow: "dashboard" },
        timeoutMs: 5_000,
      });

      expect(result.command).toBe("valid");
      expect(result.structuredOutput.command).toBe("valid");
      expect(JSON.stringify(result)).not.toContain(
        "could not find package.json",
      );
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("keeps write preview-only unless explicitly confirmed", () => {
    const argv = buildCommandArgv({
      command: "write",
      confirmWrite: false,
      parameters: { fieldsJson: '{"標題":"x"}', op: "create" },
    });

    expect(argv).not.toContain("--confirm");
  });

  it("maps dashboard schema sampleLimit to the CLI --sample-limit flag", () => {
    expect(
      buildCommandArgv({
        command: "schema",
        parameters: { sampleLimit: 7 },
      }),
    ).toEqual(["--sample-limit", "7"]);
  });

  it("does not emit unsupported research flags from dashboard-only parameters", () => {
    expect(
      buildCommandArgv({
        command: "research",
        parameters: {
          name: "ignored",
          out: "report.json",
          recordId: "recA",
        },
      }),
    ).toEqual(["--out", "report.json"]);
  });

  it("maps dashboard research section rows to repeatable CLI section flags", () => {
    expect(
      buildCommandArgv({
        command: "research",
        parameters: {
          assumptions: ["OAuth config may differ in production."],
          evidence: ["repository-file:src/auth.ts:auth handler exists"],
          likelyCauses: ["Callback failure leaves loading state active [E2]"],
          nextActions: ["Run callback failure integration test."],
          originalDetails: ["Original ticket says callback never completes."],
          recommendedFixes: ["Reset loading state in failure branch [E2]"],
          risks: ["Could mask token refresh issue."],
          title: "OAuth callback research",
        },
      }),
    ).toEqual([
      "--assumption",
      "OAuth config may differ in production.",
      "--evidence",
      "repository-file:src/auth.ts:auth handler exists",
      "--likely-cause",
      "Callback failure leaves loading state active [E2]",
      "--next-action",
      "Run callback failure integration test.",
      "--original-detail",
      "Original ticket says callback never completes.",
      "--recommended-fix",
      "Reset loading state in failure branch [E2]",
      "--risk",
      "Could mask token refresh issue.",
      "--title",
      "OAuth callback research",
    ]);
  });

  it("passes write record ids as flags instead of positional arguments", () => {
    expect(
      buildCommandArgv({
        command: "write",
        parameters: {
          fieldsJson: '{"狀態":"處理中"}',
          op: "update",
          recordId: "recLogin",
        },
      }),
    ).toEqual([
      "--fields-json",
      '{"狀態":"處理中"}',
      "--op",
      "update",
      "--record-id",
      "recLogin",
    ]);
  });

  it("maps dashboard filter rows to repeatable CLI where filters", () => {
    expect(
      buildCommandArgv({
        command: "filter",
        parameters: {
          filters: [
            { field: "狀態", operator: "equals", value: "待處理" },
            { field: "標題", operator: "contains", value: "Login" },
          ],
          limit: 5,
        },
      }),
    ).toEqual([
      "--where",
      '{"field":"狀態","operator":"equals","value":"待處理"}',
      "--where",
      '{"field":"標題","operator":"contains","value":"Login"}',
      "--limit",
      "5",
    ]);
  });

  it("maps dashboard write key-value rows to fields-json", () => {
    expect(
      buildCommandArgv({
        command: "write",
        parameters: {
          fields: {
            狀態: "處理中",
            備註: "已確認重現",
          },
          op: "update",
          recordId: "recLogin",
        },
      }),
    ).toEqual([
      "--fields-json",
      '{"狀態":"處理中","備註":"已確認重現"}',
      "--op",
      "update",
      "--record-id",
      "recLogin",
    ]);
  });
});
