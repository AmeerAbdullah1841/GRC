import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const line = env.split(/\r?\n/).find((l) => l.startsWith("OPENAI_API_KEY="));
const key = line?.slice("OPENAI_API_KEY=".length).replace(/^["']|["']$/g, "").trim();
const model = env.match(/^OPENAI_MODEL="?([^"\n]+)"?/m)?.[1]?.trim() || "gpt-4o-mini";

if (!key?.startsWith("sk-")) {
  console.error("FAIL: OPENAI_API_KEY missing or invalid format in .env");
  process.exit(1);
}

const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    model,
    max_tokens: 20,
    messages: [{ role: "user", content: "Reply with exactly: AI OK" }],
  }),
});

const body = await res.json();
if (res.ok) {
  const text = body.choices?.[0]?.message?.content ?? "";
  console.log("OK: OpenAI responded:", text.trim());
  process.exit(0);
}

console.error("FAIL:", res.status, body.error?.message ?? JSON.stringify(body));
process.exit(1);
