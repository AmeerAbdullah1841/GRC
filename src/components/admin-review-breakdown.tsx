import type { AnalysisFactor } from "@/lib/analyze-submission";
import { partitionFactors } from "@/lib/recommendation-rationale";

function FactorList({
  items,
  emptyMessage,
  variant,
}: {
  items: AnalysisFactor[];
  emptyMessage: string;
  variant: "concern" | "strength";
}) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>;
  }
  const border =
    variant === "concern"
      ? "border-amber-200 dark:border-amber-900/60"
      : "border-emerald-200 dark:border-emerald-900/60";
  const bg =
    variant === "concern"
      ? "bg-amber-50/80 dark:bg-amber-950/30"
      : "bg-emerald-50/80 dark:bg-emerald-950/30";

  return (
    <ol className="flex list-decimal flex-col gap-3 pl-5">
      {items.map((f, i) => (
        <li
          key={`${f.title}-${i}`}
          className={`rounded-lg border px-4 py-3 text-sm ${border} ${bg}`}
        >
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{f.title}</p>
          <p className="mt-1 leading-relaxed text-zinc-700 dark:text-zinc-200">{f.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export function AdminReviewBreakdown({
  recommendation,
  recommendationRationale,
  factors,
  hasAi,
}: {
  recommendation: string;
  recommendationRationale: string | null;
  factors: AnalysisFactor[];
  hasAi: boolean;
}) {
  const { concerns, strengths, info } = partitionFactors(factors);
  const aiSummary = info.find((f) => f.title.includes("AI executive summary"));
  const recLabel = recommendation.replaceAll("_", " ");

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Why the system says: {recLabel}
        </h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {hasAi
            ? "OpenAI reviewed the full questionnaire in a university security context. Points below are self-reported and advisory."
            : "Generated from checklist rules and text-pattern scan (no OpenAI on this submission). Add credits + API key for richer narrative."}
        </p>
      </div>

      {recommendationRationale ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-100">
          {recommendationRationale}
        </div>
      ) : null}

      {aiSummary ? (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Executive summary</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{aiSummary.detail}</p>
        </div>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Concerning / risky points ({concerns.length})
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          These drove the risk score up or triggered follow-up. Validate with interviews and evidence.
        </p>
        <div className="mt-3">
          <FactorList
            items={concerns}
            variant="concern"
            emptyMessage="No specific concerns were flagged in the automated review."
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          Supporting / positive points ({strengths.length})
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {recommendation === "NOT_RECOMMENDED"
            ? "Even high-risk submissions may show some good controls—these do not override critical gaps without verification."
            : "These answers or controls reduced modeled risk or support approval with conditions."}
        </p>
        <div className="mt-3">
          <FactorList
            items={strengths}
            variant="strength"
            emptyMessage="No strengths were identified in the automated review."
          />
        </div>
      </div>
    </section>
  );
}
