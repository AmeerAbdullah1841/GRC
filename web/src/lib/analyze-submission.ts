import { buildChecklistInterpretation, computeHeuristicDomainScores } from "@/lib/domain-risk-scores";
import { optionalLlmSecurityReview } from "@/lib/llm-security-review";
import type { DataSubcategory, QuestionnaireAnswers } from "@/lib/questionnaire-types";
import { SECURITY_DOMAIN_IDS, type SecurityDomainId } from "@/lib/security-domains";
import { scanSemanticSecuritySignals } from "@/lib/semantic-security-scan";

export type SystemRecommendation = "APPROVE" | "REVIEW" | "NOT_RECOMMENDED";

export type AnalysisFactor = {
  kind: "strength" | "concern" | "info";
  title: string;
  detail: string;
};

export type SecurityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AnalysisMeta = {
  hasLlmLayer: boolean;
  model?: string;
};

/** Overall score + recommendation without domain breakdown (built first, then enriched). */
export type AnalysisCore = {
  riskScore: number;
  securityLevel: SecurityLevel;
  recommendation: SystemRecommendation;
  factors: AnalysisFactor[];
};

export type AnalysisResult = {
  riskScore: number;
  securityLevel: SecurityLevel;
  recommendation: SystemRecommendation;
  factors: AnalysisFactor[];
  /** 0–100 per domain; higher = more residual risk (self-reported). */
  domainScores: Record<SecurityDomainId, number>;
  /** Why the answers matter from the university security perspective (checklist and/or LLM). */
  institutionalInterpretation: string;
  analysisMeta: AnalysisMeta;
};

export type ParsedStoredAnalysis = {
  factors: AnalysisFactor[];
  domainScores: Record<string, number> | null;
  institutionalInterpretation: string | null;
  meta: AnalysisMeta | null;
};

export function serializeAnalysisForStorage(result: AnalysisResult): string {
  return JSON.stringify({
    version: 2,
    factors: result.factors,
    domainScores: result.domainScores,
    institutionalInterpretation: result.institutionalInterpretation,
    meta: result.analysisMeta,
  });
}

/** Supports legacy submissions that stored a bare array of factors. */
export function parseStoredAnalysis(raw: string): ParsedStoredAnalysis {
  try {
    const j = JSON.parse(raw) as unknown;
    if (Array.isArray(j)) {
      return {
        factors: j as AnalysisFactor[],
        domainScores: null,
        institutionalInterpretation: null,
        meta: null,
      };
    }
    if (j && typeof j === "object" && "version" in j && (j as { version?: number }).version === 2) {
      const o = j as {
        factors?: AnalysisFactor[];
        domainScores?: Record<string, number>;
        institutionalInterpretation?: string;
        meta?: AnalysisMeta;
      };
      return {
        factors: Array.isArray(o.factors) ? o.factors : [],
        domainScores: o.domainScores && typeof o.domainScores === "object" ? o.domainScores : null,
        institutionalInterpretation:
          typeof o.institutionalInterpretation === "string" ? o.institutionalInterpretation : null,
        meta: o.meta && typeof o.meta === "object" ? o.meta : null,
      };
    }
  } catch {
    /* fall through */
  }
  return { factors: [], domainScores: null, institutionalInterpretation: null, meta: null };
}

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

function finalizeFromRisk(
  risk: number,
  factors: AnalysisFactor[],
  subcategories: DataSubcategory[],
): AnalysisCore {
  let securityLevel: SecurityLevel;
  if (risk <= 32) securityLevel = "LOW";
  else if (risk <= 52) securityLevel = "MEDIUM";
  else if (risk <= 72) securityLevel = "HIGH";
  else securityLevel = "CRITICAL";

  let recommendation: SystemRecommendation;
  if (risk <= 36 && securityLevel === "LOW") recommendation = "APPROVE";
  else if (risk <= 68) recommendation = "REVIEW";
  else recommendation = "NOT_RECOMMENDED";

  const outFactors = [...factors];

  if (subcategories.includes("hipaa") || subcategories.includes("ferpa")) {
    if (recommendation === "APPROVE") recommendation = "REVIEW";
    const hasRegulatedNote = outFactors.some((f) => f.title === "Regulated data categories present");
    if (!hasRegulatedNote) {
      outFactors.push({
        kind: "info",
        title: "Regulated data categories present",
        detail:
          "FERPA/HIPAA triggers additional privacy, BAAs/DPA, and contractual clauses even when other signals look favorable.",
      });
    }
  }

  return { riskScore: risk, securityLevel, recommendation, factors: outFactors };
}

/**
 * Full pipeline: structured rules + semantic text patterns + optional OpenAI review.
 */
