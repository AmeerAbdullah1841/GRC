import type { QuestionnaireAnswers } from "@/lib/questionnaire-types";

export type SemanticFactor = {
  kind: "strength" | "concern" | "info";
  title: string;
  detail: string;
};

type PatternRule = {
  re: RegExp;
  /** Points added to risk score (positive = worse). */
  risk: number;
  title: string;
  detail: string;
};

/** Concatenate free-text fields for pattern-based security triage (not length-only). */
export function buildSecurityTextCorpus(a: QuestionnaireAnswers): string {
  const parts = [
    a.section1.nonPublicExplanation,
    a.section2.servicesDescription,
    a.section2.acquisitionOtherDetail,
    a.section3.externalEntities,
    a.section3.authorizationProcess,
    a.section3.authorizationLevels,
    a.section3.accessApprover,
    a.section3.accountDeprovisioning,
    a.section3.authOtherDetail,
    a.section3.localPasswordPolicy,
    a.section3.localPasswordStorage,
    a.section3.sessionTimeout,
    a.section4.networkOtherDetail,
    a.section4.networkDiagramNotes,
    a.section4.nonNetworkAccess,
    a.section5.dataExportRestrictions,
    a.section5.shadowCopies,
    a.section5.interfacesWithOtherSystems,
    a.section5.encryptionDetails,
    a.section6.logsDescription,
    a.section6.accessLoggingDetail,
    a.section6.logRetention,
    a.section7.bcpPlan,
    a.section8.otherComments,
  ];
  return parts.join("\n\n").toLowerCase();
}

/**
 * Lexical / pattern scan for common insecure practices described in prose.
 * Interprets wording, not character count alone (though it cannot verify truth).
 */
export function scanSemanticSecuritySignals(answers: QuestionnaireAnswers): {
  riskDelta: number;
  factors: SemanticFactor[];
} {
  const corpus = buildSecurityTextCorpus(answers);
  if (corpus.trim().length < 8) {
    return { riskDelta: 0, factors: [] };
  }

  const concernPatterns: PatternRule[] = [
    {
      re: /\b(plain[- ]?text|cleartext|unencrypted|no encryption|without encryption|not encrypted)\b/i,
      risk: 14,
      title: "Language suggests missing or weak encryption",
      detail:
        "Responses mention cleartext, lack of encryption, or similar. Verify data at rest and in transit, key management, and contractual requirements.",
    },
    {
      re: /\b(password|credential|secret|api key|token)\b.{0,40}\b(plain|visible|email|log|ticket|slack|screenshot)\b/i,
      risk: 16,
      title: "Possible exposure of credentials or secrets",
      detail:
        "Wording hints credentials may be stored or shared insecurely (logs, email, chat). Expect vaulting, rotation, and secret scanning in CI/CD.",
    },
    {
      re: /\b(public|world[- ]readable|open)\b.{0,30}\b(s3|bucket|blob|storage|database|db|api)\b/i,
      risk: 15,
      title: "Public or overly open data store / API described",
      detail:
        "Public buckets, open databases, or anonymous APIs are high-impact findings if they touch university or personal data. Confirm network and IAM boundaries.",
    },
    {
      re: /\b(no|without|missing)\b.{0,20}\b(ssl|tls|https)\b|\bhttp only\b|\bnon[- ]https\b/i,
      risk: 12,
      title: "Weak or absent transport protection implied",
      detail: "TLS for all client and server-to-server paths is a baseline expectation over untrusted networks.",
    },
    {
      re: /\b(log|logs|logging)\b.{0,50}\b(public|everyone|shared|unrestricted|no access control|open access)\b/i,
      risk: 14,
      title: "Audit logs may be broadly accessible",
      detail:
        "If logs contain security events or metadata, access should be role-restricted, tamper-evident, and separated from application admin roles where possible.",
    },
    {
      re: /\b(admin|root|superuser)\b.{0,40}\b(bypass|disable|skip|no password|blank password)\b/i,
      risk: 12,
      title: "Privileged access or authentication bypass language",
      detail: "Backdoors and auth bypasses are critical findings; require removal, compensating controls, and code review evidence.",
    },
    {
      re: /\b(sql injection|command injection|remote code|eval\s*\(|deserialize|xxe|ssrf)\b/i,
      risk: 10,
      title: "Classic application vulnerability classes mentioned",
      detail:
        "If the vendor acknowledges these classes, request secure SDLC evidence (SAST/DAST), input validation, patch cadence, and incident response.",
    },
    {
      re: /\b(shared account|one password|same password|generic login)\b/i,
      risk: 10,
      title: "Shared or generic accounts implied",
      detail: "Non-unique identities weaken accountability and incident response; push for per-user accounts and federation.",
    },
    {
      re: /\b(no audit|no logging|don'?t log|logging disabled|minimal logs)\b/i,
      risk: 11,
      title: "Weak or absent security logging implied",
      detail: "Forensics and breach detection depend on authentication, authorization, and admin action logs with retention and integrity controls.",
    },
    {
      re: /\b(default password|password.?123|hardcoded password|embedded password)\b/i,
      risk: 13,
      title: "Insecure default or hardcoded credentials implied",
      detail: "Require elimination of default creds, secure bootstrap, and secrets management.",
    },
  ];

  const strengthPatterns: PatternRule[] = [
    {
      re: /\b(mfa|2fa|two[- ]factor|multi[- ]factor|totp|webauthn|passkey)\b/i,
      risk: -6,
      title: "Multi-factor authentication described",
      detail: "Positive control for account takeover resistance when paired with lifecycle management.",
    },
    {
      re: /\b(tls\s*1\.[23]|aes[- ]?256|chacha20|argon2|bcrypt|scrypt|pbkdf2|salted hash|hmac)\b/i,
      risk: -5,
      title: "Modern crypto primitives referenced",
      detail: "Corroborate with architecture review; still verify configuration and key custody.",
    },
    {
      re: /\b(immutable logs|tamper[- ]evident|waf|siem|soc|centralized logging|log integrity)\b/i,
      risk: -5,
      title: "Security monitoring or log integrity language",
      detail: "Supports detection and response if implemented as described.",
    },
    {
      re: /\b(least privilege|rbac|abac|zero trust|network segmentation|microsegmentation)\b/i,
      risk: -4,
      title: "Defense-in-depth / least privilege vocabulary",
      detail: "Align described model with data flows and admin interfaces.",
    },
  ];

  const factors: SemanticFactor[] = [];
  let riskDelta = 0;
  const matchedConcernRes: RegExp[] = [];
  const matchedStrengthRes: RegExp[] = [];

  for (const p of concernPatterns) {
    if (p.re.test(corpus)) {
      matchedConcernRes.push(p.re);
      riskDelta += p.risk;
      factors.push({ kind: "concern", title: p.title, detail: p.detail });
    }
  }
  for (const p of strengthPatterns) {
    if (p.re.test(corpus)) {
      matchedStrengthRes.push(p.re);
      riskDelta += p.risk;
      factors.push({ kind: "strength", title: p.title, detail: p.detail });
    }
  }

  if (factors.length > 0) {
    factors.unshift({
      kind: "info",
      title: "Semantic text scan (pattern-based)",
      detail:
        "The following signals were derived from wording in narrative fields—not from live testing. Treat as triage hints to validate in interviews and evidence review.",
    });
  }

  riskDelta = Math.min(45, Math.max(-20, Math.round(riskDelta)));
  return { riskDelta, factors };
}
