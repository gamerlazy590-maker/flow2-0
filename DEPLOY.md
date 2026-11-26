# Flow 2.0 — Deployment Notes (Vercel version)

**Canonical domain:** https://flow2-0.vercel.app/
(`flow2.com` and `flow20.com` are already taken, so the free Vercel subdomain
`flow2-0.vercel.app` is the canonical host. It is the URL used in the page
title/meta, Open Graph tags, JSON-LD `SoftwareApplication`, `sitemap.xml`,
`robots.txt`, the footer, and the admin/login branding.)

## What this build is

A plain static site: Vite + React + TypeScript, built with
`npm run build` into `dist/`. No server, no database, no environment
variables, no API keys, no proprietary runtime. Only npm-published
packages.

## Deploying to Vercel (free tier)

1. Push this project to the GitHub repo `gamerlazy590-maker/flow2-0`
   (replacing the old, non-deployable code).
2. Import the repo in Vercel as project **`flow2-0`** — that is what makes
   the deployment land on `https://flow2-0.vercel.app`.
3. `vercel.json` at the project root already declares:
   - `buildCommand: npm run build`
   - `outputDirectory: dist`
   - SPA rewrites for `/studio` and `/admin`
   - Baseline security headers (`X-Content-Type-Options`, `Referrer-Policy`)
4. No environment variables are required.

## Post-deploy checklist

- Open https://flow2-0.vercel.app/ and confirm the title reads
  "Flow 2.0 — Free AI Video & Image Generator".
- Register the first account — it becomes the site owner (in that browser)
  and unlocks `/admin`.
- Generate one image and one video; confirm the 8-second clip plays and
  downloads as WebM.
- Submit `https://flow2-0.vercel.app/sitemap.xml` in Google Search Console.
