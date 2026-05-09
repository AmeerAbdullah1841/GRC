import { AdminLoginForm } from "@/app/admin/login/login-form";
import { SiteHeader } from "@/components/site-header";
import { getAdminSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <AdminLoginForm />
      </main>
    </div>
  );
}
