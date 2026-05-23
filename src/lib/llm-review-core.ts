import type { AnalysisFactor, SecurityLevel, SystemRecommendation } from "@/lib/analyze-submission";
import { SECURITY_DOMAIN_IDS, type SecurityDomainId } from "@/lib/security-domains";

export type LlmJson = {
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

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
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

export function parseSecurityLevel(raw: string | undefined, risk: number): SecurityLevel {
  const u = raw?.trim().toUpperCase();
  if (u === "LOW" || u === "MEDIUM" || u === "HIGH" || u === "CRITICAL") return u;
  return riskToLevel(risk);
}

export function parseRecommendation(
  raw: string | undefined,
  risk: number,
  level: SecurityLevel,
): SystemRecommendation {
  const u = raw?.trim().toUpperCase().replace(/\s+/g, "_");
  if (u === "APPROVE" || u === "REVIEW" || u === "NOT_RECOMMENDED") return u;
  return riskToRecommendation(risk, level);
}

export function parseDomainScores(
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

function formatRefDetail(detail: string, ref?: string) {
  const d = detail.trim() || "See document for context.";
  return ref?.trim() ? `${d} (Source: ${ref.trim()})` : d;
}

export function buildFactorsFromLlmJson(parsed: LlmJson): AnalysisFactor[] {
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

  return factors;
}

export function parseLlmReviewOutcome(
  parsed: LlmJson,
  model: string,
): LlmReviewOutcome | null {
  const riskScore = clamp(Math.round(Number(parsed.risk_score) || 50), 0, 100);
  const securityLevel = parseSecurityLevel(parsed.security_level, riskScore);
  const recommendation = parseRecommendation(parsed.recommendation, riskScore, securityLevel);
  const domainScores = parseDomainScores(parsed.domain_scores as Record<string, number> | undefined);
  const institutionalInterpretation = parsed.institutional_interpretation?.trim();
  const recommendationRationale = parsed.recommendation_rationale?.trim();

  if (!domainScores || !institutionalInterpretation || !recommendationRationale) {
    return null;
  }

  const factors = buildFactorsFromLlmJson(parsed);
  if (factors.length === 0) return null;

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
}

export const LLM_JSON_SCHEMA_INSTRUCTIONS = `Respond with ONE JSON object (no markdown) with these keys:
- "risk_score": integer 0-100 (overall residual risk; higher = more concern).
- "security_level": one of "LOW", "MEDIUM", "HIGH", "CRITICAL".
- "recommendation": one of "APPROVE", "REVIEW", "NOT_RECOMMENDED" (advisory for admin).
- "domain_scores": object whose keys are EXACTLY these seven strings, each mapped to an integer 0-100 (higher = more residual risk in that domain): ${SECURITY_DOMAIN_IDS.join(", ")}.
- "institutional_interpretation": 2-4 sentences tying answers to university obligations and naming the highest-risk domains.
- "recommendation_rationale": 3-5 sentences explaining what an admin should conclude (approve with conditions, require remediation, or deny) based ONLY on the content—reference specific topics (e.g. encryption, logging, access control).
- "concerns": array of up to 8 objects {"title","detail","questionnaire_ref"} where questionnaire_ref cites a section or topic in the document (e.g. "Section on encryption", "Access control narrative").
- "strengths": array of up to 6 objects {"title","detail","questionnaire_ref"} for controls or narratives that reduce risk.
- "summary": one paragraph executive summary for the admin dashboard.

Rules:
- You MUST include all seven keys in domain_scores with the exact spelling above (uppercase with underscores).
- recommendation must align with risk_score: APPROVE only for clearly low residual risk; NOT_RECOMMENDED for material gaps or contradictions.
- Penalize **contradictions** (e.g. sensitive data + weak encryption + Internet exposure + vague logging).
- Do not invent CVEs or confirmed breaches without explicit product/version in the text.
- Each concern/strength must be actionable for a human reviewer.`;

export async function callOpenAiSecurityReview(
  system: string,
  user: string,
): Promise<LlmReviewOutcome | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

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
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[llm-review]", res.status, await res.text());
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

    return parseLlmReviewOutcome(parsed, model);
  } catch (e) {
    console.error("[llm-review]", e);
    return null;
  }
}
