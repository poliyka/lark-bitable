# Human-Readable Command Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every non-`--json` command render `data` in readable tables or compact human-readable sections instead of one-line JSON.

**Architecture:** Keep all command behavior centralized in `src/cli/output.ts`. Preserve the existing normalized JSON contract for `--json`; only replace the human renderer's `data:` line with shape-aware sections backed by `cli-table3`.

**Tech Stack:** TypeScript 5.9, Node >=22, Vitest, oclif, `cli-table3`.

---

### Task 1: Add Failing Human Output Tests

**Files:**

- Modify: `tests/unit/output.test.ts`

- [ ] **Step 1: Add tests for table-backed data output**

Add assertions that `formatHuman()` renders common command data shapes as readable output:

```ts
it("renders record arrays as a readable table in human output", () => {
  const human = formatHuman({
    command: "list",
    status: "ok",
    data: {
      records: [
        {
          recordId: "recLogin",
          fields: {
            標題: "Login error",
            狀態: "待處理",
            優先級: "P0",
          },
          source: {
            appToken: "app",
            tableId: "tbl",
            retrievedAt: "2026-05-20T00:00:00.000Z",
          },
          matchedFields: ["標題"],
        },
      ],
    },
  });

  expect(human).toContain("data.records:");
  expect(human).toContain("┌");
  expect(human).toContain("recordId");
  expect(human).toContain("recLogin");
  expect(human).toContain("Login error");
  expect(human).not.toContain('data: {"records"');
});

it("renders schema fields as a readable table in human output", () => {
  const human = formatHuman({
    command: "schema",
    status: "ok",
    data: {
      fields: [
        {
          fieldName: "狀態",
          type: 3,
          uiType: "SingleSelect",
          options: [{ name: "待處理" }, { name: "完成" }],
          nonEmptyInSample: 2,
          observedValues: ["待處理", "完成"],
        },
      ],
    },
  });

  expect(human).toContain("data.fields:");
  expect(human).toContain("fieldName");
  expect(human).toContain("SingleSelect");
  expect(human).toContain("待處理, 完成");
});

it("summarizes long report strings instead of dumping markdown into human output", () => {
  const human = formatHuman({
    command: "research",
    status: "ok",
    data: {
      report: "# Report\n\n".repeat(80),
      reportPath: "/tmp/current-research.json",
    },
  });

  expect(human).toContain("data:");
  expect(human).toContain("reportPath: /tmp/current-research.json");
  expect(human).toContain("report: (omitted");
  expect(human.length).toBeLessThan(1000);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm test tests/unit/output.test.ts
```

Expected: FAIL because `formatHuman()` still emits `data: {"records"...}` and no table sections.

### Task 2: Add Table Renderer Dependency and Implementation

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/cli/output.ts`

- [ ] **Step 1: Add dependency**

Run:

```bash
pnpm add cli-table3
```

- [ ] **Step 2: Implement minimal shape-aware human data renderer**

Update `src/cli/output.ts` so `formatHuman()` calls a helper when `normalized.data !== null`:

```ts
const renderedData = renderHumanData(normalized.data);
if (renderedData.length > 0) lines.push(...renderedData);
```

Add focused helpers:

```ts
function renderHumanData(data: unknown): string[] {
  if (!isRecord(data)) return [`data: ${renderScalar(data)}`];

  const lines = ["data:"];
  for (const [key, value] of Object.entries(data)) {
    lines.push(...renderDataEntry(`data.${key}`, value));
  }
  return lines;
}
```

The implementation must:

- Render arrays of records/candidates/fields/field changes/evidence/issues as `cli-table3` tables.
- Render compact key-value output for small objects and scalar values.
- Replace long multiline strings such as `report` with `(omitted, N chars)` while keeping path fields visible.
- Keep existing `redactSecrets()` wrapping on the final joined human output.

- [ ] **Step 3: Run targeted tests and verify GREEN**

Run:

```bash
pnpm test tests/unit/output.test.ts
```

Expected: PASS.

### Task 3: Validation and Cleanup

**Files:**

- Modify only files touched by Tasks 1 and 2 unless tests reveal a directly related issue.

- [ ] **Step 1: Format the repository**

Run:

```bash
pnpm format:fix
```

Expected: Prettier completes without errors.

- [ ] **Step 2: Run full validation**

Run:

```bash
pnpm test
pnpm build
```

Expected: Both commands pass.

- [ ] **Step 3: Run repo quality gate**

Use the configured TypeScript/Node review flow after formatting and tests. Fix confirmed issues before finalizing.
