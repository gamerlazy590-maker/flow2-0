// Free, no-key image generation via Pollinations (https://pollinations.ai).
// No API key, no account, no env var. Images are generated remotely and
// returned as a plain URL — Flow 2.0 never proxies or stores the bytes.

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
