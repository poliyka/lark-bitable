import { describe, expect, it } from "vitest";

import DashboardCommand from "../../src/cli/commands/dashboard.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";

describe("dashboard command", () => {
  it("emits JSON startup output and does not require dashboard login", async () => {
    const paths = await createDashboardTestPaths("dashboard-command-");

    const result = await DashboardCommand.run([
      "--audit-path",
      paths.auditPath,
      "--auth-path",
      paths.authPath,
      "--config-cwd",
      paths.configCwd,
      "--json",
      "--no-open",
      "--port",
      "0",
      "--research-dir",
      paths.researchDir,
      "--shutdown-after-ms",
      "1",
    ]);

    expect(result.command).toBe("dashboard");
    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      dashboardLoginRequired: false,
      localOnly: true,
      opened: false,
    });
    expect(result.data?.binding.origin).toContain("http://127.0.0.1:");
  });
});
