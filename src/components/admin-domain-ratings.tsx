import {
  SECURITY_DOMAIN_COPY,
  SECURITY_DOMAIN_IDS,
  type SecurityDomainId,
} from "@/lib/security-domains";

export function AdminDomainRatings({
  domainScores,
}: {
  domainScores: Record<SecurityDomainId, number>;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Security domain ratings</h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Each bar is 0–100 residual risk for that domain if answers are accurate. Higher = more follow-up expected
          before approval.
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
                  <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">/100</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-500 dark:bg-amber-600"
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{copy.universityIntent}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
