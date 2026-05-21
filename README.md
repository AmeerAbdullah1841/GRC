This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The Next.js app lives at the **repository root** (not in a `web/` subfolder). In Vercel project settings:

1. **Root Directory** — leave empty (`.`). If it was set to `web`, clear it and save.
2. **Framework Preset** — **Next.js** (not “Other”).
3. **Build Command** — leave default (`npm run build`). Run `npx prisma migrate deploy` once against production `DATABASE_URL` before or after the first deploy.
4. **Environment variables** (Production) — copy from `.env.example`:
   - `DATABASE_URL` (PostgreSQL, e.g. Vercel Postgres or Neon)
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
   - Optional: `SENDGRID_*`, `OPENAI_*`
5. **Redeploy** after changing settings (Deployments → ⋯ → Redeploy).

A blank Vercel **404 NOT_FOUND** page usually means the root directory pointed at the wrong folder or the framework was not detected as Next.js.
