import { ADMIN_SESSION_COOKIE_NAME, signAdminSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Server is not configured for admin login." }, { status: 500 });
  }
  if (password !== expected) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  let token: string;
  try {
    token = await signAdminSession();
  } catch {
    return NextResponse.json({ error: "Server session secret missing or too short." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
