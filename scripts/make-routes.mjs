// Flow 2.0 — make /studio and /admin load as real static pages.
//
// Vercel's rewrites in vercel.json are not taking effect on this project
// (stale dashboard Build/Output overrides), so /studio and /admin return
// Vercel 404s even though the app is a single-page app. The reliable fix
// that needs no dashboard change: ship real copies of the built index.html
// at dist/studio/index.html and dist/admin/index.html. Vercel serves
// existing static files directly, and the app picks the view from the URL
// path, so both routes open the right screen.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "dist", "index.html");
if (!existsSync(src)) {
  console.error("make-routes: dist/index.html not found — run vite build first");
  process.exit(1);
}
for (const route of ["studio", "admin"]) {
  const dir = join(root, "dist", route);
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, join(dir, "index.html"));
  console.log(`make-routes: wrote dist/${route}/index.html`);
}
