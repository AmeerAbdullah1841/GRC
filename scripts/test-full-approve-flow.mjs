/**
 * Full flow without Next.js: load PENDING submission → send vendor email (same as admin PATCH).
 */
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

const requirePrisma = createRequire(
  resolve(root, "web/node_modules/@prisma/client/package.json"),
);
const requireSg = createRequire(
  resolve(root, "web/node_modules/@sendgrid/mail/package.json"),
);
const { PrismaClient } = requirePrisma("@prisma/client");
const sgMail = requireSg("@sendgrid/mail");

const prisma = new PrismaClient();
const submissionId = process.argv[2] || "cmpecdd4z0000vv1gxu0nos5i";
const action = process.argv[3] || "APPROVED";

const existing = await prisma.submission.findUnique({ where: { id: submissionId } });
if (!existing) {
  console.error("Submission not found:", submissionId);
  process.exit(1);
}
if (existing.status !== "PENDING") {
  console.log(`Submission already ${existing.status} — skipping DB update.`);
  console.log("Testing email only to:", existing.contactEmail);
}

const apiKey = process.env.SENDGRID_API_KEY?.trim();
const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
const fromName =
  process.env.SENDGRID_FROM_NAME?.trim() || "University Vendor Security Intake";

if (!apiKey || !fromEmail) {
  console.error("SendGrid not configured in .env");
  process.exit(1);
}

const isApproved = action === "APPROVED";
const subject = isApproved
  ? "Your security questionnaire proposal has been approved"
  : "Update on your security questionnaire proposal";
const headline = isApproved
  ? "Congratulations! Your proposal has been approved."
  : "We regret to inform you that your proposal has been rejected.";
const greeting = existing.contactName.trim()
  ? `Hello ${existing.contactName},`
  : "Hello,";

sgMail.setApiKey(apiKey);
let emailSent = false;
let emailError = null;

try {
  const [res] = await sgMail.send({
    to: existing.contactEmail.trim(),
    from: { email: fromEmail, name: fromName },
    subject,
    text: `${greeting}\n\n${headline}\n\nOrganization: ${existing.companyName}`,
    html: `<p>${greeting}</p><p><strong>${headline}</strong></p><p>Organization: ${existing.companyName}</p>`,
  });
  emailSent = res.statusCode >= 200 && res.statusCode < 300;
  console.log("SendGrid status:", res.statusCode);
} catch (e) {
  emailError =
    e.response?.body?.errors?.map((x) => x.message).join("; ") || e.message;
}

if (existing.status === "PENDING" && emailSent) {
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: action,
      adminNotes: "Automated test — SendGrid flow verification",
      reviewedAt: new Date(),
    },
  });
  console.log("DB updated to", action);
}

console.log("\n--- Result ---");
console.log("Vendor:", existing.contactEmail);
console.log("Company:", existing.companyName);
console.log("emailSent:", emailSent);
if (emailError) console.log("emailError:", emailError);

await prisma.$disconnect();
process.exit(emailSent ? 0 : 1);
