"use client";

import { isContactEmailValid, isContactInfoValid } from "@/lib/contact-validation";
import { emptyQuestionnaire, type QuestionnaireAnswers } from "@/lib/questionnaire-types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IntroPanel,
  Section1,
  Section2,
  Section3,
  Section4,
  Section5,
  Section6,
  Section7,
  Section8,
} from "./submit-sections";

const STEP_LABELS = [
  "Introduction & company",
  "Data classification",
  "Vendor IT services",
  "Identity & access",
  "Network",
  "Data protection",
  "Logging & auditing",
  "Business continuity",
  "Other comments",
  "Review & submit",
];

export function SubmitWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(() => emptyQuestionnaire());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const last = STEP_LABELS.length - 1;
  const introStepValid = isContactInfoValid(companyName, contactName, contactEmail);

  async function submit() {
    setErr(null);
    if (!introStepValid) {
      setErr("Please complete company and contact information on the first step.");
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          answers,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Submission failed");
        return;
      }
      if (data.id) router.push(`/submit/done?id=${encodeURIComponent(data.id)}`);
    } catch {
      setErr("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  function renderStep() {
    const p = { data: answers, set: setAnswers };
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col gap-6">
            <IntroPanel />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Organization / company name *
                <input
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Primary contact name *
                <input
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </label>
              <label className="sm:col-span-2 flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Contact email *
                <input
                  type="email"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                {contactEmail.trim() && !isContactEmailValid(contactEmail) ? (
                  <span className=" ml-3 text-xs font-normal text-amber-700 dark:text-red-500">
                    Enter a valid email
                  </span>
                ) : null}
              </label>
            </div>
          </div>
        );
      case 1:
        return <Section1 {...p} />;
      case 2:
        return <Section2 {...p} />;
      case 3:
        return <Section3 {...p} />;
      case 4:
        return <Section4 {...p} />;
      case 5:
        return <Section5 {...p} />;
      case 6:
        return <Section6 {...p} />;
      case 7:
        return <Section7 {...p} />;
      case 8:
        return <Section8 {...p} />;
      case 9:
        return (
          <div className="flex flex-col gap-4 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              You are about to submit a security questionnaire for <strong>{companyName || "—"}</strong>.
            </p>
            <p>
              After submission, the university will receive your responses together with an automated risk
              summary. Status remains pending until an administrator approves or rejects the request.
            </p>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Step {step + 1} of {STEP_LABELS.length}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {STEP_LABELS[step]}
        </h1>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        {renderStep()}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          disabled={step === 0 || busy}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </button>
        {step < last ? (
          <button
            type="button"
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            disabled={busy || (step === 0 && !introStepValid)}
            onClick={() => setStep((s) => Math.min(last, s + 1))}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Submitting…" : "Submit questionnaire"}
          </button>
        )}
      </div>
    </div>
  );
}
