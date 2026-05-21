import { prisma } from "@/lib/db";
import { sendVendorDecisionEmail } from "@/lib/send-vendor-decision-email";
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

  const existing = await prisma.submission.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json(
      { error: `This submission was already ${existing.status.toLowerCase()}.` },
      { status: 409 },
    );
  }

  const updated = await prisma.submission.update({
    where: { id },
    data: {
      status: body.status,
      adminNotes: body.adminNotes?.trim() || null,
      reviewedAt: new Date(),
    },
  });

  const emailResult = await sendVendorDecisionEmail({
    to: updated.contactEmail,
    contactName: updated.contactName,
    companyName: updated.companyName,
    status: body.status,
    adminNotes: updated.adminNotes,
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    emailSent: emailResult.sent,
    emailError: emailResult.error ?? null,
  });
}
