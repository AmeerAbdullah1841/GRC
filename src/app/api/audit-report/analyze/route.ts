import { optionalLlmAuditReportReview } from "@/lib/llm-audit-report-review";
import {
  extractDocumentText,
  normalizeExtractedText,
  validateUploadFile,
} from "@/lib/extract-document-text";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const MIN_TEXT_LENGTH = 80;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please attach an audit report file." }, { status: 400 });
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
            "Could not extract enough text from the audit report. Use a text-based PDF or DOCX.",
        },
        { status: 400 },
      );
    }

    const review = await optionalLlmAuditReportReview(extractedText, file.name);
    if (!review) {
      return NextResponse.json(
        {
          error:
            "AI audit review is unavailable. Check OPENAI_API_KEY and billing, then try again.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      meta: {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        extractedText,
      },
      review,
    });
  } catch (e) {
    console.error("[audit-report/analyze]", e);
    return NextResponse.json({ error: "Could not analyze audit report." }, { status: 500 });
  }
}
