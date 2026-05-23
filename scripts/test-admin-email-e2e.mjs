/**
 * End-to-end: admin login → approve/reject pending submission → verify emailSent.
 * Usage: node scripts/test-admin-email-e2e.mjs [baseUrl] [submissionId]
 * Default baseUrl: http://localhost:3001
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const base = (process.argv[2] || "http://localhost:3001").replace(/\/$/, "");
const submissionId = process.argv[3] || "cmpecdd4z0000vv1gxu0nos5i";
const password = process.env.ADMIN_PASSWORD || "admin1234";

function parseSetCookie(header) {
  if (!header) return "";
  const parts = Array.isArray(header) ? header : [header];
  return parts.map((c) => c.split(";")[0]).join("; ");
}

console.log(`Base URL: ${base}`);
console.log(`Submission: ${submissionId}`);
console.log("---");

const loginRes = await fetch(`${base}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password }),
});
const loginBody = await loginRes.json();
const cookie = parseSetCookie(loginRes.headers.get("set-cookie"));

if (!loginRes.ok) {
  console.error("Login failed:", loginRes.status, loginBody);
  process.exit(1);
}
console.log("Login: OK");

const patchRes = await fetch(`${base}/api/admin/submissions/${submissionId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookie,
  },
  body: JSON.stringify({
    status: "APPROVED",
    adminNotes: "E2E test — SendGrid verification",
  }),
});
const patchBody = await patchRes.json();

console.log(`PATCH status: ${patchRes.status}`);
console.log("Response:", JSON.stringify(patchBody, null, 2));

if (!patchRes.ok) {
  process.exit(1);
}

if (patchBody.emailSent) {
  console.log("\nSUCCESS: Admin approve flow sent email to vendor.");
} else {
  console.log("\nFAIL: Submission updated but email not sent.");
  if (patchBody.emailError) console.log("Error:", patchBody.emailError);
  process.exit(1);
}
