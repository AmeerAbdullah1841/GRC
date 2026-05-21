import {
  analyzeQuestionnaire,
  analyzeSubmissionComplete,
  serializeAnalysisForStorage,
} from "@/lib/analyze-submission";
import { prisma } from "@/lib/db";
import { mergeQuestionnaireAnswers } from "@/lib/merge-questionnaire";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as Record<string, unknown>;
    const companyName = String(json.companyName ?? "").trim();
    const contactName = String(json.contactName ?? "").trim();
    const contactEmail = String(json.contactEmail ?? "").trim();

    if (!companyName || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Company name, contact name, and email are required." },
        { status: 400 },
      );
    }

    const answers = mergeQuestionnaireAnswers(json.answers);

    let analysis;
    try {
      analysis = await analyzeSubmissionComplete(answers);
    } catch (analysisErr) {
      console.error("[submissions] analysis failed, using checklist-only fallback:", analysisErr);
      analysis = analyzeQuestionnaire(answers);
    }

    const row = await prisma.submission.create({
      data: {
        companyName,
        contactName,
        contactEmail,
        answersJson: JSON.stringify(answers),
        riskScore: analysis.riskScore,
        securityLevel: analysis.securityLevel,
        recommendation: analysis.recommendation,
        analysisFactorsJson: serializeAnalysisForStorage(analysis),
      },
    });

    return NextResponse.json({
      id: row.id,
      riskScore: analysis.riskScore,
      securityLevel: analysis.securityLevel,
      recommendation: analysis.recommendation,
    });
  } catch (e) {
    console.error("[submissions]", e);
    const message =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? `Could not save submission: ${e.message}`
        : "Could not save submission.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
