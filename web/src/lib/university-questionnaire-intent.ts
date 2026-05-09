import { SECURITY_DOMAIN_COPY, SECURITY_DOMAIN_IDS } from "@/lib/security-domains";

/**
 * Institutional framing passed to the LLM so ratings reflect *why* each section exists,
 * not only field values. Edit domain copy in `security-domains.ts` to match campus policy.
 */
export function getUniversityQuestionnaireContext(): string {
  const domainLines = SECURITY_DOMAIN_IDS.map(
    (id) => `- **${id}** (${SECURITY_DOMAIN_COPY[id].title}): ${SECURITY_DOMAIN_COPY[id].universityIntent}`,
  ).join("\n");

  return `You are assisting a university information security office that evaluates vendor or project proposals BEFORE full deployment.

## Why this questionnaire exists
Universities ask these questions early so security, privacy, and procurement requirements are known during design and contracting—not bolted on after go-live. Answers are **self-reported**; your job is to reason about **residual risk if the answers are accurate**, flag **internal contradictions** (e.g. sensitive data claimed but encryption or access controls described as weak), and highlight **where evidence or follow-up interviews** are needed.

## Security domains you must score (each 0–100, higher = more residual risk in that domain)
${domainLines}

## How to use the JSON
- Map sections 1–2 primarily to DATA_CLASSIFICATION_AND_PRIVACY and VENDOR_AND_SUPPLY_CHAIN; section 3 to IDENTITY_AND_ACCESS; section 4 to NETWORK_AND_EXPOSURE; section 5 to DATA_PROTECTION_CRYPTO; section 6 to LOGGING_AND_AUDIT; section 7 to RESILIENCE_AND_CONTINUITY; section 8 can inform any domain.
- "Unsure" answers usually mean **incomplete assurance**—moderately increase risk for the affected domain unless the narrative credibly explains why uncertainty is acceptable.
- Do not invent CVEs or confirmed incidents. You may infer **control gaps** from described architecture or practices.

## Output discipline
You will return structured JSON as instructed in the user message. Be concise and operational for a human reviewer.`;
}
