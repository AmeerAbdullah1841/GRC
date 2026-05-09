"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminRequestActions({
  submissionId,
  currentStatus,
}: {
  submissionId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function patch(status: "APPROVED" | "REJECTED") {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Update failed");
        return;
      }
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (currentStatus !== "PENDING") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This request was already marked <strong>{currentStatus}</strong>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">Decision notes (optional)</span>
        <textarea
          className="min-h-[80px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes for the record…"
        />
      </label>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void patch("APPROVED")}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void patch("REJECTED")}
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-zinc-950 dark:text-red-200 dark:hover:bg-red-950/40"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
