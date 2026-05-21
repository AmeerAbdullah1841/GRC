"use client";

import { useState, type ReactNode } from "react";

type TabId = "review" | "questionnaire";

export function AdminRequestTabs({
  aiReview,
  questionnaire,
}: {
  aiReview: ReactNode;
  questionnaire: ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("review");

  const btn = (id: TabId, label: string) => {
    const active = tab === id;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setTab(id)}
        className={
          active
            ? "rounded-lg border border-transparent bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "rounded-lg border border-white bg-transparent px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100/50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
        }
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Submission review"
        className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800"
      >
        {btn("review", "AI review")}
        {btn("questionnaire", "Vendor questionnaire responses")}
      </div>

      <div role="tabpanel" hidden={tab !== "review"} className={tab === "review" ? "flex flex-col gap-8" : "hidden"}>
        {aiReview}
      </div>

      <div
        role="tabpanel"
        hidden={tab !== "questionnaire"}
        className={tab === "questionnaire" ? "flex flex-col gap-4" : "hidden"}
      >
        {questionnaire}
      </div>
    </div>
  );
}
