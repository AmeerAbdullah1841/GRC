"use client";

import type { AuditReportMeta, AuditReportReview } from "@/lib/audit-report-types";
import { useRef, useState } from "react";

type Props = {
  meta: AuditReportMeta | undefined;
  review: AuditReportReview | undefined;
  onUploaded: (meta: AuditReportMeta, review: AuditReportReview) => void;
  onClear: () => void;
  compact?: boolean;
};

export function AuditReportUpload({ meta, review, onUploaded, onClear, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch("/api/audit-report/analyze", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        meta?: AuditReportMeta;
        review?: AuditReportReview;
        error?: string;
      };

      if (!res.ok || !data.meta || !data.review) {
        setErr(data.error ?? "Audit report analysis failed.");
        return;
      }

      onUploaded(data.meta, data.review);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50 ${compact ? "p-4" : "p-5"}`}
    >
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Audit report (optional)</p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Upload SOC 2, ISO 27001, pen test summary, or similar. AI will analyze the report for the admin
          review panel.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {meta && review ? (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-950 dark:text-emerald-100">
            Audit report uploaded: {meta.fileName}
          </p>
          <p className="text-xs text-emerald-900 dark:text-emerald-200">
            {review.compliancePosture} — AI review ready for admin panel.
          </p>
          <button
            type="button"
            onClick={onClear}
            className="self-start text-xs font-medium text-emerald-800 underline hover:no-underline dark:text-emerald-300"
          >
            Remove audit report
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex w-fit items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {busy ? "Analyzing audit report…" : "Upload Audit report"}
        </button>
      )}

      {err ? (
        <p className="text-xs text-red-700 dark:text-red-300">{err}</p>
      ) : null}
    </div>
  );
}
