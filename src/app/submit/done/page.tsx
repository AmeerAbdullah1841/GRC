import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export default async function SubmitDonePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-6 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Thank you</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your responses were recorded. The security office will review your submission; you will be
          contacted using the email you provided if additional information is required.
        </p>
        {id ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            Reference: {id}
          </p>
        ) : null}
        <Link href="/" className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400">
          Return home
        </Link>
      </main>
    </div>
  );
}
