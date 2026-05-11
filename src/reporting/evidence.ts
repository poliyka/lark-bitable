import type { ResearchEvidence } from "../config/schema.js";

let evidenceCounter = 0;

const secretPatterns: RegExp[] = [
  /\b(access[_-]?token|refresh[_-]?token|token)\s*[:=]\s*["']?[^"'\s]+/gi,
  /\b(accessToken|refreshToken)\s*[:=]\s*["']?[^"'\s]+/g,
];

export function redactSecrets(input: string): string {
  return secretPatterns.reduce(
    (value, pattern) => value.replace(pattern, "$1=[REDACTED]"),
    input,
  );
}

export function resetEvidenceIds(): void {
  evidenceCounter = 0;
}

export function toEvidence(
  input: Omit<ResearchEvidence, "id" | "collectedAt"> &
    Partial<Pick<ResearchEvidence, "id" | "collectedAt">>,
): ResearchEvidence {
  evidenceCounter += 1;
  return {
    id: input.id ?? `E${evidenceCounter}`,
    type: input.type,
    reference: input.reference,
    excerpt: redactSecrets(input.excerpt),
    collectedAt: input.collectedAt ?? new Date().toISOString(),
    status: input.status,
  };
}

export function dedupeEvidence(
  evidence: ResearchEvidence[],
): ResearchEvidence[] {
  const seen = new Set<string>();
  const deduped: ResearchEvidence[] = [];
  for (const item of evidence) {
    const key =
      item.id ??
      [
        item.type,
        item.reference,
        item.status,
        item.excerpt,
        item.collectedAt,
      ].join("\u0000");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

export function assertClaimsHaveEvidence(
  claims: string[],
  evidenceIds: string[],
): void {
  for (const claim of claims) {
    const hasCitation = evidenceIds.some((id) => claim.includes(`[${id}]`));
    if (!hasCitation) {
      throw new Error(`Claim without evidence citation: ${claim}`);
    }
  }
}
