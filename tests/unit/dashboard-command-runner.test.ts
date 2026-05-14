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

  it("keeps write preview-only unless explicitly confirmed", () => {
    const argv = buildCommandArgv({
      command: "write",
      confirmWrite: false,
      parameters: { fieldsJson: '{"標題":"x"}', op: "create" },
    });

    expect(argv).not.toContain("--confirm");
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
});
