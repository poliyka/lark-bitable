import { describe, expect, it } from "vitest";

import { runPlaygroundWorkflow } from "../../src/dashboard/playground-service.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";

describe("dashboard playground service", () => {
  it("guards confirmed writes unless the request explicitly opts in", async () => {
    const paths = await createDashboardTestPaths("dashboard-playground-");

    const result = await runPlaygroundWorkflow({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      command: "write",
      configCwd: paths.configCwd,
      confirmWrite: false,
      parameters: { confirm: true, fieldsJson: '{"標題":"x"}', op: "create" },
    });

    expect(result.status).toBe("partial");
    expect(result.issues[0]?.code).toBe("write-confirmation-required");
    expect(result.nextSafeActions[0]).toContain("preview");
  });
});
