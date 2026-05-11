import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  readSelection,
  writeSelection,
} from "../../src/triage/selection-state.js";
import { ConfigStore } from "../../src/config/store.js";
import { selectedBugFixture } from "../fixtures/research.js";

describe("selection state", () => {
  it("writes and reads selected bug snapshots", async () => {
    const store = new ConfigStore({
      cwd: await mkdtemp(join(tmpdir(), "selection-")),
    });

    writeSelection(store, selectedBugFixture);

    expect(readSelection(store)?.selectedRecordId).toBe("recLogin");
  });
});
