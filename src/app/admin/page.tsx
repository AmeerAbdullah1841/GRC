import { adminLogout } from "@/app/admin/actions";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

function statusStyle(status: string) {
  if (status === "PENDING") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
}

export default async function AdminDashboardPage() {
  if (!(await getAdminSession())) redirect("/admin/login");

  const rows = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      companyName: true,
      contactEmail: true,
      status: true,
      riskScore: true,
      securityLevel: true,
      recommendation: true,
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
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

        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">System view</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-600 dark:text-zinc-400">
                    No submissions yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/80">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/request/${r.id}`}
                        className="font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-400"
                      >
                        {r.companyName}
                      </Link>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">{r.contactEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono">{r.riskScore}</span>
                      <span className="text-zinc-400"> / </span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">{r.securityLevel}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.recommendation.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {r.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
