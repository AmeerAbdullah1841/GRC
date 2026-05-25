"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  defaultQuery: string;
  filteredCount: number;
  rangeStart: number;
  rangeEnd: number;
  currentPage: number;
  totalPages: number;
};

export function AdminSubmissionsSearch({
  defaultQuery,
  filteredCount,
  rangeStart,
  rangeEnd,
  currentPage,
  totalPages,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultQuery);

  useEffect(() => {
    setValue(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    const next = value.trim();
    const current = (searchParams.get("q") ?? "").trim();
    if (next === current) return;

    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 280);

    return () => window.clearTimeout(handle);
  }, [value, pathname, router, searchParams]);

  const hasQuery = value.trim().length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <label htmlFor="admin-submissions-search" className="sr-only">
          Search submissions
        </label>
        <span
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <input
          id="admin-submissions-search"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search company, contact, email, risk, status, recommendation, date…"
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-24 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          autoComplete="off"
          spellCheck={false}
        />
        {hasQuery ? (
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {hasQuery ? (
          <>
            <strong>{filteredCount}</strong> record{filteredCount === 1 ? "" : "s"} match &ldquo;{value.trim()}&rdquo;
            {filteredCount > 0 ? (
              <>
                {" "}
                &middot; viewing {rangeStart}&ndash;{rangeEnd}
                {totalPages > 1 ? ` (page ${currentPage} of ${totalPages})` : null}
              </>
            ) : null}
          </>
        ) : (
          <>
            <strong>{filteredCount}</strong> total record{filteredCount === 1 ? "" : "s"}
            {filteredCount > 0 ? (
              <>
                {" "}
                &middot; viewing {rangeStart}&ndash;{rangeEnd}
                {totalPages > 1 ? ` (page ${currentPage} of ${totalPages})` : null}
              </>
            ) : null}
            {" "}
            — search company, contact, email, risk, status, recommendation, and more
          </>
        )}
      </p>
    </div>
  );
}
