import type { DocumentUploadMeta, QuestionnaireAnswers } from "@/lib/questionnaire-types";
import type { AuditReportMeta, AuditReportReview } from "@/lib/audit-report-types";
import { emptyQuestionnaire } from "@/lib/questionnaire-types";

function isUploadMeta(v: unknown): v is DocumentUploadMeta {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.source === "document_upload" &&
    typeof o.fileName === "string" &&
    typeof o.mimeType === "string" &&
    typeof o.extractedText === "string"
  );
}

function isAuditReportMeta(v: unknown): v is AuditReportMeta {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.fileName === "string" &&
    typeof o.mimeType === "string" &&
    typeof o.extractedText === "string"
  );
}

function isAuditReportReview(v: unknown): v is AuditReportReview {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.summary === "string" &&
    typeof o.institutionalInterpretation === "string" &&
    typeof o.recommendationRationale === "string" &&
    typeof o.compliancePosture === "string" &&
    Array.isArray(o.factors) &&
    typeof o.model === "string"
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge vendor JSON into the canonical questionnaire shape. */
export function mergeQuestionnaireAnswers(patch: unknown): QuestionnaireAnswers {
  const base = emptyQuestionnaire();
  if (!isPlainObject(patch)) return base;

  const merge = <T extends object>(b: T, p: unknown): T => {
    if (!isPlainObject(p)) return b;
    const out = { ...b } as Record<string, unknown>;
    for (const key of Object.keys(b as object)) {
      const bv = (b as Record<string, unknown>)[key];
      const pv = p[key];
      if (Array.isArray(bv)) {
        out[key] = Array.isArray(pv) ? pv.filter((x) => typeof x === "string" || typeof x === "boolean") : bv;
      } else if (isPlainObject(bv) && isPlainObject(pv)) {
        out[key] = merge(bv as object, pv);
      } else if (typeof bv === "boolean") {
        out[key] = typeof pv === "boolean" ? pv : bv;
      } else if (typeof bv === "string") {
        out[key] = typeof pv === "string" ? pv : bv;
      } else {
        out[key] = pv !== undefined ? pv : bv;
      }
    }
    return out as T;
  };

  const merged = merge(base, patch) as QuestionnaireAnswers;
  if (isPlainObject(patch) && isUploadMeta((patch as { uploadMeta?: unknown }).uploadMeta)) {
    merged.uploadMeta = (patch as { uploadMeta: DocumentUploadMeta }).uploadMeta;
  }
  if (isPlainObject(patch) && isAuditReportMeta((patch as { auditReportMeta?: unknown }).auditReportMeta)) {
    merged.auditReportMeta = (patch as { auditReportMeta: AuditReportMeta }).auditReportMeta;
  }
  if (isPlainObject(patch) && isAuditReportReview((patch as { auditReportReview?: unknown }).auditReportReview)) {
    merged.auditReportReview = (patch as { auditReportReview: AuditReportReview }).auditReportReview;
  }
  return merged;
}
