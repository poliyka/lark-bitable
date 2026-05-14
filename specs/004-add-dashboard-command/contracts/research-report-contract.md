# Research Report Contract

Canonical research reports are JSON files written under
`~/.lark-bitable/research/`.

## File Naming

Pattern:

```text
{safe-name}-{datetime}.json
```

Rules:

- `safe-name` is derived from an explicit report name when available, otherwise
  from selected record context or `research`.
- Unsafe filename characters are replaced.
- `datetime` is sortable and precise enough to avoid normal collisions.
- Existing canonical reports are never overwritten.

## JSON Shape

```json
{
  "schemaVersion": 1,
  "name": "selected-bug",
  "createdAt": "2026-05-14T00:00:00.000Z",
  "canonicalPath": "/Users/example/.lark-bitable/research/selected-bug-20260514T000000000Z.json",
  "outputLinkPath": "/Users/example/project/report.json",
  "outputLinkStatus": "linked",
  "selectionMode": "Developer",
  "selectedRecordId": "recxxxx",
  "ownerCriteria": null,
  "bugSummary": "Selected record: recxxxx",
  "observedFacts": ["Selected bug record: recxxxx [E1]"],
  "assumptions": ["Repository analysis is limited to provided evidence."],
  "analysis": ["Repository analysis has not been run."],
  "likelyCauses": ["Unconfirmed until reproduction evidence is collected."],
  "recommendedFixes": ["Inspect cited repository areas before editing."],
  "risks": ["Missing runtime reproduction can hide the actual cause."],
  "nextActions": ["Collect command-output evidence before implementation."],
  "evidence": [
    {
      "id": "E1",
      "type": "bug-record",
      "reference": "recxxxx",
      "excerpt": "{}",
      "collectedAt": "2026-05-14T00:00:00.000Z",
      "status": "verified"
    }
  ],
  "markdown": "# Selected Bug Research Report\n..."
}
```

## Link Status Values

- `none`: No output path was requested.
- `linked`: Requested output path is a symbolic link to the canonical report.
- `failed`: Link creation failed, but canonical report exists.
- `unsupported`: Platform or filesystem does not support the requested link.

## Evidence Rules

- Observed facts must cite evidence ids when they make factual claims.
- Assumptions must remain separate from observed facts.
- Likely causes remain unconfirmed unless evidence supports them.
- Dashboard rendering must preserve these sections instead of merging them.
- Redaction applies before writing visible secret-like strings.
