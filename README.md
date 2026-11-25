# Flow 2.0 — Free AI Image & Video Generator

Flow 2.0 is a free AI image & video generator web app:

- **Text-to-Video** — 5 free video generations per day (rolling 24-hour window),
  rendered as real 8-second MP4 files with a cinematic camera move.
- **Text-to-Image** — unlimited free image generations.
- Accounts with salted-hash passwords, per-user creations library, and an
  admin dashboard for the site owner (the first registered account).

Canonical deployment: **https://flow2-0.vercel.app**

---

## Deploy it yourself: GitHub → Vercel (step by step)

You need two free accounts: [GitHub](https://github.com) and
[Vercel](https://vercel.com) (sign in to Vercel with GitHub). No credit card
and no environment variables are required.

### Step 1 — Create the GitHub repository

1. Go to https://github.com/new
2. **Owner:** `gamerlazy590-maker`
3. **Repository name:** `flow2-0`
4. Set it to **Public**.
5. Do **not** tick "Add a README file", ".gitignore", or a license — this
   project already ships all of those files.
6. Click **Create repository**. Leave the empty repo page open; you will push
   to it in Step 3.

### Step 2 — Unzip the project

1. In the Flow 2.0 app, open **Publishing & deployment** and click
   **Download the full project (.zip)**.
2. Unzip `flow2-0-project.zip`. You get a single folder named **`flow2-0`**
   containing the complete project:

   ```
   flow2-0/
   ├── README.md            ← this file
   ├── DEPLOY.md            ← deployment runbook (settings reference)
   ├── package.json         ← scripts + dependencies
   ├── bun.lock             ← dependency lockfile
   ├── vercel.json          ← Vercel build/output/rewrite/header config
   ├── robots.txt, sitemap.xml
   ├── client/              ← React app (src, index.html, build script)
   ├── server/              ← server actions, auth, database schema
   ├── drizzle/             ← database migrations
   └── tools/               ← project-export generator script
   ```

   Not included on purpose: `node_modules` (rebuilt from `package.json`),
   build outputs (`client/dist`, `server/dist`), and the live app's database
   and user media — your deployment starts with a fresh, empty database.

### Step 3 — Push the code to GitHub

**Option A — Git command line** (install Git from https://git-scm.com if
needed). Run these inside the unzipped `flow2-0` folder:

```bash
git init
git add .
git commit -m "Flow 2.0 — initial release"
git branch -M main
git remote add origin https://github.com/gamerlazy590-maker/flow2-0.git
git push -u origin main
```

**Option B — GitHub Desktop:** File → Add local repository → choose the
`flow2-0` folder → commit → "Publish repository" (name it `flow2-0`, public).

**Option C — Web upload:** on the empty repo page, click
"uploading an existing file" and drag in the folder's contents (not the
folder itself), then commit. (Fine for a first push; Git is easier for
updates.)

Refresh the repo page — you should see `client/`, `server/`, `drizzle/`,
`package.json`, `vercel.json`, and this README.

### Step 4 — Import the repo in Vercel

1. Go to https://vercel.com/new (or Dashboard → **Add New → Project**).
2. Under **Import Git Repository**, find **`gamerlazy590-maker/flow2-0`** and
   click **Import**. (If it isn't listed, click "Adjust GitHub App
   Permissions" and grant Vercel access to the repo.)
3. **Project Name:** `flow2-0` — this is what gives you the
   `flow2-0.vercel.app` subdomain.
4. **Framework Preset:** leave as detected / "Other". `vercel.json` already
   declares everything Vercel needs:
   - Build command: `bun run build`
   - Output directory: `client/dist`
   - SPA rewrites for `/studio` and `/admin`, plus security headers.
5. Root Directory: `./` (the repo root).

### Step 5 — Environment variables

**None required.** Leave the Environment Variables section empty — accounts,
video credits, and creations are stored in the app's own database, and
generated media is stored as files served from the app itself.

### Step 6 — Deploy

1. Click **Deploy** and wait for the build to finish (about 1–2 minutes).
2. Vercel shows your live URL: **https://flow2-0.vercel.app**
3. Every future `git push` to `main` redeploys automatically.

### Step 7 — Post-deploy checklist

- Open https://flow2-0.vercel.app and confirm the title reads
  "Flow 2.0 — Free AI Video & Image Generator".
- **Register the first account** — it automatically becomes the site owner
  and unlocks the `/admin` dashboard.
- Submit `https://flow2-0.vercel.app/sitemap.xml` in
  [Google Search Console](https://search.google.com/search-console) so the
  site gets indexed.

---

## Local development

```bash
bun install            # install dependencies
bun run build          # regenerate the export manifest, build server + client
```

The downloadable project ZIP inside the app is assembled from an embedded
copy of these source files (`server/src/projectExport.generated.ts`),
produced by `tools/build-project-export.mjs`. It runs automatically as part
of `bun run build`; run it on its own with `bun run export:manifest` after
editing sources so the in-app download always matches the code.

## How it works

- **Auth:** email + password, salted PBKDF2-SHA256 hashes, server-side
  session tokens. First registered account = owner/admin.
- **Credits:** 5 video generations per user per rolling 24 hours; images
  unlimited. Counters live in the `users` table (`daily_video_count`,
  `last_reset_at`).
- **Generation:** images are rendered by the AI media tool into owned file
  storage. Videos render a cinematic AI keyframe, then encode a real
  8-second MP4 (ffmpeg, chosen camera move: zoom in/out, pan left/right).
- **Data:** `users`, `sessions`, and `creations` tables (see
  `server/src/schema.ts` and the migrations in `drizzle/`).

## Troubleshooting

- **`@hatch/space-sdk` not found during install:** in `package.json` this
  package points at a local path (`file:/opt/hatch/...`) from the original
  build environment. Point it at the SDK package provided by your hosting
  environment, or vendor the package into the repo and update the path.
- **Wrong subdomain:** the Vercel *project name* controls the subdomain —
  rename the project to `flow2-0` in Vercel → Settings → General.
- **SPA routes 404 on Vercel:** make sure the repo-root `vercel.json` was
  pushed; it contains the `/studio` and `/admin` rewrites.
