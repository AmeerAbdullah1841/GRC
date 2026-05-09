import type { QuestionnaireAnswers } from "@/lib/questionnaire-types";
import { SECURITY_DOMAIN_IDS, type SecurityDomainId } from "@/lib/security-domains";
import { getUniversityQuestionnaireContext } from "@/lib/university-questionnaire-intent";

export type LlmFactor = {
  kind: "strength" | "concern" | "info";
  title: string;
  detail: string;
};

type LlmJson = {
  risk_adjustment?: number;
  domain_scores?: Record<string, number>;
  institutional_interpretation?: string;
  concerns?: { title?: string; detail?: string }[];
  strengths?: { title?: string; detail?: string }[];
  summary?: string;
};

export type LlmReviewOutcome = {
  riskDelta: number;
  factors: LlmFactor[];
  domainScores?: Partial<Record<SecurityDomainId, number>>;
  institutionalInterpretation?: string;
};

function normalizeDomainKey(k: string): SecurityDomainId | null {
  const u = k.trim().toUpperCase().replace(/\s+/g, "_");
  return (SECURITY_DOMAIN_IDS as readonly string[]).includes(u) ? (u as SecurityDomainId) : null;
}

function parseDomainScores(raw: Record<string, number> | undefined): Partial<Record<SecurityDomainId, number>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Partial<Record<SecurityDomainId, number>> = {};
  for (const [key, v] of Object.entries(raw)) {
    const id = normalizeDomainKey(key);
    if (!id) continue;
    const num = typeof v === "number" ? v : Number(v);
    if (Number.isNaN(num)) continue;
    out[id] = Math.min(100, Math.max(0, Math.round(num)));
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Optional OpenAI-based review: institutional framing + per-domain residual risk scores.
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
- "risk_adjustment": integer from -15 to +15 (positive = more overall residual risk than a neutral read).
- "domain_scores": object whose keys are EXACTLY these seven strings, each mapped to an integer 0-100 (higher = more residual risk in that domain): ${SECURITY_DOMAIN_IDS.join(", ")}.
- "institutional_interpretation": 2-4 sentences tying answers to university obligations and naming the highest-risk domains.
- "concerns": array of up to 5 objects {"title","detail"}.
- "strengths": array of up to 4 objects {"title","detail"}.
- "summary": one paragraph for an admin dashboard.

Rules:
- You MUST include all seven keys in domain_scores with the exact spelling above (uppercase with underscores).
- Penalize **contradictions** (e.g. non-public data + weak encryption + Internet exposure + vague logging).
- "Unsure" without mitigation narrative increases domain risk modestly.
- Do not invent CVEs or confirmed breaches without explicit product/version in the JSON.
- Max 5 concerns, 4 strengths.`;

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

    let riskDelta = Math.round(Number(parsed.risk_adjustment) || 0);
    riskDelta = Math.min(15, Math.max(-15, riskDelta));

    const factors: LlmFactor[] = [];
    const interp = parsed.institutional_interpretation?.trim();

    if (parsed.summary?.trim()) {
      factors.push({
        kind: "info",
        title: "AI executive summary (OpenAI)",
        detail: parsed.summary.trim(),
      });
    }

    for (const c of parsed.concerns?.slice(0, 5) ?? []) {
      if (c.title?.trim()) {
        factors.push({
          kind: "concern",
          title: `AI review: ${c.title.trim()}`,
          detail: (c.detail ?? "").trim() || "See questionnaire for context.",
        });
      }
    }
    for (const s of parsed.strengths?.slice(0, 4) ?? []) {
      if (s.title?.trim()) {
        factors.push({
          kind: "strength",
          title: `AI review: ${s.title.trim()}`,
          detail: (s.detail ?? "").trim() || "See questionnaire for context.",
        });
      }
    }

    const domainScores = parseDomainScores(parsed.domain_scores as Record<string, number> | undefined);

    if (factors.length === 0 && riskDelta === 0 && !domainScores && !interp) return null;

    return {
      riskDelta,
      factors,
      domainScores,
      institutionalInterpretation: interp,
    };
  } catch (e) {
    console.error("[llm-security-review]", e);
    return null;
  }
}
