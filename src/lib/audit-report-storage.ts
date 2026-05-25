import type { StoredAuditReportReview } from "@/lib/audit-report-types";
import { optionalLlmAuditReportReview } from "@/lib/llm-audit-report-review";
import type { QuestionnaireAnswers } from "@/lib/questionnaire-types";

/** Persist meta in answersJson; review lives in analysisFactorsJson only. */
export function answersJsonForStorage(answers: QuestionnaireAnswers): QuestionnaireAnswers {
  const { auditReportReview: _review, ...rest } = answers;
  return rest;
}

export async function resolveStoredAuditReportReview(
  answers: QuestionnaireAnswers,
): Promise<StoredAuditReportReview | null> {
  const meta = answers.auditReportMeta;
  if (!meta) return null;

  let review = answers.auditReportReview;
  if (!review) {
    review = (await optionalLlmAuditReportReview(meta.extractedText, meta.fileName)) ?? undefined;
  }
  if (!review) return null;

  return { ...review, fileName: meta.fileName };
}
