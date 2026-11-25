# Flow 2.0 — Deployment Notes

**Canonical domain:** https://flow2-0.vercel.app/
(`flow2.com` and `flow20.com` are already taken, so the free Vercel subdomain
`flow2-0.vercel.app` is the canonical host. It is the URL used in the page
title/meta, Open Graph tags, JSON-LD `SoftwareApplication`, `sitemap.xml`,
`robots.txt`, the footer, and the admin/login branding.)

## Deploying to Vercel (free tier)

1. Push this project to a Git repository and import it in the Vercel dashboard
   (or run `vercel` from the project root).
2. When Vercel asks for a project name, use **`flow2-0`** — that is what makes
   the deployment land on `https://flow2-0.vercel.app`.
3. `vercel.json` at the project root already declares:
   - `outputDirectory: client/dist`
   - SPA rewrites for `/studio`, `/admin`, `/sitemap.xml`, and `/robots.txt`
     (the app serves the sitemap/robots documents from its Docs & SEO section;
     the standalone `sitemap.xml` and `robots.txt` files at the project root
     carry the identical content for static hosting)
   - Baseline security headers (`X-Content-Type-Options`, `Referrer-Policy`)
4. No environment variables are required for the free tier. The app data
   (accounts, credits, creations) is stored in the app's own database, and
   generated media is stored as owned blobs served from the app origin.

## Post-deploy checklist

- Open https://flow2-0.vercel.app/ and confirm the title reads
  "Flow 2.0 — Free AI Video & Image Generator".
- Register the first account — it becomes the site owner and unlocks `/admin`.
- Submit `https://flow2-0.vercel.app/sitemap.xml` in Google Search Console.
