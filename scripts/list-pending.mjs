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
  resolve(root, "web/node_modules/@prisma/client/package.json"),
);
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const rows = await prisma.submission.findMany({
  orderBy: { createdAt: "desc" },
  take: 5,
  select: {
    id: true,
    status: true,
    contactEmail: true,
    companyName: true,
    contactName: true,
  },
});

console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
