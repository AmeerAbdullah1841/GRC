import { adminLogout } from "@/app/admin/actions";
import { AdminSubmissionDelete } from "@/components/admin-submission-delete";
import { AdminSubmissionsPagination } from "@/components/admin-submissions-pagination";
import { AdminSubmissionsSearch } from "@/components/admin-submissions-search";
import { SiteHeader } from "@/components/site-header";
import {
  ADMIN_SUBMISSIONS_PAGE_SIZE,
  parseAdminPageParam,
} from "@/lib/admin-pagination";
import { buildAdminSubmissionSearchWhere } from "@/lib/admin-submission-search";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function statusStyle(status: string) {
  if (status === "PENDING") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
}

const rowSelect = {
  id: true,
  createdAt: true,
  companyName: true,
  contactName: true,
  contactEmail: true,
  status: true,
  riskScore: true,
  securityLevel: true,
  recommendation: true,
} as const;

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  if (!(await getAdminSession())) redirect("/admin/login");

  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const where = buildAdminSubmissionSearchWhere(query);

  const filteredCount = await prisma.submission.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredCount / ADMIN_SUBMISSIONS_PAGE_SIZE));
  const requestedPage = parseAdminPageParam(pageParam);
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * ADMIN_SUBMISSIONS_PAGE_SIZE;

  const rows = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: ADMIN_SUBMISSIONS_PAGE_SIZE,
    select: rowSelect,
  });

  const rangeStart = filteredCount === 0 ? 0 : skip + 1;
  const rangeEnd = skip + rows.length;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Submissions</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              New requests stay pending until you approve or reject them.
            </p>
          </div>
          <form action={adminLogout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>

        <Suspense
          fallback={
            <div className="h-10 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" aria-hidden />
          }
        >
          <AdminSubmissionsSearch
            defaultQuery={query}
            filteredCount={filteredCount}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </Suspense>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="whitespace-nowrap px-3 py-3">Risk</th>
                <th className="whitespace-nowrap px-3 py-3">System view</th>
                <th className="whitespace-nowrap px-3 py-3">Status</th>
                <th className="w-0 whitespace-nowrap px-3 py-3">Submitted</th>
                <th className="w-0 whitespace-nowrap py-3 pl-3 pr-8 text-right sm:pr-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 dark:text-zinc-400">
                    {filteredCount === 0 && !query
                      ? "No submissions yet."
                      : query
                        ? `No submissions match "${query}".`
                        : "No submissions yet."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/80">
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/admin/request/${r.id}`}
                        className="font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-400"
                      >
                        {r.companyName}
                      </Link>
                      <div className="mt-0.5 break-all text-xs text-zinc-600 dark:text-zinc-400">
                        {r.contactName} · {r.contactEmail}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top">
                      <span className="font-mono">{r.riskScore}</span>
                      <span className="text-zinc-400"> / </span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">{r.securityLevel}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top text-xs">
                      {r.recommendation.replaceAll("_", " ")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="w-0 whitespace-nowrap px-3 py-3 align-top text-xs text-zinc-600 dark:text-zinc-400">
                      {r.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="w-0 whitespace-nowrap py-3 pl-3 pr-8 align-top text-right sm:pr-10">
                      <AdminSubmissionDelete submissionId={r.id} companyName={r.companyName} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <AdminSubmissionsPagination
            query={query}
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={filteredCount}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </div>
      </main>
    </div>
  );
}
