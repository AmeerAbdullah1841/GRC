/**
 * Security domains aligned to the questionnaire sections.
 * Each score is 0–100 where **higher = more residual risk** from the answers (self-reported; not pentested).
 */
export const SECURITY_DOMAIN_IDS = [
  "DATA_CLASSIFICATION_AND_PRIVACY",
  "VENDOR_AND_SUPPLY_CHAIN",
  "IDENTITY_AND_ACCESS",
  "NETWORK_AND_EXPOSURE",
  "DATA_PROTECTION_CRYPTO",
  "LOGGING_AND_AUDIT",
  "RESILIENCE_AND_CONTINUITY",
] as const;

export type SecurityDomainId = (typeof SECURITY_DOMAIN_IDS)[number];

export const SECURITY_DOMAIN_COPY: Record<
  SecurityDomainId,
  { title: string; universityIntent: string }
> = {
  DATA_CLASSIFICATION_AND_PRIVACY: {
    title: "Data classification & privacy",
    universityIntent:
      "Establishes the sensitivity of university data in scope so baseline confidentiality, legal duties (e.g. FERPA/HIPAA), minimization, and downstream controls can be proportionate.",
  },
  VENDOR_AND_SUPPLY_CHAIN: {
    title: "Vendor & supply chain",
    universityIntent:
      "Ongoing vendor IT services shift operational and legal risk to third parties; the university must align procurement, contracts, SLAs, exit plans, and security attestations before reliance.",
  },
  IDENTITY_AND_ACCESS: {
    title: "Identity, access & authorization",
    universityIntent:
      "Defines who may use the system and how access is granted, reviewed, and revoked—core to preventing unauthorized or inappropriate access to non-public information.",
  },
  NETWORK_AND_EXPOSURE: {
    title: "Network exposure",
    universityIntent:
      "Scope of connectivity drives attack surface and monitoring expectations (campus-only vs Internet, segmentation, remote access).",
  },
  DATA_PROTECTION_CRYPTO: {
    title: "Data protection & cryptography",
    universityIntent:
      "Confirms protections for data at rest and in transit and how cryptography is implemented—essential when data crosses untrusted networks or vendor infrastructure.",
  },
  LOGGING_AND_AUDIT: {
    title: "Logging & audit",
    universityIntent:
      "Security operations and investigations depend on attributable, complete, and appropriately protected audit trails—not logs that leak sensitive data or are trivially accessible.",
  },
  RESILIENCE_AND_CONTINUITY: {
    title: "Resilience & continuity",
    universityIntent:
      "Ensures the university can recover data and service after incidents; weak continuity increases institutional impact even when preventive controls exist.",
  },
};

export function emptyDomainScores(): Record<SecurityDomainId, number> {
  return SECURITY_DOMAIN_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<SecurityDomainId, number>,
  );
}
