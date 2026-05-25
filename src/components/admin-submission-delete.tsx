"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  submissionId: string;
  companyName: string;
};

export function AdminSubmissionDelete({ submissionId, companyName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  async function confirmDelete() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Could not delete submission.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50"
        aria-label={`Delete submission for ${companyName}`}
      >
        Delete
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              role="presentation"
              onClick={() => {
                if (!busy) setOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-submission-title"
                className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
              >
                <h2
                  id="delete-submission-title"
                  className="text-left text-lg font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Delete submission
                </h2>
                <p className="mt-3 text-left text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  Are you sure you want to delete this submission?
                </p>
                <p className="mt-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">{companyName}</p>
                <p className="mt-1 text-left text-xs text-zinc-600 dark:text-zinc-400">
                  This permanently removes the questionnaire, AI review, and decision history. This cannot be undone.
                </p>

                {err ? <p className="mt-3 text-left text-sm text-red-700 dark:text-red-300">{err}</p> : null}

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmDelete()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
                  >
                    {busy ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
