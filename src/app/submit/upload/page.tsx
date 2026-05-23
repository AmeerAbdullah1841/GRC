import { SiteHeader } from "@/components/site-header";
import { UploadQuestionnaireForm } from "@/components/upload-questionnaire-form";
import Link from "next/link";

export default function UploadQuestionnairePage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
            ← Home
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Upload vendor questionnaire</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Submit a document you already completed offline. AI will review the extracted text and record the
            submission for the security team.
          </p>
        </div>
        <UploadQuestionnaireForm />
      </main>
    </div>
  );
}
