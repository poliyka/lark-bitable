import {
  listResearchReports,
  readResearchReport,
  type ResearchReportListInput,
} from "../reporting/research-store.js";
import { redactDashboardPayload } from "./api.js";

export async function listDashboardResearchReports(
  input: ResearchReportListInput = {},
) {
  return redactDashboardPayload(await listResearchReports(input));
}

export async function getDashboardResearchReport(input: {
  reportId: string;
  researchDir?: string;
}) {
  const report = await readResearchReport(input);
  return redactDashboardPayload({ report });
}
