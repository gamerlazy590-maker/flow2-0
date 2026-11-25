// Privileged host handlers for Flow 2.0.
//
// renderVideoClip: encodes a REAL MP4 video file from a generated AI
// keyframe using the host's ffmpeg (zoompan camera moves: zoom in/out,
// pan left/right), 8 seconds at 30fps, H.264/yuv420p with faststart so it
// plays inline everywhere. Descriptors are extracted from this file into
// `@space/privileged` for the action bundle; this file itself is never
// imported by action code.

import { definePrivilegedContracts, definePrivilegedHandlers, z } from "@hatch/space-sdk";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const PrivilegedContracts = definePrivilegedContracts({
  renderVideoClip: {
    description:
      "Encodes an 8-second MP4 video (H.264) from a base64 keyframe image with the requested camera move, via host ffmpeg.",
    request: z.object({
      imageBase64: z.string().min(100).max(4_000_000),
      motion: z.enum(["zoom-in", "zoom-out", "pan-left", "pan-right"]),
      aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
    }),
    response: z.object({
      videoBase64: z.string(),
      contentType: z.literal("video/mp4"),
      bytes: z.number(),
    }),
    timeoutMs: 120_000,
  },
});

const FRAMES = 240; // 8s @ 30fps

function zoompanFilter(motion: string, w: number, h: number): string {
  const center = `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
  switch (motion) {
    case "zoom-out":
      return `zoompan=z='max(1.28-0.28*on/${FRAMES},1.0)':${center}:d=${FRAMES}:s=${w}x${h}:fps=30`;
    case "pan-left":
      return `zoompan=z='1.25':x='(iw-iw/zoom)*(1-on/${FRAMES})':y='ih/2-(ih/zoom/2)':d=${FRAMES}:s=${w}x${h}:fps=30`;
    case "pan-right":
      return `zoompan=z='1.25':x='(iw-iw/zoom)*on/${FRAMES}':y='ih/2-(ih/zoom/2)':d=${FRAMES}:s=${w}x${h}:fps=30`;
    case "zoom-in":
    default:
      return `zoompan=z='min(1+0.28*on/${FRAMES},1.28)':${center}:d=${FRAMES}:s=${w}x${h}:fps=30`;
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("Video rendering timed out."));
    }, 110_000);
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}

export const PrivilegedHandlers = definePrivilegedHandlers(PrivilegedContracts, {
  async renderVideoClip(args) {
    const dims =
      args.aspectRatio === "9:16"
        ? { w: 720, h: 1280 }
        : args.aspectRatio === "1:1"
          ? { w: 960, h: 960 }
          : { w: 1280, h: 720 };
    const dir = await mkdtemp(join(tmpdir(), "flow2-render-"));
    try {
      const inputPath = join(dir, "keyframe.img");
      const outputPath = join(dir, "clip.mp4");
      await writeFile(inputPath, Buffer.from(args.imageBase64, "base64"));
      const vf = `scale=2560:-2,${zoompanFilter(args.motion, dims.w, dims.h)}`;
      await runFfmpeg([
        "-y",
        "-loop", "1",
        "-i", inputPath,
        "-vf", vf,
        "-t", "8",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        outputPath,
      ]);
      const bytes = await readFile(outputPath);
      return {
        videoBase64: Buffer.from(bytes).toString("base64"),
        contentType: "video/mp4" as const,
        bytes: bytes.length,
      };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  },
});
