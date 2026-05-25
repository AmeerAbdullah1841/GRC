import {
  analyzeDocumentSubmissionComplete,
  serializeAnalysisForStorage,
} from "@/lib/analyze-submission";
import { answersJsonForStorage, resolveStoredAuditReportReview } from "@/lib/audit-report-storage";
import type { AuditReportMeta, AuditReportReview } from "@/lib/audit-report-types";
import { prisma } from "@/lib/db";
import {
  extractDocumentText,
  normalizeExtractedText,
  validateUploadFile,
} from "@/lib/extract-document-text";
import { buildUploadQuestionnaireAnswers } from "@/lib/upload-questionnaire";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const MIN_TEXT_LENGTH = 80;

function parseJsonField<T>(raw: FormDataEntryValue | null): T | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const companyName = String(form.get("companyName") ?? "").trim();
    const contactName = String(form.get("contactName") ?? "").trim();
    const contactEmail = String(form.get("contactEmail") ?? "").trim();
    const file = form.get("file");

    if (!companyName || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Company name, contact name, and email are required." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please attach a questionnaire file." }, { status: 400 });
    }

    const fileError = validateUploadFile(file);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText: string;
    try {
      rawText = await extractDocumentText(buffer, file.name, file.type);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not read the file.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const extractedText = normalizeExtractedText(rawText);
    if (extractedText.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error:
            "Could not extract enough text from the file. Use a text-based PDF or DOCX, or paste into a TXT file.",
        },
        { status: 400 },
      );
    }

    let analysis;
    try {
      analysis = await analyzeDocumentSubmissionComplete(extractedText, file.name);
    } catch (analysisErr) {
      console.error("[submissions/upload] OpenAI analysis failed:", analysisErr);
      return NextResponse.json(
        {
          error:
            "AI security review is unavailable. Check OPENAI_API_KEY and billing, then try again.",
        },
        { status: 503 },
      );
    }

    const answers = buildUploadQuestionnaireAnswers(extractedText, file.name, file.type || "application/octet-stream");

    const auditMeta = parseJsonField<AuditReportMeta>(form.get("auditReportMeta"));
    const auditReview = parseJsonField<AuditReportReview>(form.get("auditReportReview"));
    if (auditMeta) answers.auditReportMeta = auditMeta;
    if (auditReview) answers.auditReportReview = auditReview;

    const auditReportReview = await resolveStoredAuditReportReview(answers);
    const answersToStore = answersJsonForStorage(answers);

    const row = await prisma.submission.create({
      data: {
        companyName,
        contactName,
        contactEmail,
        answersJson: JSON.stringify(answersToStore),
        riskScore: analysis.riskScore,
        securityLevel: analysis.securityLevel,
        recommendation: analysis.recommendation,
        analysisFactorsJson: serializeAnalysisForStorage(analysis, auditReportReview),
      },
    });

    return NextResponse.json({
      id: row.id,
      riskScore: analysis.riskScore,
      securityLevel: analysis.securityLevel,
      recommendation: analysis.recommendation,
    });
  } catch (e) {
    console.error("[submissions/upload]", e);
    const message =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? `Could not save submission: ${e.message}`
        : "Could not save submission.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
