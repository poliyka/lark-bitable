import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import DoctorCommand from "../../src/cli/commands/doctor.js";
import { ConfigStore } from "../../src/config/store.js";
import { fixtureSource } from "../fixtures/lark.js";

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

  it("reports incomplete configure mappings when source exists without required bug fields", async () => {
    const skillDir = await mkdtemp(join(tmpdir(), "doctor-skill-"));
    const cwd = await mkdtemp(join(tmpdir(), "doctor-config-"));
    const authPath = join(cwd, "auth.json");
    const store = new ConfigStore({ cwd });

    store.setSource({
      ...fixtureSource,
      fieldAliases: {},
      priorityField: undefined,
      statusField: undefined,
    });

    const result = await DoctorCommand.run([
      "--skill-dir",
      skillDir,
      "--install-skill",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--json",
    ]);

    expect(result.data).toMatchObject({
      activeMode: "Developer",
      authPath,
      configPath: store.path,
      configureMappingsReady: false,
      modeSource: "defaulted",
      sourceConfigured: true,
    });
    expect(result.mode).toMatchObject({
      active: "Developer",
      source: "defaulted",
    });
    expect(result.data?.missingConfigureMappings).toEqual(
      expect.arrayContaining(["status-field", "priority-field", "title-field"]),
    );
    expect(JSON.stringify(result)).toContain("incomplete-configure");
  });
});
