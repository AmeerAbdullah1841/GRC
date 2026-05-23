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

const apiKey = process.env.SENDGRID_API_KEY?.trim();
const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
const fromName = process.env.SENDGRID_FROM_NAME?.trim() || "University Vendor Security Intake";
const to = process.argv[2]?.trim() || fromEmail;

if (!apiKey || !fromEmail) {
  console.error("FAIL: SENDGRID_API_KEY or SENDGRID_FROM_EMAIL missing in .env");
  process.exit(1);
}

sgMail.setApiKey(apiKey);

async function send(label, subject) {
  try {
    const [res] = await sgMail.send({
      to,
      from: { email: fromEmail, name: fromName },
      subject,
      text: `${label} — SendGrid test from GRC app at ${new Date().toISOString()}`,
      html: `<p><strong>${label}</strong> — SendGrid test from GRC vendor intake app.</p>`,
    });
    console.log(`OK ${label}: status ${res.statusCode}`);
    return true;
  } catch (e) {
    const errors = e.response?.body?.errors;
    console.error(`FAIL ${label}:`, errors?.map((x) => x.message).join("; ") || e.message);
    return false;
  }
}

console.log(`From: ${fromEmail}`);
console.log(`To: ${to}`);
console.log("---");

const approved = await send(
  "APPROVED (vendor email simulation)",
  "Your security questionnaire proposal has been approved",
);
const rejected = await send(
  "REJECTED (vendor email simulation)",
  "Update on your security questionnaire proposal",
);

process.exit(approved && rejected ? 0 : 1);
