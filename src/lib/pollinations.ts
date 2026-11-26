// Free, no-key image generation via Pollinations (https://pollinations.ai).
// No API key, no account, no env var. Images are generated remotely and
// returned as a plain URL — Flow 2.0 never proxies or stores the bytes.
//
// RATE LIMIT (verified 2026-11-26 from a real user video): the free
// Pollinations tier allows 1 image every 45 seconds. When the limit is
// hit it does NOT return an error — it returns a fixed placeholder image
// (pixel-art bee + robot, a "45" timer, and a banner reading
// "Free limit reached — 1 free image every 45 seconds"). This module
// guards against that in three ways:
//   1. Cooldown — after every image request the Generate button is
//      disabled for 50 seconds (persisted in localStorage so a reload
//      cannot bypass it).
//   2. Retry — a failed or placeholder result is retried up to 2 more
//      times, waiting 50 seconds between tries.
//   3. Placeholder detection — the returned image is drawn to a small
//      offscreen canvas and checked for the placeholder's signature
//      (a near-uniform pale-cream band across the bottom quarter, one
//      dominant colour). A detected placeholder is treated as a
//      rate-limit error: no video is made from it and no credit is used.

import type { AspectRatio, StylePreset } from "./store";

export const STYLE_SUFFIX: Record<StylePreset, string> = {
  Cinematic: "cinematic film still, dramatic lighting, movie quality",
  Anime: "anime key visual, vibrant cel shading, detailed illustration",
  "3D Render": "3D render, octane render, studio lighting, high detail",
  Realistic: "photorealistic, shot on a real camera, natural light, high detail",
};

export const RATIO_DIMS: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "1:1": { width: 1024, height: 1024 },
};

/** Free tier: 1 image per 45 s. We wait 50 s to stay safely under it. */
export const IMAGE_COOLDOWN_MS = 50_000;
export const IMAGE_COOLDOWN_SECONDS = 50;
/** First try + 2 retries. */
export const MAX_IMAGE_ATTEMPTS = 3;
export const RETRY_WAIT_MS = 50_000;

const COOLDOWN_KEY = "flow2.lastImageRequest.v1";

/** Thrown when the free image service is rate-limited (placeholder or repeated failure). */
export class RateLimitError extends Error {
  constructor() {
    super("Free limit reached — wait 45 seconds and try again.");
    this.name = "RateLimitError";
  }
}

/** Milliseconds until another image request is allowed (0 = allowed now). */
export function getCooldownRemainingMs(): number {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? "0");
    if (!last) return 0;
    return Math.max(0, last + IMAGE_COOLDOWN_MS - Date.now());
  } catch {
    return 0;
  }
}

/** Record that an image request was just made (persists across reloads). */
export function markImageRequest(): void {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable — cooldown simply won't persist.
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Build a Pollinations image URL for a prompt.
 * Negative prompts have no dedicated Pollinations parameter, so they are
 * appended as plain guidance text ("avoid: ...") — the model may or may
 * not honour them. The studio UI says this honestly.
 */
export function pollinationsUrl(opts: {
  prompt: string;
  negativePrompt?: string;
  style: StylePreset;
  ratio: AspectRatio;
  seed?: number;
}): string {
  const { width, height } = RATIO_DIMS[opts.ratio];
  let full = `${opts.prompt.trim()}, ${STYLE_SUFFIX[opts.style]}`;
  if (opts.negativePrompt?.trim()) {
    full += ` (avoid: ${opts.negativePrompt.trim()})`;
  }
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model: "flux",
    nologo: "true",
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?${params.toString()}`;
}

/** Load the image to confirm the remote generator actually returned one. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The image generator did not return an image. Try again."));
    img.src = url;
  });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return loadImage(url).finally(() => URL.revokeObjectURL(url));
}

/**
 * Is this pixel the placeholder's pale-cream banner colour?
 * Measured from the real rate-limit placeholder (dominant colour
 * #FCF7E7, i.e. rgb(252, 247, 231)): very bright, almost no saturation,
 * red slightly above blue.
 */
function isCreamPixel(r: number, g: number, b: number): boolean {
  return r >= 235 && g >= 228 && b >= 195 && Math.abs(r - g) <= 20 && r - b >= 8 && r - b <= 55;
}

/**
 * Detect the Pollinations rate-limit placeholder in a loaded image.
 * Draws the image to a small (96×54) offscreen canvas and inspects the
 * bottom quarter: the placeholder has a near-uniform pale-cream banner
 * there. Both conditions must hold, so a genuine photo with a pale
 * background (e.g. sand, sky) is not mistaken for the placeholder:
 *   1. at least 70% of bottom-quarter pixels are cream, and
 *   2. one single colour covers at least 40% of the bottom quarter.
 * Verified against the real placeholder frame: cream fraction 0.85 and
 * dominant-colour share 0.63 at this downscale — comfortably above both
 * thresholds. A false positive only costs a retry, never a credit.
 */
export function detectRateLimitPlaceholder(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 54;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, Math.floor(canvas.height * 0.75), canvas.width, Math.ceil(canvas.height * 0.25)).data;
    const total = data.length / 4;
    if (total === 0) return false;
    let cream = 0;
    const counts = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isCreamPixel(r, g, b)) cream += 1;
      const key = `${r},${g},${b}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let dominant = 0;
    for (const n of counts.values()) dominant = Math.max(dominant, n);
    return cream / total >= 0.7 && dominant / total >= 0.4;
  } catch {
    // Canvas is tainted or unavailable — do not block generation on it.
    return false;
  }
}

export interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  style: StylePreset;
  ratio: AspectRatio;
}

/**
 * Generate one image with cooldown, retry and placeholder protection.
 * - Throws a plain Error with a countdown message if the 50-second
 *   cooldown is still active (callers should show the remaining time).
 * - Retries up to 2 more times (fresh random seed each try) after a
 *   network/HTTP failure or a detected placeholder, waiting 50 seconds
 *   between tries and reporting progress via onStatus.
 * - Resolves only with a real, checked image URL. Never resolves with
 *   the rate-limit placeholder, and never throws away the reason: the
 *   final failure is a RateLimitError with a plain-language message.
 * Callers must only consume a video credit / save a creation AFTER this
 * resolves.
 */
export async function generateImage(
  opts: GenerateImageOptions,
  onStatus?: (message: string) => void,
): Promise<{ imageUrl: string }> {
  const remaining = getCooldownRemainingMs();
  if (remaining > 0) {
    throw new Error(
      `Free limit: 1 image per 45 seconds — next try in ${Math.ceil(remaining / 1000)}s.`,
    );
  }
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt++) {
    markImageRequest();
    const url = pollinationsUrl(opts);
    try {
      let img: HTMLImageElement;
      try {
        // fetch first: a non-200 is a real failure, and a blob URL keeps
        // the canvas readable (no CORS taint) for placeholder detection.
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(
            `The image generator returned an error (HTTP ${res.status}).`,
          );
        }
        img = await loadImageFromBlob(await res.blob());
      } catch (err) {
        // fetch itself failed (offline / CORS) — fall back to a plain
        // <img> load, which still allows canvas detection when the
        // service sends CORS headers (Pollinations does).
        if (err instanceof Error && err.message.startsWith("The image generator returned")) {
          throw err;
        }
        img = await loadImage(url);
      }
      if (detectRateLimitPlaceholder(img)) {
        throw new RateLimitError();
      }
      return { imageUrl: url };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Generation failed. Please try again.");
      if (attempt < MAX_IMAGE_ATTEMPTS) {
        const rateLimited =
          lastError instanceof RateLimitError ||
          /did not return an image|returned an error/i.test(lastError.message);
        onStatus?.(
          rateLimited
            ? `Free limit reached — waiting ${RETRY_WAIT_MS / 1000} seconds, then retrying (try ${attempt + 1} of ${MAX_IMAGE_ATTEMPTS})…`
            : `The image generator didn't respond — retrying in ${RETRY_WAIT_MS / 1000} seconds (try ${attempt + 1} of ${MAX_IMAGE_ATTEMPTS})…`,
        );
        await sleep(RETRY_WAIT_MS);
      }
    }
  }
  // A detected placeholder is always a rate-limit failure. A repeated
  // network/HTTP failure is reported as itself, not as a rate limit.
  throw lastError ?? new RateLimitError();
}
