import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Params) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    status?: "APPROVED" | "REJECTED";
    adminNotes?: string;
  };

  if (body.status !== "APPROVED" && body.status !== "REJECTED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.submission.update({
    where: { id },
    data: {
      status: body.status,
      adminNotes: body.adminNotes?.trim() || null,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
