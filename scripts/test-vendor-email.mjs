import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv(file) {
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv(resolve(root, ".env"));

const require = createRequire(
  resolve(root, "web/node_modules/@sendgrid/mail/package.json"),
);
const sgMail = require("@sendgrid/mail");

// Mirrors send-vendor-decision-email.ts
async function sendVendorDecisionEmail(input) {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
  const fromName =
    process.env.SENDGRID_FROM_NAME?.trim() || "University Vendor Security Intake";
  if (!apiKey || !fromEmail) {
    return { sent: false, error: "SendGrid not configured" };
  }

  const isApproved = input.status === "APPROVED";
  const subject = isApproved
    ? "Your security questionnaire proposal has been approved"
    : "Update on your security questionnaire proposal";
  const headline = isApproved
    ? "Congratulations! Your proposal has been approved."
    : "We regret to inform you that your proposal has been rejected.";
  const greeting = input.contactName.trim()
    ? `Hello ${input.contactName},`
    : "Hello,";

  sgMail.setApiKey(apiKey);
  try {
    await sgMail.send({
      to: input.to.trim(),
      from: { email: fromEmail, name: fromName },
      subject,
      text: `${greeting}\n\n${headline}\n\nOrganization: ${input.companyName}`,
      html: `<p>${greeting}</p><p><strong>${headline}</strong></p><p>Organization: ${input.companyName}</p>`,
    });
    return { sent: true };
  } catch (e) {
    const msg =
      e.response?.body?.errors?.map((x) => x.message).join("; ") || e.message;
    return { sent: false, error: msg };
  }
}

const to = process.argv[2]?.trim() || process.env.SENDGRID_FROM_EMAIL?.trim();

console.log("Testing app email logic (same as admin approve/reject)...\n");

for (const status of ["APPROVED", "REJECTED"]) {
  const result = await sendVendorDecisionEmail({
    to,
    contactName: "Test Vendor",
    companyName: "Acme Corp (test)",
    status,
    adminNotes: status === "REJECTED" ? "Test rejection note from admin." : null,
  });
  console.log(
    `${status}: ${result.sent ? "email sent" : "FAILED"}${result.error ? ` — ${result.error}` : ""}`,
  );
}