export async function analyzeSubmissionComplete(
  answers: QuestionnaireAnswers,
): Promise<AnalysisResult> {
  const base = analyzeQuestionnaire(answers);
  const llm = await optionalLlmSecurityReview(answers);
  if (!llm) return base;

  const mergedRisk = clamp(Math.round(base.riskScore + llm.riskDelta), 0, 100);
  const mergedFactors = [...base.factors, ...llm.factors];
  const finalized = finalizeFromRisk(mergedRisk, mergedFactors, answers.section1.subcategories);

  const domainScores = { ...base.domainScores } as Record<SecurityDomainId, number>;
  if (llm.domainScores) {
    for (const id of SECURITY_DOMAIN_IDS) {
      const v = llm.domainScores[id];
      if (typeof v === "number" && !Number.isNaN(v)) {
        domainScores[id] = clamp(Math.round(v), 0, 100);
      }
    }
  }

  return {
    ...finalized,
    domainScores,
    institutionalInterpretation:
      llm.institutionalInterpretation?.trim() || base.institutionalInterpretation,
    analysisMeta: {
      hasLlmLayer: true,
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    },
  };
}

/**
 * Rule-based GRC-style assessment. Higher riskScore = more concern.
 * Recommendation is advisory; the admin always decides.
 */
export function analyzeQuestionnaire(
  answers: QuestionnaireAnswers,
): AnalysisResult {
  const factors: AnalysisFactor[] = [];
  let risk = 18;

  const s1 = answers.section1;
  if (s1.involvesNonPublic) {
    risk += 8;
    factors.push({
      kind: "info",
      title: "Non-public university data in scope",
      detail:
        "Baseline controls and contract language should reflect the sensitivity described in Section 1.",
    });
  }

  const weightBySub: Record<string, { w: number; label: string }> = {
    pii: { w: 10, label: "Personally identifiable information" },
    ferpa: { w: 12, label: "FERPA-regulated data" },
    hipaa: { w: 14, label: "HIPAA-regulated data" },
    financial: { w: 12, label: "Financial information" },
    hr: { w: 8, label: "Human resources information" },
    research: { w: 9, label: "Research information" },
    other_sensitive: { w: 10, label: "Other sensitive / confidential data" },
  };

  for (const sub of s1.subcategories) {
    const meta = weightBySub[sub];
    if (!meta) continue;
    risk += meta.w;
    factors.push({
      kind: "concern",
      title: `Data classification: ${meta.label}`,
      detail:
        "Higher classification generally requires stronger technical and administrative controls.",
    });
  }

  if (s1.involvesNonPublic && !hasText(s1.nonPublicExplanation, 40)) {
    risk += 14;
    factors.push({
      kind: "concern",
      title: "Thin explanation for non-public data use",
      detail:
        "Section 1 narrative should clearly describe nature, volume, and business necessity.",
    });
  } else if (s1.involvesNonPublic && hasText(s1.nonPublicExplanation, 40)) {
    risk -= 4;
    factors.push({
      kind: "strength",
      title: "Non-public data use is described",
      detail: "A documented rationale supports proportionality and data minimization reviews.",
    });
  }

  const s2 = answers.section2;
  if (s2.vendorITServices === "yes") {
    risk += 4;
    factors.push({
      kind: "info",
      title: "Ongoing vendor IT services",
      detail: "Vendor due diligence, SLAs, and exit plans should be explicit in procurement.",
    });
    if (!s2.acquisitionVia.includes("rfp") && s2.acquisitionVia.length > 0) {
      risk += 5;
      factors.push({
        kind: "concern",
        title: "Acquisition path is not an RFP",
        detail:
          "Non-RFP paths can be acceptable but often warrant stronger security review and contractual safeguards.",
      });
    }
    if (!hasText(s2.servicesDescription, 20)) {
      risk += 8;
      factors.push({
        kind: "concern",
        title: "Vendor services under-described",
        detail: "Section 2.3 should name services, hosting model, and known vendors where possible.",
      });
    }
  }

  const s3 = answers.section3;
  if (s3.accessLimitedToNeed === "no") {
    risk += 12;
    factors.push({
      kind: "concern",
      title: "Access may not be limited to least privilege",
      detail: "Need-based access is a core control for sensitive university data.",
    });
  } else if (s3.accessLimitedToNeed === "yes") {
    risk -= 5;
    factors.push({
      kind: "strength",
      title: "Least-privilege access described",
      detail: "Positive indicator for authorization design.",
    });
  }

  if (s3.publicOrAnonymous === "yes" && s1.involvesNonPublic) {
    risk += 18;
    factors.push({
      kind: "concern",
      title: "Public or anonymous access with non-public data",
      detail: "This combination typically requires compensating controls and legal review.",
    });
  }

  if (s3.uniqueAccounts === "no") {
    risk += 10;
    factors.push({
      kind: "concern",
      title: "Shared or non-unique accounts possible",
      detail: "Individual accountability in audit trails is harder without unique identities.",
    });
  }

  if (usesEnterpriseAuth(answers)) {
    risk -= 10;
    factors.push({
      kind: "strength",
      title: "Enterprise / university SSO options selected",
      detail: "Central IdP integration generally improves lifecycle management and MFA posture.",
    });
  }

  if (
    s3.authMethods.includes("local_auth") ||
    (s3.authMethods.includes("other") && hasText(s3.authOtherDetail, 1))
  ) {
    risk += 6;
    if (!hasText(s3.localPasswordPolicy, 25) || !hasText(s3.localPasswordStorage, 25)) {
      risk += 14;
      factors.push({
        kind: "concern",
        title: "Local or custom authentication without sufficient detail",
        detail: "Document password policy, storage (salted hashes), lockout, and MFA if applicable.",
      });
    }
  }

  if (!hasText(s3.sessionTimeout, 15)) {
    risk += 6;
    factors.push({
      kind: "concern",
      title: "Session timeout / inactivity handling unclear",
      detail: "Describe idle timeouts, re-auth, and secure session storage.",
    });
  }

  const s4 = answers.section4;
  if (s4.networkRequired === "yes") {
    if (s4.networkScopes.includes("internet") && s1.involvesNonPublic) {
      risk += 12;
      factors.push({
        kind: "concern",
        title: "Internet exposure with non-public data",
        detail: "Expect requirements for TLS, WAF, hardening, monitoring, and vendor security attestations.",
      });
    }
    if (s4.networkScopes.length === 0) {
      risk += 8;
      factors.push({
        kind: "concern",
        title: "Network reachability not specified",
        detail: "Clarify whether the solution is campus-only, central office, or public Internet.",
      });
    }
  }

  const s5 = answers.section5;
  if (s5.encryptedAtRest === "no") {
    risk += 12;
    factors.push({
      kind: "concern",
      title: "Encryption at rest not indicated",
      detail: "At-rest encryption is commonly expected for non-public data on vendor infrastructure.",
    });
  } else if (s5.encryptedAtRest === "yes") {
    risk -= 4;
    factors.push({
      kind: "strength",
      title: "Encryption at rest indicated",
      detail: "Align implementation details with university key management expectations.",
    });
  }

  if (s5.encryptedInTransit === "no") {
    risk += 12;
    factors.push({
      kind: "concern",
      title: "Encryption in transit not indicated",
      detail: "TLS (and certificate management) should cover all untrusted paths, including admin APIs.",
    });
  } else if (s5.encryptedInTransit === "yes") {
    risk -= 4;
    factors.push({
      kind: "strength",
      title: "Encryption in transit indicated",
      detail: "Capture protocol versions, cipher suites, and mutual TLS if used.",
    });
  }

  if (!hasText(s5.encryptionDetails, 20)) {
    risk += 5;
    factors.push({
      kind: "concern",
      title: "Cryptographic implementation under-documented",
      detail: "Section 5.6 should reference algorithms, key custody, and rotation practices.",
    });
  }

  const s6 = answers.section6;
  if (!hasText(s6.logsDescription, 25)) {
    risk += 10;
    factors.push({
      kind: "concern",
      title: "Logging / audit trail description is thin",
      detail: "Security operations need clarity on events captured, fields, and immutability.",
    });
  }
  if (s6.sensitiveInLogs === "yes") {
    risk += 12;
    factors.push({
      kind: "concern",
      title: "Sensitive data may appear in logs",
      detail: "Redaction, masking, or structured logging policies are usually required.",
    });
  }
  if (s6.logsLinkToUsers === "no") {
    risk += 8;
    factors.push({
      kind: "concern",
      title: "Audit trails may not tie actions to individuals",
      detail: "Non-repudiation is weaker; clarify correlation identifiers or shared account mitigations.",
    });
  }

  const s7 = answers.section7;
  if (!hasText(s7.bcpPlan, 25)) {
    risk += 9;
    factors.push({
      kind: "concern",
      title: "Business continuity / DR evidence limited",
      detail: "Expect RTO/RPO targets, backup encryption, restore testing, and vendor responsibilities.",
    });
  } else {
    risk -= 3;
    factors.push({
      kind: "strength",
      title: "Continuity considerations documented",
      detail: "Supports operational resilience review.",
    });
  }

  const sem = scanSemanticSecuritySignals(answers);
  risk += sem.riskDelta;
  factors.push(...sem.factors);

  risk = clamp(Math.round(risk), 0, 100);
  const core = finalizeFromRisk(risk, factors, s1.subcategories);
  const domainScores = computeHeuristicDomainScores(answers);
  const institutionalInterpretation = buildChecklistInterpretation(domainScores);
  return {
    ...core,
    domainScores,
    institutionalInterpretation,
    analysisMeta: { hasLlmLayer: false },
  };
}
