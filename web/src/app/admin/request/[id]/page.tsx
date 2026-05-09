import { AdminRequestActions } from "@/components/admin-request-actions";
import { SiteHeader } from "@/components/site-header";
import { parseStoredAnalysis } from "@/lib/analyze-submission";
import { buildChecklistInterpretation, computeHeuristicDomainScores } from "@/lib/domain-risk-scores";
import { prisma } from "@/lib/db";
import type { QuestionnaireAnswers } from "@/lib/questionnaire-types";
import {
  SECURITY_DOMAIN_COPY,
  SECURITY_DOMAIN_IDS,
  type SecurityDomainId,
} from "@/lib/security-domains";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Params = { params: Promise<{ id: string }> };

function recBadge(rec: string) {
  if (rec === "APPROVE") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  if (rec === "REVIEW") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
}

function mergeDomainScores(
  answers: QuestionnaireAnswers | null,
  stored: Record<string, number> | null,
): Record<SecurityDomainId, number> | null {
  if (!answers && !stored) return null;
  const baseline = answers ? computeHeuristicDomainScores(answers) : null;
  if (!stored && baseline) return baseline;
  if (!stored) return null;
  const out = baseline ? { ...baseline } : ({} as Record<SecurityDomainId, number>);
  for (const id of SECURITY_DOMAIN_IDS) {
    const v = stored[id];
    if (typeof v === "number" && !Number.isNaN(v)) {
      out[id] = Math.min(100, Math.max(0, Math.round(v)));
    } else if (!(id in out) && baseline) {
      out[id] = baseline[id];
    } else if (!(id in out)) {
      out[id] = 0;
    }
  }
  return out;
}

export default async function AdminRequestDetailPage({ params }: Params) {
  if (!(await getAdminSession())) redirect("/admin/login");

  const { id } = await params;
  const row = await prisma.submission.findUnique({ where: { id } });
  if (!row) notFound();

  let answers: QuestionnaireAnswers | null = null;
  try {
    answers = JSON.parse(row.answersJson) as QuestionnaireAnswers;
  } catch {
    answers = null;
  }

  const parsed = parseStoredAnalysis(row.analysisFactorsJson);
  const factors = parsed.factors;
  const domainScores = mergeDomainScores(answers, parsed.domainScores);
  const interpretation =
    parsed.institutionalInterpretation?.trim() ||
    (domainScores ? buildChecklistInterpretation(domainScores) : null);
  const analysisMeta = parsed.meta;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
            ← All submissions
          </Link>
        </div>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{row.companyName}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {row.contactName} · {row.contactEmail}
          </p>
          <p className="text-xs text-zinc-500">
            Submitted {row.createdAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
          </p>
        </header>

        <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Risk score</p>
            <p className="text-2xl font-mono font-semibold text-zinc-900 dark:text-zinc-50">{row.riskScore}</p>
            <p className="text-xs text-zinc-500">0 = lowest modeled concern in this rubric, 100 = highest.</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Sensitivity band</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{row.securityLevel}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Automated recommendation</p>
            <p className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-medium ${recBadge(row.recommendation)}`}>
              {row.recommendation.replaceAll("_", " ")}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Advisory only — your decision should incorporate policy, contracts, and interviews not captured
              in the form.
            </p>
          </div>
        </section>

        {analysisMeta?.hasLlmLayer ? (
          <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
            This submission includes an <strong>OpenAI</strong> security pass
            {analysisMeta.model ? ` (${analysisMeta.model})` : ""} on top of checklist and pattern analysis.
          </p>
        ) : (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
            Checklist + semantic pattern analysis only. Set <code className="font-mono">OPENAI_API_KEY</code> for an
            additional institutional narrative and refined domain scores.
          </p>
        )}

        {interpretation ? (
          <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Institutional security read
            </h2>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{interpretation}</p>
          </section>
        ) : null}

        {domainScores ? (
          <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Security domain ratings</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Each bar is 0–100 residual risk for that domain if answers are accurate. Higher = more follow-up
                expected before approval. Domain names reflect why the university asks the related questions.
              </p>
            </div>
            <ul className="flex flex-col gap-5">
              {SECURITY_DOMAIN_IDS.map((domainId) => {
                const score = domainScores[domainId];
                const copy = SECURITY_DOMAIN_COPY[domainId];
                return (
                  <li key={domainId} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{copy.title}</span>
                      <span className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {score}
                        <span className="text-xs font-normal text-zinc-500">/100</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-amber-500 dark:bg-amber-600"
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{copy.universityIntent}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Detailed factors</h2>
          {factors.length === 0 ? (
            <p className="text-sm text-zinc-500">No factor list stored for this submission.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {factors.map((f, i) => (
                <li
                  key={`${f.title}-${i}`}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/60"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{f.title}</span>
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      f.kind === "strength"
                        ? "bg-emerald-200/80 text-emerald-900"
                        : f.kind === "concern"
                          ? "bg-amber-200/80 text-amber-900"
                          : "bg-zinc-200 text-zinc-800"
                    }`}
                  >
                    {f.kind}
                  </span>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">{f.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Decision</h2>
          <AdminRequestActions submissionId={row.id} currentStatus={row.status} />
          {row.adminNotes ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium">Notes on file:</span> {row.adminNotes}
            </p>
          ) : null}
          {row.reviewedAt ? (
            <p className="text-xs text-zinc-500">Reviewed {row.reviewedAt.toLocaleString()}</p>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Raw questionnaire (JSON)</h2>
          <pre className="max-h-[480px] overflow-auto rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100 dark:border-zinc-800">
            {answers ? JSON.stringify(answers, null, 2) : row.answersJson}
          </pre>
        </section>
      </main>
    </div>
  );
}
