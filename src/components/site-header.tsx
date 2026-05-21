import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          University vendor security intake
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/submit" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Vendor form
          </Link>
          <Link href="/admin/login" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
