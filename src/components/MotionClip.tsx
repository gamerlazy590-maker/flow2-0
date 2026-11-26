import { useEffect, useRef, useState } from "react";
import { VIDEO_DURATION_SECONDS } from "../lib/store";
import type { AspectRatio, CameraMotion } from "../lib/store";

/**
 * Plays a generated keyframe as an 8-second motion clip on canvas and
 * exports it as WebM via MediaRecorder.
 *
 * HONEST NOTE: this is an image-based camera move (zoom/pan over one AI
 * keyframe), not real AI motion. Real AI motion video needs a paid
 * text-to-video API, which this free build does not include. MP4 export
 * would need ffmpeg.wasm (a ~30 MB download that is unreliable on static
 * hosting), so this build ships WebM — playable in every modern browser
 * and convertible to MP4 in any free editor.
 */
export function MotionClip({
  src,
  motion,
  aspectRatio,
  title,
}: {
  src: string;
  motion: CameraMotion;
  aspectRatio: AspectRatio;
  title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const playingRef = useRef(true);
  playingRef.current = playing;

  const dims =
    aspectRatio === "9:16"
      ? { w: 540, h: 960 }
      : aspectRatio === "1:1"
        ? { w: 720, h: 720 }
        : { w: 960, h: 540 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    let raf = 0;
    const start = performance.now();
    const DURATION = VIDEO_DURATION_SECONDS * 1000;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!img.complete || img.naturalWidth === 0) return;
      const t = playingRef.current ? ((now - start) % (DURATION * 2)) / DURATION : 0.25;
      const phase = t <= 1 ? t : 2 - t; // ping-pong so the clip loops smoothly
      const ease = phase * phase * (3 - 2 * phase);
      let scale = 1.12;
      let dx = 0;
      if (motion === "zoom-in") scale = 1.05 + ease * 0.16;
      else if (motion === "zoom-out") scale = 1.21 - ease * 0.16;
      else if (motion === "pan-left") dx = (0.5 - ease) * 0.09;
      else if (motion === "pan-right") dx = (ease - 0.5) * 0.09;
      const cw = canvas.width;
      const ch = canvas.height;
      const base = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * base * scale;
      const h = img.naturalHeight * base * scale;
      ctx2d.clearRect(0, 0, cw, ch);
      ctx2d.drawImage(img, (cw - w) / 2 + dx * cw, (ch - h) / 2, w, h);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [src, motion]);

  const exportWebm = () => {
    const canvas = canvasRef.current;
    if (!canvas || exporting) return;
    if (typeof MediaRecorder === "undefined" || !("captureStream" in canvas)) {
      setExportMsg("Video export isn't supported in this browser — the clip still plays here.");
      return;
    }
    setExporting(true);
    setExportMsg(`Recording your ${VIDEO_DURATION_SECONDS}-second clip…`);
    setPlaying(true);
    const stream = (
      canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }
    ).captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "flow2-video.webm";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setExporting(false);
      setExportMsg("Clip downloaded as WebM (8 seconds).");
    };
    recorder.start();
    setTimeout(() => recorder.stop(), VIDEO_DURATION_SECONDS * 1000);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        className="w-full rounded-xl border border-[var(--border)] bg-black"
        role="img"
        aria-label={`Playing AI video: ${title}`}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause video" : "Play video"}
          className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button
          type="button"
          onClick={exportWebm}
          disabled={exporting}
          aria-label="Download video as WebM"
          className="grad-bg rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {exporting ? "Recording…" : "Download WebM"}
        </button>
        {exportMsg && <span className="text-xs text-[var(--dim)]">{exportMsg}</span>}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--dim)]">
        This is an 8-second camera move over one AI-generated keyframe — not real AI motion.
        WebM plays in every modern browser and converts to MP4 in any free video editor.
      </p>
    </div>
  );
}
