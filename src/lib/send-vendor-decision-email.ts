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

function buildMessage(
  status: VendorDecisionEmailInput["status"],
  companyName: string,
) {
  const org = companyName.trim() || "your organization";
  if (status === "APPROVED") {
    return {
      subject: `Vendor security intake — approved (${org})`,
      preheader: "Your questionnaire was reviewed and approved by the security office.",
      headline: "Your security questionnaire has been approved",
      body: "The university security office has completed its review and approved your vendor security questionnaire submission.",
    };
  }
  return {
    subject: `Vendor security intake — decision (${org})`,
    preheader: "Your questionnaire was reviewed. See the decision details below.",
    headline: "Your security questionnaire was not approved",
    body: "The university security office has completed its review. Your vendor security questionnaire was not approved at this time.",
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

  const { subject, preheader, headline, body } = buildMessage(
    input.status,
    input.companyName,
  );
  const greeting = input.contactName.trim() ? `Hello ${input.contactName},` : "Hello,";
  const replyTo = process.env.SENDGRID_REPLY_TO?.trim() || fromEmail;

  const notesBlock =
    input.adminNotes?.trim() ?
      `<p style="margin:16px 0 0;color:#52525b;font-size:14px;"><strong>Reviewer note:</strong> ${escapeHtml(input.adminNotes.trim())}</p>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;color:#18181b;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr>
      <td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:28px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 12px;font-size:17px;font-weight:600;line-height:1.4;">${escapeHtml(headline)}</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">${escapeHtml(body)}</p>
        <p style="margin:0;font-size:14px;color:#52525b;"><strong>Organization:</strong> ${escapeHtml(input.companyName)}</p>
        ${notesBlock}
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
          Automated notification from the university vendor security intake system.
          Reply to this message if you have questions about your submission.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = [
    greeting,
    "",
    headline,
    body,
    "",
    `Organization: ${input.companyName}`,
    input.adminNotes?.trim() ? `Reviewer note: ${input.adminNotes.trim()}` : "",
    "",
    "— University vendor security intake (automated notification)",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: input.to.trim(),
      from: { email: fromEmail, name: fromName },
      replyTo,
      subject,
      text,
      html,
      categories: ["vendor-decision"],
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
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
