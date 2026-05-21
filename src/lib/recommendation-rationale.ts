export type AnalysisFactor = {
  kind: "strength" | "concern" | "info";
  title: string;
  detail: string;
};

export type SecurityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SystemRecommendation = "APPROVE" | "REVIEW" | "NOT_RECOMMENDED";

export function partitionFactors(factors: AnalysisFactor[]) {
  const concerns = factors.filter((f) => f.kind === "concern");
  const strengths = factors.filter((f) => f.kind === "strength");
  const info = factors.filter((f) => f.kind === "info");
  return { concerns, strengths, info };
}

/** Human-readable rationale when AI does not supply one. */
export function buildChecklistRecommendationRationale(
  recommendation: SystemRecommendation,
  riskScore: number,
  securityLevel: SecurityLevel,
  factors: AnalysisFactor[],
): string {
  const { concerns, strengths } = partitionFactors(factors);
  const recLabel = recommendation.replaceAll("_", " ");

  if (recommendation === "APPROVE") {
    return `Automated assessment: risk score ${riskScore} (${securityLevel}) is within the low-risk band for advisory approval. ${
      strengths.length > 0
        ? "Supporting controls and narratives are listed below."
        : "Review supporting points below before final sign-off."
    }`;
  }

  if (recommendation === "NOT_RECOMMENDED") {
    return `Automated assessment: risk score ${riskScore} (${securityLevel}) exceeds the review threshold (above 68/100). The combination of answers suggests material gaps or contradictions in security posture. Address the concerning points below—or obtain compensating controls and evidence—before proceeding.`;
  }

  return `Automated assessment: risk score ${riskScore} (${securityLevel}) falls in the manual-review band. This is not an automatic rejection; security staff should validate the ${
    concerns.length
  } concern(s) and ${strengths.length} strength(s) below, request evidence where needed, then approve or reject.`;
}
