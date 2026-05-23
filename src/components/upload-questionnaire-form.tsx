"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

export function UploadQuestionnaireForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!companyName.trim() || !contactName.trim() || !contactEmail.trim()) {
      setErr("Company name, contact name, and email are required.");
      return;
    }

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr("Please choose a PDF, DOCX, or TXT file.");
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.set("companyName", companyName.trim());
      form.set("contactName", contactName.trim());
      form.set("contactEmail", contactEmail.trim());
      form.set("file", file);

      const res = await fetch("/api/submissions/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Upload failed.");
        return;
      }
      router.push(`/submit/done?id=${encodeURIComponent(data.id ?? "")}`);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
        Upload a completed vendor security questionnaire (PDF, DOCX, or TXT). The system extracts the text and
        runs the same AI security review used for the online form. Maximum file size: 10 MB.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Company / vendor name
          <input
            className={inputClass}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="organization"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Contact name
          <input
            className={inputClass}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">
          Contact email
          <input
            type="email"
            className={inputClass}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Questionnaire file
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="mt-2 block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
        />
      </label>

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {err}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {busy ? "Uploading and analyzing…" : "Submit uploaded questionnaire"}
        </button>
        <Link
          href="/submit"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Use the online form instead
        </Link>
      </div>
    </form>
  );
}
