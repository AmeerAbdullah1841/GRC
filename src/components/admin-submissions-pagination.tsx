import {
  adminPageItems,
  adminSubmissionsHref,
  ADMIN_SUBMISSIONS_PAGE_SIZE,
} from "@/lib/admin-pagination";
import Link from "next/link";

type Props = {
  query: string;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  rangeStart: number;
  rangeEnd: number;
};

export function AdminSubmissionsPagination({
  query,
  currentPage,
  totalPages,
  totalRecords,
  rangeStart,
  rangeEnd,
}: Props) {
  if (totalRecords === 0) return null;

  const pageItems = adminPageItems(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav
      className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Submissions pagination"
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {totalRecords === 0 ? (
          <>No records</>
        ) : (
          <>
            Showing <strong className="text-zinc-900 dark:text-zinc-100">{rangeStart}</strong>
            &ndash;
            <strong className="text-zinc-900 dark:text-zinc-100">{rangeEnd}</strong> of{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">{totalRecords}</strong> record
            {totalRecords === 1 ? "" : "s"}
            {totalPages > 1 ? (
              <>
                {" "}
                &middot; Page <strong className="text-zinc-900 dark:text-zinc-100">{currentPage}</strong> of{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">{totalPages}</strong>
              </>
            ) : null}
          </>
        )}
      </p>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-1">
          {prevDisabled ? (
            <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-400 dark:border-zinc-700">
              Previous
            </span>
          ) : (
            <Link
              href={adminSubmissionsHref(query, currentPage - 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Previous
            </Link>
          )}

          <div className="flex items-center gap-1 px-1">
            {pageItems.map((item, i) =>
              item === null ? (
                <span key={`gap-${i}`} className="px-1 text-xs text-zinc-500 dark:text-zinc-500">
                  …
                </span>
              ) : item === currentPage ? (
                <span
                  key={item}
                  className="min-w-[2rem] rounded-lg bg-emerald-700 px-2.5 py-1.5 text-center text-xs font-medium text-white dark:bg-emerald-600"
                  aria-current="page"
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={adminSubmissionsHref(query, item)}
                  className="min-w-[2rem] rounded-lg border border-zinc-300 px-2.5 py-1.5 text-center text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {item}
                </Link>
              ),
            )}
          </div>

          {nextDisabled ? (
            <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-400 dark:border-zinc-700">
              Next
            </span>
          ) : (
            <Link
              href={adminSubmissionsHref(query, currentPage + 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Next
            </Link>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          {ADMIN_SUBMISSIONS_PAGE_SIZE} records per page
        </p>
      )}
    </nav>
  );
}
