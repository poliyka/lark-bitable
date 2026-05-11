import { toEvidence } from "./evidence.js";
import type { ResearchEvidence } from "../config/schema.js";

export function parseEvidenceArgument(argument: string): ResearchEvidence {
  const [type, reference, ...excerptParts] = argument.split(":");
  return toEvidence({
    type: type as ResearchEvidence["type"],
    reference: reference ?? "unknown",
    excerpt: excerptParts.join(":") || "No excerpt provided",
    status: "verified",
  });
}
