import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Software and service security intake
          </h1>
          <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Vendors and project sponsors submit structured answers about data classification, access
            controls, encryption, logging, and continuity. Each submission receives an automated risk score
            and a non-binding recommendation for the security review team.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/submit"
            className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Start vendor questionnaire
          </Link>
          <Link
            href="/submit/upload"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Upload vendor questionnaire
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Admin sign-in
          </Link>
        </div>
      </main>
    </div>
  );
}
