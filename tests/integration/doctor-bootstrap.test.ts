import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import DoctorCommand from "../../src/cli/commands/doctor.js";

describe("doctor bootstrap status", () => {
  it("reports missing and installed bootstrap skill state", async () => {
    const skillDir = await mkdtemp(join(tmpdir(), "doctor-skill-"));

    const missing = await DoctorCommand.run([
      "--skill-dir",
      skillDir,
      "--json",
    ]);
    expect(JSON.stringify(missing)).toContain("missing-bootstrap");

    const installed = await DoctorCommand.run([
      "--skill-dir",
      skillDir,
      "--install-skill",
      "--json",
    ]);
    expect(JSON.stringify(installed)).toContain("bootstrapSkillInstalled");
    expect(JSON.stringify(installed)).toContain("true");
  });
});
