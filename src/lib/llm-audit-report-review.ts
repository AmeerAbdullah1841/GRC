import type { AnalysisFactor } from "@/lib/analyze-submission";
import type { AuditReportReview } from "@/lib/audit-report-types";
import { getUniversityQuestionnaireContext } from "@/lib/university-questionnaire-intent";

type AuditLlmJson = {
  summary?: string;
  institutional_interpretation?: string;
  recommendation_rationale?: string;
  compliance_posture?: string;
  concerns?: { title?: string; detail?: string; questionnaire_ref?: string }[];
  strengths?: { title?: string; detail?: string; questionnaire_ref?: string }[];
};

function formatRefDetail(detail: string, ref?: string) {
  const d = detail.trim() || "See audit report for context.";
  return ref?.trim() ? `${d} (Source: ${ref.trim()})` : d;
}

function buildFactors(parsed: AuditLlmJson): AnalysisFactor[] {
  const factors: AnalysisFactor[] = [];

  if (parsed.summary?.trim()) {
    factors.push({
      kind: "info",
      title: "Audit report summary",
      detail: parsed.summary.trim(),
    });
  }

  for (const c of parsed.concerns?.slice(0, 6) ?? []) {
    if (c.title?.trim()) {
      factors.push({
        kind: "concern",
        title: c.title.trim(),
        detail: formatRefDetail(c.detail ?? "", c.questionnaire_ref),
      });
    }
  }
  for (const s of parsed.strengths?.slice(0, 5) ?? []) {
    if (s.title?.trim()) {
      factors.push({
        kind: "strength",
        title: s.title.trim(),
        detail: formatRefDetail(s.detail ?? "", s.questionnaire_ref),
      });
    }
  }

  return factors;
}

/**
 * OpenAI review of a vendor audit / attestation report (SOC 2, ISO, pen test, etc.).
 */
export async function optionalLlmAuditReportReview(
  extractedText: string,
  fileName: string,
): Promise<AuditReportReview | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const institutional = getUniversityQuestionnaireContext();
  const text = extractedText.trim().slice(0, 90000);

  const system = `You are a university chief information security officer (CISO) advisor reviewing an **uploaded vendor audit or attestation report** (file: ${fileName}).

Examples include SOC 1/2/3 reports, ISO 27001 certificates or audit summaries, HITRUST, PCI attestation, penetration test executive summaries, or third-party security assessment letters.

${institutional}

Respond with ONE JSON object (no markdown) with these keys:
- "summary": one paragraph executive summary of what the audit report says about the vendor's control environment.
- "institutional_interpretation": 2-4 sentences on what this audit means for university reliance on the vendor (scope, assurance level, gaps).
- "recommendation_rationale": 3-5 sentences on how an admin should weigh this audit alongside the questionnaire (accept, require remediation, request updated report).
- "compliance_posture": short phrase describing assurance level (e.g. "SOC 2 Type II — qualified opinion", "ISO 27001 certified — scope limited to US datacenter").
- "concerns": array of up to 6 objects {"title","detail","questionnaire_ref"} for exceptions, qualifications, gaps, expired dates, or scope limits. Use questionnaire_ref to cite audit sections (e.g. "SOC 2 Section IV — exceptions").
- "strengths": array of up to 5 objects {"title","detail","questionnaire_ref"} for clean opinions, relevant controls, or strong assurance.

Rules:
- Base analysis ONLY on the extracted text; do not invent certifications or dates not present.
- If the document is not clearly an audit report, say so in summary and note limited assurance.
- Each concern/strength must be actionable for a human reviewer.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        max_tokens: 2800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Analyze this vendor audit / attestation report and return the JSON assessment.\n\n---\n${text}\n---`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[llm-audit-report-review]", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    let parsed: AuditLlmJson;
    try {
      parsed = JSON.parse(raw) as AuditLlmJson;
    } catch {
      return null;
    }

    const summary = parsed.summary?.trim();
    const institutionalInterpretation = parsed.institutional_interpretation?.trim();
    const recommendationRationale = parsed.recommendation_rationale?.trim();
    const compliancePosture = parsed.compliance_posture?.trim() || "Not specified in report";
    const factors = buildFactors(parsed);

    if (!summary || !institutionalInterpretation || !recommendationRationale || factors.length === 0) {
      return null;
    }

    return {
      summary,
      institutionalInterpretation,
      recommendationRationale,
      compliancePosture,
      factors,
      model,
    };
  } catch (e) {
    console.error("[llm-audit-report-review]", e);
    return null;
  }
}
