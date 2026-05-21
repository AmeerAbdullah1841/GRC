"use server";

import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function adminLogout() {
  (await cookies()).delete(ADMIN_SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
