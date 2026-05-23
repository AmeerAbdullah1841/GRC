import { AdminDomainRatings } from "@/components/admin-domain-ratings";
import { AdminQuestionnaireReview } from "@/components/admin-questionnaire-review";
import { AdminRequestActions } from "@/components/admin-request-actions";
import { AdminRequestTabs } from "@/components/admin-request-tabs";
import { AdminReviewBreakdown } from "@/components/admin-review-breakdown";
import { SiteHeader } from "@/components/site-header";
import { parseStoredAnalysis } from "@/lib/analyze-submission";
import { prisma } from "@/lib/db";
import { mergeQuestionnaireAnswers } from "@/lib/merge-questionnaire";
import type { QuestionnaireAnswers } from "@/lib/questionnaire-types";
import { SECURITY_DOMAIN_IDS, type SecurityDomainId } from "@/lib/security-domains";
import { getAdminSession } from "@/lib/session";
import { isDocumentUpload } from "@/lib/upload-questionnaire";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string; emailMsg?: string; decided?: string }>;
};

function recBadge(rec: string) {
  if (rec === "APPROVE") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  if (rec === "REVIEW") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
}

function storedDomainScores(stored: Record<string, number> | null): Record<SecurityDomainId, number> | null {
  if (!stored) return null;
  const out = {} as Record<SecurityDomainId, number>;
  for (const id of SECURITY_DOMAIN_IDS) {
    const v = stored[id];
    if (typeof v !== "number" || Number.isNaN(v)) return null;
    out[id] = Math.min(100, Math.max(0, Math.round(v)));
  }
  return out;
}

export default async function AdminRequestDetailPage({ params, searchParams }: Params) {
  if (!(await getAdminSession())) redirect("/admin/login");

  const { id } = await params;
  const sp = await searchParams;
  const row = await prisma.submission.findUnique({ where: { id } });
  if (!row) notFound();

  let answers: QuestionnaireAnswers | null = null;
  try {
    answers = mergeQuestionnaireAnswers(JSON.parse(row.answersJson));
  } catch {
    answers = null;
  }

  const parsed = parseStoredAnalysis(row.analysisFactorsJson);
  const factors = parsed.factors;
  const domainScores = storedDomainScores(parsed.domainScores);
  const interpretation = parsed.institutionalInterpretation?.trim() || null;
  const recommendationRationale = parsed.recommendationRationale?.trim() || null;
  const analysisMeta = parsed.meta;
  const hasOpenAiReview = Boolean(analysisMeta?.hasLlmLayer);
  const uploadedDocument = answers ? isDocumentUpload(answers) : false;

  const aiReviewPanel = (
    <>
      {hasOpenAiReview ? (
        <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
          This review was generated entirely by <strong>AI</strong>. All scores, summaries, and bullet points below
          come from the AI analysis of the{" "}
          {uploadedDocument ? "uploaded questionnaire document" : "vendor questionnaire"}.
        </p>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          This submission was analyzed before OpenAI-only mode or without a successful AI pass. Submit a new
          questionnaire to generate a full OpenAI review.
        </p>
      )}

      {hasOpenAiReview ? (
        <>
          <AdminReviewBreakdown
            recommendation={row.recommendation}
            recommendationRationale={recommendationRationale}
            factors={factors}
            model={analysisMeta?.model}
          />

          {interpretation ? (
            <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Institutional security read</h2>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{interpretation}</p>
            </section>
          ) : null}

          {domainScores ? <AdminDomainRatings domainScores={domainScores} /> : null}
        </>
      ) : null}

      <details className="rounded-xl border border-zinc-200 dark:border-zinc-800">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Raw JSON (technical)
        </summary>
        <pre className="max-h-[360px] overflow-auto border-t border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100 dark:border-zinc-800">
          {answers ? JSON.stringify(answers, null, 2) : row.answersJson}
        </pre>
      </details>
    </>
  );

  const questionnairePanel = (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Full questions and answers as submitted by the vendor. Compare with the AI review tab before approving or
        rejecting.
      </p>
      {answers ? (
        <AdminQuestionnaireReview answers={answers} />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Could not load questionnaire responses.</p>
      )}
    </>
  );

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <Link href="/admin" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
          ← All submissions
        </Link>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{row.companyName}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {row.contactName} · {row.contactEmail}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Submitted {row.createdAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            {uploadedDocument && answers?.uploadMeta ? (
              <> · Document upload: {answers.uploadMeta.fileName}</>
            ) : null}
          </p>
        </header>

        <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-600 dark:text-zinc-400">Risk score</p>
            <p className="text-2xl font-mono font-semibold text-zinc-900 dark:text-zinc-50">{row.riskScore}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-zinc-600 dark:text-zinc-400">Sensitivity band</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{row.securityLevel}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-zinc-600 dark:text-zinc-400">AI recommendation</p>
            <p className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-medium ${recBadge(row.recommendation)}`}>
              {row.recommendation.replaceAll("_", " ")}
            </p>
          </div>
        </section>

        {sp.email === "sent" ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            Decision saved. A notification email was sent to <strong>{row.contactEmail}</strong>.
          </p>
        ) : null}
        {sp.email === "failed" ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            <strong>Decision saved</strong>, but the vendor was <strong>not</strong> emailed.
            {sp.emailMsg ? (
              <>
                {" "}
                {sp.emailMsg}
              </>
            ) : (
              " Check SendGrid credits and verified sender."
            )}
          </p>
        ) : null}

        <AdminRequestTabs aiReview={aiReviewPanel} questionnaire={questionnairePanel} />

        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Decision</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Final approve or reject is always your call as the administrator.</p>
          <AdminRequestActions submissionId={row.id} currentStatus={row.status} />
          {row.adminNotes ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              <span className="font-medium">Notes on file:</span> {row.adminNotes}
            </p>
          ) : null}
          {row.reviewedAt ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Reviewed {row.reviewedAt.toLocaleString()}</p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
