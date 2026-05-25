import type { Prisma, SubmissionStatus, SystemRecommendation } from "@prisma/client";

const STATUSES: SubmissionStatus[] = ["PENDING", "APPROVED", "REJECTED"];
const RECOMMENDATIONS: SystemRecommendation[] = ["APPROVE", "REVIEW", "NOT_RECOMMENDED"];

function normalizeTerm(term: string) {
  return term.trim().toLowerCase();
}

function matchStatus(term: string): SubmissionStatus | null {
  const t = normalizeTerm(term).replace(/\s+/g, "");
  if (!t) return null;
  if (t.includes("pending")) return "PENDING";
  if (t.includes("reject")) return "REJECTED";
  if (t.includes("approved") || t === "approve") return "APPROVED";
  const upper = term.trim().toUpperCase();
  if (STATUSES.includes(upper as SubmissionStatus)) return upper as SubmissionStatus;
  return null;
}

function matchRecommendation(term: string): SystemRecommendation | null {
  const t = normalizeTerm(term);
  if (!t) return null;
  if (t.includes("not") && t.includes("recommend")) return "NOT_RECOMMENDED";
  if (t.includes("review")) return "REVIEW";
  if (t.includes("approve")) return "APPROVE";
  const upper = term.trim().toUpperCase().replace(/\s+/g, "_");
  if (RECOMMENDATIONS.includes(upper as SystemRecommendation)) return upper as SystemRecommendation;
  return null;
}

function matchSecurityLevel(term: string): string | null {
  const upper = term.trim().toUpperCase();
  if (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(upper)) return upper;
  return null;
}

function matchYear(term: string): number | null {
  const y = parseInt(term.trim(), 10);
  if (term.trim().length === 4 && y >= 2000 && y <= 2100) return y;
  return null;
}

function matchMonth(term: string): number | null {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const t = normalizeTerm(term);
  const idx = months.findIndex((m) => m.startsWith(t) || t.startsWith(m.slice(0, 3)));
  return idx >= 0 ? idx : null;
}

/** Build Prisma filter for admin submissions search (`?q=`). */
export function buildAdminSubmissionSearchWhere(query: string): Prisma.SubmissionWhereInput | undefined {
  const term = query.trim();
  if (!term) return undefined;

  const contains: Prisma.StringFilter = { contains: term, mode: "insensitive" };
  const or: Prisma.SubmissionWhereInput[] = [
    { companyName: contains },
    { contactName: contains },
    { contactEmail: contains },
    { securityLevel: contains },
    { adminNotes: contains },
    { answersJson: contains },
    { analysisFactorsJson: contains },
    { id: contains },
  ];

  const status = matchStatus(term);
  if (status) or.push({ status });

  const recommendation = matchRecommendation(term);
  if (recommendation) or.push({ recommendation });

  const level = matchSecurityLevel(term);
  if (level) or.push({ securityLevel: level });

  const risk = parseInt(term, 10);
  if (!Number.isNaN(risk) && risk >= 0 && risk <= 100) {
    or.push({ riskScore: risk });
  }

  const year = matchYear(term);
  if (year !== null) {
    or.push({
      createdAt: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    });
  }

  const month = matchMonth(term);
  if (month !== null) {
    const yearForMonth = year ?? new Date().getUTCFullYear();
    or.push({
      createdAt: {
        gte: new Date(Date.UTC(yearForMonth, month, 1)),
        lt: new Date(Date.UTC(yearForMonth, month + 1, 1)),
      },
    });
  }

  return { OR: or };
}
