import type { QuestionnaireAnswers } from "@/lib/questionnaire-types";
import {
  SECURITY_DOMAIN_COPY,
  type SecurityDomainId,
  emptyDomainScores,
} from "@/lib/security-domains";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hasText(s: string, minLen: number) {
  return (s ?? "").trim().length >= minLen;
}

function usesEnterpriseAuth(a: QuestionnaireAnswers) {
  const m = a.section3.authMethods;
  return (
    m.includes("cuny_portal_ldap") ||
    m.includes("cuny_ad") ||
    m.includes("cuny_enterprise_ad") ||
    m.includes("cunyfirst_sso")
  );
}

/**
 * Checklist-derived domain scores (0–100, higher = more residual risk if answers are truthful).
 * Mirrors institutional control expectations behind each questionnaire section.
 */
export function computeHeuristicDomainScores(a: QuestionnaireAnswers): Record<SecurityDomainId, number> {
  const d = emptyDomainScores();
  const s1 = a.section1;
  const s2 = a.section2;
  const s3 = a.section3;
  const s4 = a.section4;
  const s5 = a.section5;
  const s6 = a.section6;
  const s7 = a.section7;

  let data = 22;
  if (s1.involvesNonPublic) data += 12;
  data += Math.min(38, s1.subcategories.length * 9);
  if (s1.involvesNonPublic && !hasText(s1.nonPublicExplanation, 40)) data += 14;
  else if (s1.involvesNonPublic && hasText(s1.nonPublicExplanation, 40)) data -= 10;
  d.DATA_CLASSIFICATION_AND_PRIVACY = clamp(Math.round(data), 0, 100);

  let vendor = 18;
  if (s2.vendorITServices === "yes") {
    vendor += 8;
    if (!s2.acquisitionVia.includes("rfp") && s2.acquisitionVia.length > 0) vendor += 7;
    if (!hasText(s2.servicesDescription, 20)) vendor += 12;
  } else if (s2.vendorITServices === "no") {
    vendor -= 8;
  } else vendor += 6;
  d.VENDOR_AND_SUPPLY_CHAIN = clamp(Math.round(vendor), 0, 100);

  let id = 24;
  if (s3.accessLimitedToNeed === "no") id += 14;
  else if (s3.accessLimitedToNeed === "yes") id -= 8;
  if (s3.publicOrAnonymous === "yes" && s1.involvesNonPublic) id += 20;
  if (s3.uniqueAccounts === "no") id += 12;
  if (usesEnterpriseAuth(a)) id -= 12;
  if (s3.authMethods.includes("local_auth") || (s3.authMethods.includes("other") && hasText(s3.authOtherDetail, 1))) {
    id += 8;
    if (!hasText(s3.localPasswordPolicy, 25) || !hasText(s3.localPasswordStorage, 25)) id += 12;
  }
  if (!hasText(s3.sessionTimeout, 15)) id += 8;
  d.IDENTITY_AND_ACCESS = clamp(Math.round(id), 0, 100);

  let net = 20;
  if (s4.networkRequired === "yes") {
    if (s4.networkScopes.includes("internet") && s1.involvesNonPublic) net += 22;
    if (s4.networkScopes.length === 0) net += 14;
  } else if (s4.networkRequired === "unsure") net += 8;
  d.NETWORK_AND_EXPOSURE = clamp(Math.round(net), 0, 100);

  let crypto = 22;
  if (s5.encryptedAtRest === "no") crypto += 16;
  else if (s5.encryptedAtRest === "yes") crypto -= 8;
  if (s5.encryptedInTransit === "no") crypto += 16;
  else if (s5.encryptedInTransit === "yes") crypto -= 8;
  if (!hasText(s5.encryptionDetails, 20)) crypto += 8;
  d.DATA_PROTECTION_CRYPTO = clamp(Math.round(crypto), 0, 100);

  let log = 24;
  if (!hasText(s6.logsDescription, 25)) log += 14;
  if (s6.sensitiveInLogs === "yes") log += 16;
  if (s6.logsLinkToUsers === "no") log += 10;
  d.LOGGING_AND_AUDIT = clamp(Math.round(log), 0, 100);

  let res = 26;
  if (!hasText(s7.bcpPlan, 25)) res += 14;
  else res -= 10;
  d.RESILIENCE_AND_CONTINUITY = clamp(Math.round(res), 0, 100);

  return d;
}

export function buildChecklistInterpretation(scores: Record<SecurityDomainId, number>): string {
  const ranked = (Object.entries(scores) as [SecurityDomainId, number][]).sort((a, b) => b[1] - a[1]);
  const top = ranked
    .slice(0, 3)
    .map(([k, v]) => `${SECURITY_DOMAIN_COPY[k].title} (${v}/100)`)
    .join("; ");

  return `Institutional (checklist) read: the questionnaire is designed to surface proportional controls before go-live. The strongest residual-risk themes by domain are: ${top}. These scores weight each section by why the university asks it—not character count alone—but they still reflect self-reported answers only, not verified testing. Configure OPENAI_API_KEY for an additional narrative cross-check grounded in the same institutional framing.`;
}
