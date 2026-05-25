import type { AnalysisFactor } from "@/lib/analyze-submission";

export type AuditReportMeta = {
  fileName: string;
  mimeType: string;
  extractedText: string;
};

export type AuditReportReview = {
  summary: string;
  institutionalInterpretation: string;
  recommendationRationale: string;
  compliancePosture: string;
  factors: AnalysisFactor[];
  model: string;
};

export type StoredAuditReportReview = AuditReportReview & {
  fileName: string;
};
