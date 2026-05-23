import type {
  AnalysisFactor,
  SecurityLevel,
  SystemRecommendation,
} from "@/lib/analyze-submission";
import type { QuestionnaireAnswers } from "@/lib/questionnaire-types";
import { SECURITY_DOMAIN_IDS, type SecurityDomainId } from "@/lib/security-domains";
import { getUniversityQuestionnaireContext } from "@/lib/university-questionnaire-intent";

type LlmJson = {
  risk_score?: number;
  security_level?: string;
  recommendation?: string;
  domain_scores?: Record<string, number>;
  institutional_interpretation?: string;
  recommendation_rationale?: string;
  concerns?: { title?: string; detail?: string; questionnaire_ref?: string }[];
  strengths?: { title?: string; detail?: string; questionnaire_ref?: string }[];
  summary?: string;
};

export type LlmReviewOutcome = {
  riskScore: number;
  securityLevel: SecurityLevel;
  recommendation: SystemRecommendation;
  factors: AnalysisFactor[];
  domainScores: Record<SecurityDomainId, number>;
  institutionalInterpretation: string;
  recommendationRationale: string;
  model: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeDomainKey(k: string): SecurityDomainId | null {
  const u = k.trim().toUpperCase().replace(/\s+/g, "_");
  return (SECURITY_DOMAIN_IDS as readonly string[]).includes(u) ? (u as SecurityDomainId) : null;
}

function parseDomainScores(
  raw: Record<string, number> | undefined,
): Record<SecurityDomainId, number> | null {
  if (!raw || typeof raw !== "object") return null;
  const out = {} as Record<SecurityDomainId, number>;
  for (const id of SECURITY_DOMAIN_IDS) {
    const v = raw[id] ?? raw[id.toLowerCase()];
    const num = typeof v === "number" ? v : Number(v);
    if (Number.isNaN(num)) return null;
    out[id] = clamp(Math.round(num), 0, 100);
  }
  return out;
}

function riskToLevel(risk: number): SecurityLevel {
  if (risk <= 32) return "LOW";
  if (risk <= 52) return "MEDIUM";
  if (risk <= 72) return "HIGH";
  return "CRITICAL";
}

function riskToRecommendation(risk: number, level: SecurityLevel): SystemRecommendation {
  if (risk <= 36 && level === "LOW") return "APPROVE";
  if (risk <= 68) return "REVIEW";
  return "NOT_RECOMMENDED";
}

function parseSecurityLevel(raw: string | undefined, risk: number): SecurityLevel {
  const u = raw?.trim().toUpperCase();
  if (u === "LOW" || u === "MEDIUM" || u === "HIGH" || u === "CRITICAL") return u;
  return riskToLevel(risk);
}

function parseRecommendation(
  raw: string | undefined,
  risk: number,
  level: SecurityLevel,
): SystemRecommendation {
  const u = raw?.trim().toUpperCase().replace(/\s+/g, "_");
  if (u === "APPROVE" || u === "REVIEW" || u === "NOT_RECOMMENDED") return u;
  return riskToRecommendation(risk, level);
}

function formatRefDetail(detail: string, ref?: string) {
  const d = detail.trim() || "See questionnaire for context.";
  return ref?.trim() ? `${d} (Source: ${ref.trim()})` : d;
}

/**
 * OpenAI-based security review — sole source for risk scores, narrative, and factor lists.
 * Set OPENAI_API_KEY. Data may be sensitive—use with appropriate agreements and retention policy.
 */
export async function optionalLlmSecurityReview(
  answers: QuestionnaireAnswers,
): Promise<LlmReviewOutcome | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const compact = JSON.stringify(answers);
  const institutional = getUniversityQuestionnaireContext();

  const system = `You are a university chief information security officer (CISO) advisor. You reason about vendor/project questionnaire answers from a **security and institutional-risk** perspective: why the university asks each topic, what could go wrong if answers are accurate, and where follow-up evidence is needed.

${institutional}

Respond with ONE JSON object (no markdown) with these keys:
- "risk_score": integer 0-100 (overall residual risk; higher = more concern).
- "security_level": one of "LOW", "MEDIUM", "HIGH", "CRITICAL".
- "recommendation": one of "APPROVE", "REVIEW", "NOT_RECOMMENDED" (advisory for admin).
- "domain_scores": object whose keys are EXACTLY these seven strings, each mapped to an integer 0-100 (higher = more residual risk in that domain): ${SECURITY_DOMAIN_IDS.join(", ")}.
- "institutional_interpretation": 2-4 sentences tying answers to university obligations and naming the highest-risk domains.
- "recommendation_rationale": 3-5 sentences explaining what an admin should conclude (approve with conditions, require remediation, or deny) based ONLY on the answers—reference specific sections (e.g. Section 5 encryption, Section 6 logging).
- "concerns": array of up to 8 objects {"title","detail","questionnaire_ref"} where questionnaire_ref cites section/question (e.g. "Section 3.11 authentication").
- "strengths": array of up to 6 objects {"title","detail","questionnaire_ref"} for controls or narratives that reduce risk.
- "summary": one paragraph executive summary for the admin dashboard.

Rules:
- You MUST include all seven keys in domain_scores with the exact spelling above (uppercase with underscores).
- recommendation must align with risk_score: APPROVE only for clearly low residual risk; NOT_RECOMMENDED for material gaps or contradictions.
- Penalize **contradictions** (e.g. non-public data + weak encryption + Internet exposure + vague logging).
- "Unsure" without mitigation narrative increases domain risk modestly.
- Do not invent CVEs or confirmed breaches without explicit product/version in the JSON.
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
        max_tokens: 3200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Score the following questionnaire. JSON:\n${compact.slice(0, 90000)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[llm-security-review]", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    let parsed: LlmJson;
    try {
      parsed = JSON.parse(raw) as LlmJson;
    } catch {
      return null;
    }

    const riskScore = clamp(Math.round(Number(parsed.risk_score) || 50), 0, 100);
    const securityLevel = parseSecurityLevel(parsed.security_level, riskScore);
    const recommendation = parseRecommendation(parsed.recommendation, riskScore, securityLevel);
    const domainScores = parseDomainScores(parsed.domain_scores as Record<string, number> | undefined);
    const institutionalInterpretation = parsed.institutional_interpretation?.trim();
    const recommendationRationale = parsed.recommendation_rationale?.trim();

    if (!domainScores || !institutionalInterpretation || !recommendationRationale) {
      console.error("[llm-security-review] incomplete OpenAI JSON payload");
      return null;
    }

    const factors: AnalysisFactor[] = [];

    if (parsed.summary?.trim()) {
      factors.push({
        kind: "info",
        title: "Executive summary",
        detail: parsed.summary.trim(),
      });
    }

    for (const c of parsed.concerns?.slice(0, 8) ?? []) {
      if (c.title?.trim()) {
        factors.push({
          kind: "concern",
          title: c.title.trim(),
          detail: formatRefDetail(c.detail ?? "", c.questionnaire_ref),
        });
      }
    }
    for (const s of parsed.strengths?.slice(0, 6) ?? []) {
      if (s.title?.trim()) {
        factors.push({
          kind: "strength",
          title: s.title.trim(),
          detail: formatRefDetail(s.detail ?? "", s.questionnaire_ref),
        });
      }
    }

    if (factors.length === 0) {
      console.error("[llm-security-review] OpenAI returned no review factors");
      return null;
    }

    return {
      riskScore,
      securityLevel,
      recommendation,
      factors,
      domainScores,
      institutionalInterpretation,
      recommendationRationale,
      model,
    };
  } catch (e) {
    console.error("[llm-security-review]", e);
    return null;
  }
}
