import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/chip.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/55" />
      <SiteHeader />
      <main className="relative flex flex-1 justify-end px-4 pb-16 pt-10 sm:px-10 sm:pt-12 lg:px-16">
        <div className="flex w-[36rem] max-w-full flex-col items-start gap-6">
          <div className="w-full text-left">
            <h1 className="mt-5 text-2xl font-bold leading-snug text-white sm:mt-8 sm:text-3xl">
              Software and service security intake
            </h1>
            <p className="mt-3 text-base font-medium leading-relaxed text-zinc-200 sm:text-lg">
              Vendors and project sponsors submit structured answers about data classification, access
              controls, encryption, logging, and continuity. Each submission receives an automated risk score
              and a non-binding recommendation for the security review team.
            </p>
          </div>

          <div className="mt-5 flex w-full flex-wrap justify-start gap-4">
            <Link
              href="/submit"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-100"
            >
              Start vendor questionnaire
            </Link>
            <Link
              href="/submit/upload"
              className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-black/30 px-6 py-3 text-sm font-medium text-white shadow-sm backdrop-blur-sm hover:bg-black/50"
            >
              Upload vendor questionnaire
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
