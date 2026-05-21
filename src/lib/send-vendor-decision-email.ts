import sgMail from "@sendgrid/mail";
import type { SubmissionStatus } from "@prisma/client";

export type VendorDecisionEmailInput = {
  to: string;
  contactName: string;
  companyName: string;
  status: Extract<SubmissionStatus, "APPROVED" | "REJECTED">;
  adminNotes?: string | null;
};

function sendGridConfigured() {
  return Boolean(process.env.SENDGRID_API_KEY?.trim() && process.env.SENDGRID_FROM_EMAIL?.trim());
}

function buildMessage(status: VendorDecisionEmailInput["status"]) {
  if (status === "APPROVED") {
    return {
      subject: "Your security questionnaire proposal has been approved",
      headline: "Congratulations! Your proposal has been approved.",
      body: "The university security office has reviewed your submission and approved your proposal.",
    };
  }
  return {
    subject: "Update on your security questionnaire proposal",
    headline: "We regret to inform you that your proposal has been rejected.",
    body: "The university security office has reviewed your submission and did not approve your proposal at this time.",
  };
}

export async function sendVendorDecisionEmail(
  input: VendorDecisionEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  if (!sendGridConfigured()) {
    console.warn("[email] SendGrid not configured — skipping vendor notification.");
    return { sent: false, error: "SendGrid is not configured (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL)." };
  }

  const apiKey = process.env.SENDGRID_API_KEY!.trim();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL!.trim();
  const fromName = process.env.SENDGRID_FROM_NAME?.trim() || "University Vendor Security Intake";

  const { subject, headline, body } = buildMessage(input.status);
  const greeting = input.contactName.trim() ? `Hello ${input.contactName},` : "Hello,";

  const notesBlock =
    input.adminNotes?.trim() ?
      `<p style="margin:16px 0 0;color:#52525b;font-size:14px;"><strong>Reviewer note:</strong> ${escapeHtml(input.adminNotes.trim())}</p>`
    : "";

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;color:#18181b;">
      <p style="font-size:15px;">${escapeHtml(greeting)}</p>
      <p style="font-size:18px;font-weight:600;margin:20px 0 8px;">${escapeHtml(headline)}</p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;">${escapeHtml(body)}</p>
      <p style="font-size:14px;color:#52525b;margin-top:16px;"><strong>Organization:</strong> ${escapeHtml(input.companyName)}</p>
      ${notesBlock}
      <p style="margin-top:24px;font-size:12px;color:#71717a;">This is an automated message from the university vendor security intake system.</p>
    </div>
  `.trim();

  const text = [
    greeting,
    "",
    headline,
    body,
    "",
    `Organization: ${input.companyName}`,
    input.adminNotes?.trim() ? `Reviewer note: ${input.adminNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: input.to.trim(),
      from: { email: fromEmail, name: fromName },
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (e) {
    const message = formatSendGridError(e);
    console.error("[email]", message);
    return { sent: false, error: message };
  }
}

function formatSendGridError(e: unknown): string {
  const err = e as {
    message?: string;
    response?: { body?: { errors?: { message?: string }[] } };
  };
  const apiMessages = err.response?.body?.errors
    ?.map((x) => x.message)
    .filter(Boolean) as string[] | undefined;
  if (apiMessages?.length) {
    const joined = apiMessages.join(" ");
    if (joined.toLowerCase().includes("maximum credits exceeded")) {
      return "SendGrid account has no sending credits left. Add credits or upgrade your SendGrid plan, then try again.";
    }
    if (joined.toLowerCase().includes("verified")) {
      return `SendGrid rejected the sender: ${joined} Verify ${process.env.SENDGRID_FROM_EMAIL} as a Single Sender in SendGrid.`;
    }
    return joined;
  }
  return err.message ?? "Failed to send email via SendGrid.";
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
