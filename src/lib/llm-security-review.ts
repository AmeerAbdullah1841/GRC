import type { QuestionnaireAnswers } from "@/lib/questionnaire-types";
import { getUniversityQuestionnaireContext } from "@/lib/university-questionnaire-intent";
import {
  LLM_JSON_SCHEMA_INSTRUCTIONS,
  callOpenAiSecurityReview,
  type LlmReviewOutcome,
} from "@/lib/llm-review-core";

export type { LlmReviewOutcome } from "@/lib/llm-review-core";

/**
 * OpenAI-based security review — sole source for risk scores, narrative, and factor lists.
 */
export async function optionalLlmSecurityReview(
  answers: QuestionnaireAnswers,
): Promise<LlmReviewOutcome | null> {
  const compact = JSON.stringify(answers);
  const institutional = getUniversityQuestionnaireContext();

  const system = `You are a university chief information security officer (CISO) advisor. You reason about vendor/project questionnaire answers from a **security and institutional-risk** perspective: why the university asks each topic, what could go wrong if answers are accurate, and where follow-up evidence is needed.

${institutional}

${LLM_JSON_SCHEMA_INSTRUCTIONS}

Additional rules for structured questionnaire JSON:
- Map sections 1–8 to the seven security domains as described in the institutional context.
- "Unsure" without mitigation narrative increases domain risk modestly.`;

  const user = `Score the following questionnaire. JSON:\n${compact.slice(0, 90000)}`;
  return callOpenAiSecurityReview(system, user);
}
