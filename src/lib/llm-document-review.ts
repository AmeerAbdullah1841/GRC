import { getUniversityQuestionnaireContext } from "@/lib/university-questionnaire-intent";
import {
  LLM_JSON_SCHEMA_INSTRUCTIONS,
  callOpenAiSecurityReview,
  type LlmReviewOutcome,
} from "@/lib/llm-review-core";

export type { LlmReviewOutcome } from "@/lib/llm-review-core";

/**
 * OpenAI security review for an uploaded vendor questionnaire document (PDF, DOCX, or TXT).
 */
export async function optionalLlmDocumentReview(
  extractedText: string,
  fileName: string,
): Promise<LlmReviewOutcome | null> {
  const institutional = getUniversityQuestionnaireContext();
  const text = extractedText.trim().slice(0, 90000);

  const system = `You are a university chief information security officer (CISO) advisor reviewing an **uploaded vendor security questionnaire document** (file: ${fileName}).

The text below was extracted from the file and may include headings, tables, checkboxes described in prose, or incomplete OCR. Treat it as the vendor's self-reported security posture.

${institutional}

${LLM_JSON_SCHEMA_INSTRUCTIONS}

Additional rules for document review:
- Infer data classification, access controls, encryption, logging, network exposure, vendor services, and continuity from any section of the document—even if formatting is messy.
- If the document is sparse or ambiguous, increase residual risk and recommend REVIEW or NOT_RECOMMENDED with clear follow-up items.
- In questionnaire_ref fields, cite document sections or headings when visible (e.g. "Encryption section", "Question 5.2").`;

  const user = `Analyze this vendor security questionnaire document and return the JSON assessment.\n\n---\n${text}\n---`;
  return callOpenAiSecurityReview(system, user);
}
