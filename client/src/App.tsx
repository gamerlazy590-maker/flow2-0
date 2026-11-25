import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actionFields } from "@hatch/space-sdk/fields" with { type: "macro" };
import { bytesToBase64 } from "@hatch/space-sdk/client";
import type { Actions } from "../../server/src/actions";
import { api, type ApiResponse } from "./api";
import { Logo, LogoMark } from "./Logo";
import showcaseCyberpunk from "./assets/showcase-cyberpunk.webp";
import showcaseAnime from "./assets/showcase-anime.webp";
import showcaseRender from "./assets/showcase-3drender.webp";
import showcaseLandscape from "./assets/showcase-landscape.webp";
import showcasePortrait from "./assets/showcase-portrait.webp";
import showcaseNebula from "./assets/showcase-nebula.webp";

const FIELDS = actionFields<typeof Actions>();

type User = ApiResponse<typeof api, "getSession">["user"];
type Creation = ApiResponse<typeof api, "listCreations">["creations"][number];
type View = "landing" | "studio" | "admin";
type StudioTab = "video" | "image" | "creations" | "profile";
type LegalKind = "terms" | "privacy" | null;
type SeoKind = "sitemap" | "robots" | null;

const SITE_URL = "https://flow2-0.vercel.app";
const TOKEN_KEY = "flow2-session-token";
const STYLES = ["Cinematic", "Anime", "3D Render", "Realistic"] as const;
const RATIOS = ["16:9", "9:16", "1:1"] as const;
const MOTIONS = [
  { id: "zoom-in", label: "Zoom in" },
  { id: "zoom-out", label: "Zoom out" },
  { id: "pan-left", label: "Pan left" },
  { id: "pan-right", label: "Pan right" },
] as const;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/studio</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/#about</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/#showcase</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${SITE_URL}/#alternatives</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${SITE_URL}/#faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml`;

const SHOWCASE: {
  img: string;
  alt: string;
  kind: "Video" | "Image";
  style: string;
  ratio: string;
  motion: string;
  prompt: string;
}[] = [
  {
    img: showcaseCyberpunk,
    alt: "AI-generated cinematic frame of a neon cyberpunk street in the rain",
    kind: "Video",
    style: "Cinematic",
    ratio: "16:9",
    motion: "kb-zoom-in",
    prompt: "A neon-lit cyberpunk city street at night in the rain, lone figure with a glowing umbrella, cinematic",
  },
  {
    img: showcaseAnime,
    alt: "AI-generated anime illustration of a sky pirate on an airship",
    kind: "Image",
    style: "Anime",
    ratio: "9:16",
    motion: "kb-pan-right",
    prompt: "Sky-pirate girl with teal hair on a floating airship at golden hour, anime key visual",
  },
  {
    img: showcaseNebula,
    alt: "AI-generated space art of a violet nebula with an astronaut",
    kind: "Video",
    style: "Cinematic",
    ratio: "16:9",
    motion: "kb-zoom-out",
    prompt: "A violet and teal nebula with a tiny astronaut drifting in the foreground, cinematic space art",
  },
  {
    img: showcaseRender,
    alt: "AI-generated 3D render of an iridescent glass perfume bottle",
    kind: "Image",
    style: "3D Render",
    ratio: "1:1",
    motion: "kb-zoom-in",
    prompt: "Iridescent glass perfume bottle on a dark reflective surface, studio rim light, 3D render",
  },
  {
    img: showcasePortrait,
    alt: "AI-generated realistic portrait of a jazz saxophonist in a club",
    kind: "Image",
    style: "Realistic",
    ratio: "9:16",
    motion: "kb-pan-left",
    prompt: "Jazz musician with a brass saxophone in a smoky club, violet stage light, photorealistic portrait",
  },
  {
    img: showcaseLandscape,
    alt: "AI-generated cinematic landscape of a misty fjord at dawn",
    kind: "Video",
    style: "Cinematic",
    ratio: "16:9",
    motion: "kb-pan-right",
    prompt: "Misty fjord at dawn, tiny red cabin on the shore, mirror-still water, cinematic landscape",
  },
];

const FAQS = [
  {
    q: "What is Flow 2.0?",
    a: "Flow 2.0 is a free AI video generator and image creator that runs entirely in your browser at flow2-0.vercel.app. Type a prompt and Flow turns it into a cinematic video clip (5 free a day) or an HD image (unlimited). It is an independent app — a free alternative in the same category as Google Flow, Veo, Sora, Runway, and Kling, without their subscriptions or watermarks.",
  },
  {
    q: "Is Flow 2.0 really free?",
    a: "Yes. Every account gets 5 free AI video generations per day and unlimited AI image generations, forever. There is no paid tier and we never ask for a credit card — it's a free AI video maker in the truest sense.",
  },
  {
    q: "How do the daily video credits work?",
    a: "Your window starts with your account. You can generate up to 5 videos in any rolling 24-hour window; when the window rolls over, your counter resets to 5/5 automatically. Image generations never consume video credits.",
  },
  {
    q: "What can I create with Flow 2.0?",
    a: "Anything you can describe: cinematic scenes, anime illustrations, 3D product renders, and photorealistic images. As a text to video AI and AI filmmaking tool, it lets you pick a style preset (Cinematic, Anime, 3D Render, Realistic), an aspect ratio (16:9, 9:16, 1:1), and — for videos — a camera motion like zoom or pan.",
  },
  {
    q: "Is Flow 2.0 a good Google Flow AI alternative — and how does it compare to Veo, Sora, Runway, and Kling?",
    a: "Flow 2.0 is an independent, free alternative — it is not Google Flow, Veo, Sora, Runway, or Kling, and it isn't affiliated with them. People searching for a Google Flow AI alternative free, a way to use a Google Veo video generator online without a subscription, a Sora AI free alternative, a Runway Gen-3 alternative free, or a Kling AI free alternative online usually want the same things: text to cinematic video, no watermark, and no credit card. That's exactly the gap Flow 2.0 fills — 5 free videos a day and unlimited images, right in the browser.",
  },
  {
    q: "How do I make AI movies with a consistent face and characters?",
    a: "Consistency comes from your prompt craft. Describe your character once in rich, specific detail — age, hair, face shape, signature outfit — and reuse that exact description at the start of every scene prompt, keeping the same style preset (Realistic for live-action looks). Creators use Flow 2.0 as an AI video generator with consistent characters by treating that description like a character sheet: same words, same order, every scene. Generate your scenes in order and they play back like chapters of one film.",
  },
  {
    q: "Can I use Flow 2.0 as an AI video storyboard creator?",
    a: "Yes — that's a workflow many creators love. Generate unlimited images first as storyboard frames for each shot (they're free), arrange them in My Creations in scene order, then spend your daily video credits only on the shots that matter. It works like an AI video storyboard creator online, without paying for a separate storyboarding tool.",
  },
  {
    q: "Does Flow 2.0 support image to video and scene extension?",
    a: "Every video starts from an AI-generated cinematic keyframe — the image to video AI step happens automatically: pick a camera move (zoom in, zoom out, pan left, pan right) and Flow encodes that frame into a real 8-second MP4 video file with the move baked in. For an AI scene extension video generator workflow, generate a matching follow-up scene with the same prompt tail and style preset, then chain the MP4s in your editor — each new scene extends the world of the last.",
  },
  {
    q: "Is there a watermark on downloads?",
    a: "No. Flow 2.0 is a free AI video generator without watermark — images download at full resolution and videos download as clean MP4 files, ready to publish.",
  },
  {
    q: "Can I make videos for YouTube, ads, anime, and stories?",
    a: "Absolutely. As an AI video maker for YouTube storytelling, creators build faceless channel content scene by scene in 16:9. The Anime preset doubles as an AI anime video generator for shorts and story arcs, the Realistic and 3D Render presets work as an AI commercial ad generator for product spots, and the Cinematic preset turns Flow 2.0 into an AI story video maker for trailers, book teasers, and short films. Use 9:16 for Shorts, Reels, and TikTok.",
  },
  {
    q: "Can I download my creations?",
    a: "Yes. Images download as full-resolution files, and videos download as real MP4 files from My Creations. Your history is saved to your account so you can come back anytime.",
  },
  {
    q: "Do I need an account to browse the showcase?",
    a: "No — the landing page and showcase are public. You only need a free account to generate and save your own creations.",
  },
  {
    q: "Who owns what I generate?",
    a: "You do. Content you generate with Flow 2.0 is yours to use for personal and commercial projects, subject to the Terms of Service.",
  },
];

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load the keyframe to encode the video.");
  const buf = await res.arrayBuffer();
  return bytesToBase64(new Uint8Array(buf));
}

function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Plays a generated keyframe as a real motion clip on canvas; exports WebM. */
function MotionClip({
  src,
  motion,
  aspectRatio,
  title,
}: {
  src: string;
  motion: string;
  aspectRatio: string;
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
    const DURATION = 8000;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!img.complete || img.naturalWidth === 0) return;
      const t = playingRef.current
        ? ((now - start) % (DURATION * 2)) / DURATION
        : 0.25;
      const phase = t <= 1 ? t : 2 - t; // ping-pong
      const ease = phase * phase * (3 - 2 * phase);
      let scale = 1.12;
      let dx = 0;
      let dy = 0;
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
      ctx2d.drawImage(img, (cw - w) / 2 + dx * cw, (ch - h) / 2 + dy * ch, w, h);
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
    setExportMsg("Recording your 8-second clip…");
    setPlaying(true);
    const stream = (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
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
      setExportMsg("Clip downloaded as WebM.");
    };
    recorder.start();
    setTimeout(() => recorder.stop(), 8000);
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
    </div>
  );
}

function CreditBadge({ user }: { user: User }) {
  return (
    <div className="glass flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full px-4 py-2 text-sm">
      <span>
        🎬 Daily Video Credits:{" "}
        <strong className="font-display">
          {user.videoCreditsRemaining}/{user.videoDailyLimit} Remaining
        </strong>
      </span>
      <span className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden="true" />
      <span>
        🖼️ Image Credits: <strong className="font-display grad-text">Unlimited</strong>
      </span>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`glass max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[#12121C] p-5 sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AuthModal({
  initialMode,
  onClose,
  onAuthed,
}: {
  initialMode: "login" | "register";
  onClose: () => void;
  onAuthed: (token: string) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState("");
  const [googleNote, setGoogleNote] = useState(false);

  const auth = useMutation({
    mutationFn: async () =>
      mode === "register"
        ? await api.register({ email, password, displayName })
        : await api.login({ email, password }),
    onSuccess: (data) => onAuthed(data.token),
    onError: (e) => setFormError(e instanceof Error ? e.message : "Something went wrong."),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!email.trim()) return setFormError("Enter your email address.");
    if (mode === "register" && password.length < 8)
      return setFormError("Password must be at least 8 characters.");
    if (!password) return setFormError("Enter your password.");
    auth.mutate();
  };

  return (
    <Modal title={mode === "register" ? "Create your free account" : "Welcome back"} onClose={onClose}>
      <div className="mb-5 flex justify-center">
        <Logo size={40} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-black/30 p-1" role="tablist" aria-label="Sign in or sign up">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setFormError("");
            }}
            className={`rounded-lg py-2 text-sm font-semibold ${mode === m ? "grad-bg text-white" : "text-[var(--dim)] hover:text-white"}`}
          >
            {m === "login" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && (
          <div>
            <label htmlFor="auth-name" className="mb-1 block text-sm text-[var(--dim)]">
              Display name (optional)
            </label>
            <input
              id="auth-name"
              {...FIELDS.register.displayName}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
              placeholder="Ada Creator"
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className="mb-1 block text-sm text-[var(--dim)]">
            Email
          </label>
          {mode === "register" ? (
            <input
              id="auth-email"
              {...FIELDS.register.email}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
              placeholder="you@example.com"
              autoComplete="email"
            />
          ) : (
            <input
              id="auth-email"
              {...FIELDS.login.email}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
              placeholder="you@example.com"
              autoComplete="email"
            />
          )}
        </div>
        <div>
          <label htmlFor="auth-password" className="mb-1 block text-sm text-[var(--dim)]">
            Password
          </label>
          {mode === "register" ? (
            <input
              id="auth-password"
              {...FIELDS.register.password}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          ) : (
            <input
              id="auth-password"
              {...FIELDS.login.password}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
              placeholder="Your password"
              autoComplete="current-password"
            />
          )}
        </div>
        {formError && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={auth.isPending}
          className="grad-bg btn-glow w-full rounded-xl py-3 font-display font-bold text-white disabled:opacity-60"
        >
          {auth.isPending
            ? "Please wait…"
            : mode === "register"
              ? "Create free account"
              : "Sign in to Flow 2.0"}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-[var(--dim)]">
        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
      </div>
      <button
        type="button"
        onClick={() => setGoogleNote(true)}
        aria-label="Continue with Google"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white/5 py-3 font-semibold hover:bg-white/10"
      >
        <span aria-hidden="true" className="font-display text-base font-bold">
          <span className="text-[#4285F4]">G</span>
        </span>
        Continue with Google
      </button>
      {googleNote && (
        <p className="mt-3 rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-[var(--dim)]">
          Google sign-in isn't switched on for this deployment yet — your free email account
          takes ten seconds and stores everything the same way.
        </p>
      )}
      <p className="mt-4 text-center text-xs text-[var(--dim)]">
        Passwords are stored only as salted PBKDF2 hashes — never in plain text.
        The first account registered becomes the site owner with admin access.
      </p>
    </Modal>
  );
}

function LegalContent({ kind }: { kind: "terms" | "privacy" }) {
  if (kind === "terms") {
    return (
      <div className="space-y-3 text-sm leading-relaxed text-[var(--dim)]">
        <p>
          <strong className="text-white">Flow 2.0 Terms of Service.</strong> Flow 2.0 ({SITE_URL})
          is a free creative tool. By creating an account you agree to these terms.
        </p>
        <p>
          <strong className="text-white">The service.</strong> Every account may generate up to 5
          AI videos per rolling 24-hour window and unlimited AI images. Limits keep the free
          service fast and fair for everyone and may be adjusted with notice on this page.
        </p>
        <p>
          <strong className="text-white">Your content.</strong> You own the media you generate and
          may use it for personal and commercial projects. You are responsible for your prompts:
          don't generate content that is illegal, infringing, or harmful.
        </p>
        <p>
          <strong className="text-white">Accounts.</strong> Keep your password private. The site
          owner may suspend accounts that abuse the service or attempt to bypass usage limits.
        </p>
        <p>
          <strong className="text-white">Availability.</strong> The service is provided "as is"
          without warranties; generated media is stored on a best-effort basis, so download
          anything you want to keep.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm leading-relaxed text-[var(--dim)]">
      <p>
        <strong className="text-white">Flow 2.0 Privacy Policy.</strong> We collect the minimum
        needed to run your account.
      </p>
      <p>
        <strong className="text-white">What we store.</strong> Your email, display name, a salted
        hash of your password (never the password itself), your daily video credit counter, and
        the media you generate with its prompts.
      </p>
      <p>
        <strong className="text-white">What we don't do.</strong> We don't sell your data, we
        don't require a credit card, and we don't use your creations to train models.
      </p>
      <p>
        <strong className="text-white">Admin visibility.</strong> The site owner can see account
        emails, registration dates, and usage counts in the admin dashboard to operate the
        service — never passwords, which are stored only as salted hashes.
      </p>
      <p>
        <strong className="text-white">Deletion.</strong> Deleting a creation removes its stored
        media. To delete your whole account, contact the site owner from your registered email.
      </p>
    </div>
  );
}

/** Download card for the full project ZIP (GitHub → Vercel export). */
function ProjectExportCard() {
  const [result, setResult] = useState<ApiResponse<typeof api, "exportProjectZip"> | null>(null);
  const [error, setError] = useState("");
  const exportMutation = useMutation({
    mutationFn: async () => await api.exportProjectZip({}),
    onSuccess: (data) => {
      setResult(data);
      setError("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not prepare the ZIP. Please try again."),
  });
  return (
    <div className="glass grad-border mt-4 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h3 className="font-display font-bold">📦 Download the full project (.zip)</h3>
          <p className="mt-2 text-sm text-[var(--dim)]">
            The complete Flow 2.0 source code — client, server, <code>package.json</code>,{" "}
            <code>vercel.json</code>, <code>DEPLOY.md</code>, a step-by-step <code>README.md</code>,
            and the database migrations — packaged as one ZIP with nothing missing, ready to
            push to GitHub and deploy on Vercel.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--dim)]">
            <li>
              Create a public repo named <strong className="text-white">flow2-0</strong> on
              GitHub (account <strong className="text-white">gamerlazy590-maker</strong>).
            </li>
            <li>Unzip and push the files — the exact git commands are in the README inside the ZIP.</li>
            <li>
              Import the repo in Vercel as project <strong className="text-white">flow2-0</strong>{" "}
              — no environment variables needed — and deploy to{" "}
              <strong className="text-white">flow2-0.vercel.app</strong>.
            </li>
          </ol>
        </div>
        <div className="flex flex-col items-start gap-2">
          {result ? (
            <>
              <a
                href={result.url}
                download={result.filename}
                className="grad-bg btn-glow rounded-xl px-5 py-2.5 font-display text-sm font-bold text-white"
              >
                Download {result.filename}
              </a>
              <p className="text-xs text-[var(--dim)]">
                {result.fileCount} files · {(result.sizeBytes / (1024 * 1024)).toFixed(1)} MB ·
                unzips to a <code>flow2-0/</code> folder
              </p>
              <button
                type="button"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="text-xs font-semibold text-[var(--dim)] underline hover:text-white"
              >
                {exportMutation.isPending ? "Preparing…" : "Prepare a fresh ZIP"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="grad-bg btn-glow rounded-xl px-5 py-2.5 font-display text-sm font-bold text-white disabled:opacity-60"
            >
              {exportMutation.isPending ? "Preparing ZIP…" : "Prepare ZIP download"}
            </button>
          )}
          {error && (
            <p role="alert" className="max-w-xs text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Landing({
  user,
  onStart,
  onSignIn,
  onOpenSeo,
  onOpenLegal,
}: {
  user: User | null;
  onStart: (prompt?: string) => void;
  onSignIn: () => void;
  onOpenSeo: (kind: "sitemap" | "robots") => void;
  onOpenLegal: (kind: "terms" | "privacy") => void;
}) {
  const [heroPrompt, setHeroPrompt] = useState(
    "A neon-lit cyberpunk city street at night in the rain, cinematic",
  );
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen">
      <header className="pt-safe sticky top-0 z-40 border-b border-white/5 bg-[#0A0A0F]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <a href="#top" aria-label="Flow 2.0 home" className="rounded-lg">
            <Logo size={34} />
          </a>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-[var(--dim)] md:flex">
            <a className="py-2 hover:text-white" href="#about">About Flow</a>
            <a className="py-2 hover:text-white" href="#showcase">Showcase</a>
            <a className="py-2 hover:text-white" href="#features">Features</a>
            <a className="py-2 hover:text-white" href="#alternatives">Alternatives</a>
            <a className="py-2 hover:text-white" href="#faq">FAQ</a>
            <a className="py-2 hover:text-white" href="#deploy">Deploy</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => onStart()}
                className="grad-bg btn-glow rounded-xl px-4 py-2 font-display text-sm font-bold text-white"
              >
                Open Studio
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-white/10"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => onStart()}
                  className="grad-bg btn-glow hidden rounded-xl px-4 py-2 font-display text-sm font-bold text-white sm:block"
                >
                  Start Creating Free
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="relative overflow-hidden px-4 pb-14 pt-12 sm:pt-16" aria-label="Hero">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage: `url(${showcaseNebula})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              maskImage: "linear-gradient(to bottom, black 30%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent 95%)",
            }}
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="glass mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-[var(--dim)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
              100% FREE · 5 VIDEOS A DAY · UNLIMITED IMAGES
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Flow 2.0 — Create Stunning AI Videos &amp;{" "}
              <span className="grad-text">Unlimited Images</span> for Free
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--dim)] sm:text-lg">
              Flow 2.0 is a text to video AI that turns a single sentence into cinematic video and
              gallery-grade images — an AI filmmaking tool with camera control, free for everyone.
              Type it, pick a style, hit Generate — no credit card, no watermark, no catch.
            </p>

            {/* Interactive prompt preview console */}
            <div className="glass grad-border rise-in mx-auto mt-8 max-w-2xl rounded-2xl p-3 text-left shadow-2xl">
              <label htmlFor="hero-prompt" className="sr-only">
                Try a prompt
              </label>
              <textarea
                id="hero-prompt"
                value={heroPrompt}
                onChange={(e) => setHeroPrompt(e.target.value)}
                rows={2}
                maxLength={600}
                className="w-full resize-none rounded-xl bg-black/40 px-4 py-3 text-base outline-none placeholder:text-[var(--dim)] focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Describe the video or image you imagine…"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 px-1 pb-1">
                {STYLES.map((s) => (
                  <span key={s} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--dim)]">
                    {s}
                  </span>
                ))}
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--dim)]">16:9</span>
                <button
                  type="button"
                  onClick={() => onStart(heroPrompt)}
                  className="grad-bg btn-glow ml-auto rounded-xl px-5 py-2.5 font-display font-bold text-white"
                >
                  ✨ Generate
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--dim)]">
              Your prompt carries straight into the studio. Free account required to generate.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onStart()}
                className="grad-bg btn-glow rounded-xl px-7 py-3.5 font-display text-base font-bold text-white"
              >
                Start Creating Free
              </button>
              <a
                href="#showcase"
                className="rounded-xl border border-[var(--border)] bg-white/5 px-7 py-3.5 font-display text-base font-semibold hover:bg-white/10"
              >
                Watch the showcase
              </a>
            </div>

            <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3 text-center">
              {[
                ["5 / day", "free AI videos"],
                ["∞", "HD images"],
                ["$0", "no credit card"],
              ].map(([big, small]) => (
                <div key={small} className="glass rounded-2xl px-2 py-4">
                  <dt className="sr-only">{small}</dt>
                  <dd className="font-display text-2xl font-extrabold">{big}</dd>
                  <dd className="mt-0.5 text-xs text-[var(--dim)]">{small}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* WHAT IS FLOW 2.0 */}
        <section id="about" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12" aria-label="What is Flow 2.0">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold">What is Flow 2.0?</h2>
              <p className="mt-3 leading-relaxed text-[var(--dim)]">
                <strong className="text-white">Flow 2.0</strong> is a free AI video generator and
                image creator that lives entirely in your browser. You describe a scene in plain
                words, and Flow turns that text into a cinematic video — with real camera moves
                like zooms and pans — or a high-resolution image in styles from photorealistic to
                anime. Every account gets <strong className="text-white">5 free videos a day</strong>{" "}
                and <strong className="text-white">unlimited images</strong>, with no credit card
                and no watermark.
              </p>
              <p className="mt-3 leading-relaxed text-[var(--dim)]">
                Creators use Flow as their everyday AI filmmaking tool: storyboarding scenes with
                unlimited images, keeping characters consistent across shots, and cutting clips
                for YouTube storytelling, ads, and short films. New here? Browse the{" "}
                <a href="#showcase" className="font-semibold text-[var(--accent-2)] underline decoration-dotted">
                  showcase
                </a>
                , compare Flow with the big names in the{" "}
                <a href="#alternatives" className="font-semibold text-[var(--accent-2)] underline decoration-dotted">
                  alternatives guide
                </a>
                , or read the{" "}
                <a href="#faq" className="font-semibold text-[var(--accent-2)] underline decoration-dotted">
                  FAQ
                </a>
                .
              </p>
              <button
                type="button"
                onClick={() => onStart()}
                className="grad-bg btn-glow mt-5 rounded-xl px-6 py-3 font-display font-bold text-white"
              >
                Open the Flow studio
              </button>
            </div>
            <div className="glass overflow-hidden rounded-2xl">
              <img
                src={showcaseNebula}
                alt="Flow 2.0 example output: an astronaut drifting before a violet nebula, generated from a text prompt"
                loading="lazy"
                className="kb kb-zoom-in w-full object-cover"
                style={{ aspectRatio: "16/10" }}
              />
              <p className="px-4 py-3 text-sm text-[var(--dim)]">
                Generated by Flow from one prompt — “a violet and teal nebula with a tiny astronaut
                drifting in the foreground.” Video version plays with a slow zoom.
              </p>
            </div>
          </div>
        </section>

        {/* SHOWCASE */}
        <section id="showcase" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12" aria-label="Showcase gallery">
          <h2 className="font-display text-3xl font-bold">
            Made with <span className="grad-text">one sentence</span> each
          </h2>
          <p className="mt-2 max-w-2xl text-[var(--dim)]">
            Every tile below started as the prompt printed on it. Video tiles play their camera
            move right here — hover or tap to feel the motion.
          </p>
          <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {SHOWCASE.map((item) => (
              <article
                key={item.prompt}
                className="glass card-hover group mb-4 break-inside-avoid overflow-hidden rounded-2xl"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.alt}
                    loading="lazy"
                    className={`w-full object-cover ${item.kind === "Video" ? `kb ${item.motion}` : "transition duration-500 group-hover:scale-105"}`}
                    style={{ aspectRatio: item.ratio === "9:16" ? "4/5" : item.ratio === "1:1" ? "1/1" : "16/10" }}
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                    {item.kind === "Video" ? "▶ VIDEO" : "🖼 IMAGE"}
                  </span>
                  <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs backdrop-blur">
                    {item.style} · {item.ratio}
                  </span>
                </div>
                <p className="px-4 py-3 text-sm text-[var(--dim)]">
                  <span className="text-white/40">“</span>
                  {item.prompt}
                  <span className="text-white/40">”</span>
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12" aria-label="Features">
          <h2 className="font-display text-3xl font-bold">Built for creators, priced for everyone: free</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "🎬",
                title: "5 Free Daily Videos",
                body: "Five full AI video generations every 24 hours, with cinematic camera moves — zoom, pan, and more. The counter resets automatically.",
              },
              {
                icon: "🖼️",
                title: "Unlimited HD Images",
                body: "No image cap, ever. Generate wallpapers, product shots, anime art, and portraits at full resolution, as many as you can imagine.",
              },
              {
                icon: "⚡",
                title: "Fast Rendering",
                body: "Prompts render in seconds, not render-queue hours. Your creations save to your library automatically, ready to download.",
              },
              {
                icon: "💳",
                title: "No Credit Card Required",
                body: "Sign up with an email and a password. That's it — no card, no trial that secretly converts, no surprise charges.",
              },
            ].map((f) => (
              <article key={f.title} className="glass card-hover rounded-2xl p-5">
                <div className="text-3xl" aria-hidden="true">{f.icon}</div>
                <h3 className="font-display mt-3 text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--dim)]">{f.body}</p>
              </article>
            ))}
          </div>

          <div className="glass grad-border mt-6 rounded-2xl p-6 sm:flex sm:items-center sm:gap-6">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl font-bold">How it works</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--dim)]">
                <li>Describe your scene in one sentence.</li>
                <li>Pick a style preset, aspect ratio, and camera motion.</li>
                <li>Generate — then play, download, and share from My Creations.</li>
              </ol>
            </div>
            <button
              type="button"
              onClick={() => onStart()}
              className="grad-bg btn-glow mt-4 rounded-xl px-6 py-3 font-display font-bold text-white sm:mt-0"
            >
              Try it now — free
            </button>
          </div>
        </section>

        {/* ALTERNATIVES */}
        <section id="alternatives" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12" aria-label="Free alternatives comparison">
          <h2 className="font-display text-3xl font-bold">
            The free alternative creators search for
          </h2>
          <p className="mt-2 max-w-3xl text-[var(--dim)]">
            Flow 2.0 is an independent app — not Google Flow, Veo, Sora, Runway, or Kling, and not
            affiliated with any of them. It's built for the moment those tools ask for a
            subscription: a genuinely free AI video generator with camera control, consistent
            character prompting, and no watermark.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Google Flow AI alternative — free",
                body: "Love the idea of Google's Flow filmmaking studio but not the paywall? Flow 2.0 gives you the same prompt-to-scene workflow in your browser, free, with 5 videos a day.",
              },
              {
                title: "Google Veo video generator, online & free",
                body: "Veo-class cinematic quality is the benchmark everyone chases. Flow 2.0's Cinematic preset targets that same filmic look — text to cinematic video AI, free, with no waitlist.",
              },
              {
                title: "Sora AI free alternative",
                body: "While Sora access stays limited and paid, Flow 2.0 is open to everyone today: describe a scene, choose a camera move, and export a clean clip in minutes.",
              },
              {
                title: "Runway Gen-3 alternative — free",
                body: "Runway Gen-3 set the standard for creator-grade text to video. Flow 2.0 covers the everyday creator workflow — story scenes, ads, anime, YouTube storytelling — at $0.",
              },
              {
                title: "Kling AI free alternative, online",
                body: "Kling's motion quality made it a favorite for shorts. Flow 2.0 answers with zoom and pan camera moves, 9:16 vertical output for Shorts and Reels, and unlimited image generation.",
              },
              {
                title: "An AI story video maker that stays free",
                body: "Storyboard with unlimited images, keep characters consistent with a reusable character description, then spend your 5 daily video credits on the scenes that carry your story.",
              },
            ].map((card) => (
              <article key={card.title} className="glass card-hover rounded-2xl p-5">
                <h3 className="font-display text-base font-bold">{card.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--dim)]">{card.body}</p>
              </article>
            ))}
          </div>

          {/* Flow 2.0 vs Google Flow */}
          <div className="glass mt-8 overflow-hidden rounded-2xl">
            <h3 className="font-display px-5 pt-5 text-xl font-bold">Flow 2.0 vs Google Flow</h3>
            <p className="px-5 pt-1 text-sm text-[var(--dim)]">
              Two different apps with similar names. Google Flow is Google's subscription
              filmmaking product; Flow 2.0 is this independent, free tool. Here's the honest
              side-by-side:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-y border-white/10 text-xs uppercase tracking-wide text-[var(--dim)]">
                    <th scope="col" className="px-5 py-3">What matters</th>
                    <th scope="col" className="px-5 py-3">Flow 2.0 (this site)</th>
                    <th scope="col" className="px-5 py-3">Google Flow</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--dim)]">
                  {[
                    ["Price", "Free — $0, no paid tier", "Requires a paid Google AI subscription"],
                    ["Free videos", "5 every day, resetting on a rolling 24h window", "Bound to subscription credits"],
                    ["Images", "Unlimited HD image generation", "Focused on video workflows"],
                    ["Watermark", "None — clean downloads", "Varies by plan and output"],
                    ["Credit card", "Never asked for one", "Required for the subscription"],
                    ["Camera control", "Zoom in/out and pan moves on every clip", "Advanced camera controls"],
                    ["Where it runs", "Any browser, instantly", "Google account + supported regions"],
                  ].map(([label, flow, google]) => (
                    <tr key={label} className="border-b border-white/5 last:border-0">
                      <th scope="row" className="px-5 py-3 font-semibold text-white">{label}</th>
                      <td className="px-5 py-3">{flow}</td>
                      <td className="px-5 py-3">{google}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-4 text-xs text-[var(--dim)]">
              Comparison reflects the products' public positioning as a free tool vs a
              subscription product. If you need Google's ecosystem and its largest models, Google
              Flow is the official route; if you want to start creating in the next ten seconds
              for free, that's what Flow 2.0 is for.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-12" aria-label="Frequently asked questions">
          <h2 className="font-display text-3xl font-bold">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((faq, i) => (
              <div key={faq.q} className="glass overflow-hidden rounded-2xl">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-display font-semibold"
                >
                  {faq.q}
                  <span aria-hidden="true" className="text-[var(--dim)]">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--dim)]">{faq.a}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* DEPLOY / DOCS */}
        <section id="deploy" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12" aria-label="Deployment and SEO docs">
          <h2 className="font-display text-3xl font-bold">Publishing &amp; deployment</h2>
          <p className="mt-2 max-w-3xl text-[var(--dim)]">
            Flow 2.0 is deployment-ready for its canonical home at{" "}
            <strong className="text-white">{SITE_URL}</strong> — a free Vercel subdomain (flow2.com
            and flow20.com were already taken). The repo ships a <code>vercel.json</code> (output
            directory, SPA rewrites, security headers), a <code>DEPLOY.md</code> runbook, and the
            SEO documents below.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-bold">🚀 Deploy to Vercel</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--dim)]">
                <li>Download the project ZIP below, push it to GitHub, then import it in Vercel.</li>
                <li>Name the project <strong className="text-white">flow2-0</strong> to claim the subdomain.</li>
                <li>Ship it — no env vars needed on the free tier.</li>
              </ol>
            </div>
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-bold">🗺️ sitemap.xml</h3>
              <p className="mt-2 text-sm text-[var(--dim)]">
                Auto-generated sitemap for {SITE_URL}, ready to submit to Google Search Console.
              </p>
              <button
                type="button"
                onClick={() => onOpenSeo("sitemap")}
                className="mt-3 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                View sitemap.xml
              </button>
            </div>
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-bold">🤖 robots.txt</h3>
              <p className="mt-2 text-sm text-[var(--dim)]">
                Crawl rules: everything indexable except the private /admin dashboard.
              </p>
              <button
                type="button"
                onClick={() => onOpenSeo("robots")}
                className="mt-3 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                View robots.txt
              </button>
            </div>
          </div>
          <ProjectExportCard />
        </section>
      </main>

      <footer className="border-t border-white/5 px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
          <div>
            <Logo size={32} />
            <p className="mt-3 max-w-xs text-sm text-[var(--dim)]">
              The free AI video &amp; image generator. 5 free videos a day, unlimited images,
              no credit card required.
            </p>
            <p className="mt-2 text-sm text-[var(--dim)]">{SITE_URL}</p>
          </div>
          <nav aria-label="Product" className="text-sm">
            <h3 className="font-display font-bold">Product</h3>
            <ul className="mt-3 space-y-2 text-[var(--dim)]">
              <li><a className="py-1 hover:text-white" href="#about">What is Flow 2.0?</a></li>
              <li><a className="py-1 hover:text-white" href="#showcase">Showcase</a></li>
              <li><a className="py-1 hover:text-white" href="#features">Features</a></li>
              <li><a className="py-1 hover:text-white" href="#alternatives">Flow vs Google Flow &amp; alternatives</a></li>
              <li><a className="py-1 hover:text-white" href="#faq">FAQ</a></li>
              <li><a className="py-1 hover:text-white" href="#deploy">Deployment docs</a></li>
            </ul>
          </nav>
          <nav aria-label="Legal and social" className="text-sm">
            <h3 className="font-display font-bold">Company</h3>
            <ul className="mt-3 space-y-2 text-[var(--dim)]">
              <li>
                <button type="button" onClick={() => onOpenLegal("terms")} className="py-1 hover:text-white">
                  Terms of Service
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onOpenLegal("privacy")} className="py-1 hover:text-white">
                  Privacy Policy
                </button>
              </li>
              <li className="flex gap-3 pt-1">
                <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="Flow 2.0 on X" className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-white/10">𝕏</a>
                <a href="https://www.youtube.com" target="_blank" rel="noreferrer" aria-label="Flow 2.0 on YouTube" className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-white/10">▶</a>
                <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Flow 2.0 on Instagram" className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-white/10">◎</a>
              </li>
            </ul>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-xs text-[var(--dim)]">
          © {new Date().getFullYear()} Flow 2.0 · {SITE_URL} · Free AI video &amp; image generation for everyone.
        </p>
      </footer>
    </div>
  );
}

function GeneratorPanel({
  token,
  kind,
  initialPrompt,
  user,
}: {
  token: string;
  kind: "video" | "image";
  initialPrompt: string;
  user: User;
}) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negEnabled, setNegEnabled] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Cinematic");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("16:9");
  const [motion, setMotion] = useState<(typeof MOTIONS)[number]["id"]>("zoom-in");
  const [formError, setFormError] = useState("");
  const [latest, setLatest] = useState<Creation | null>(null);
  const [renderError, setRenderError] = useState("");

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  const renderClip = useMutation({
    mutationFn: async (creation: Creation) => {
      const imageBase64 = await fetchAsBase64(creation.mediaUrl);
      return await api.renderVideoFile({ token, creationId: creation.id, imageBase64 });
    },
    onSuccess: (data) => {
      setLatest(data.creation);
      setRenderError("");
      queryClient.invalidateQueries({ queryKey: ["creations", token] });
    },
    onError: (e) =>
      setRenderError(e instanceof Error ? e.message : "MP4 encoding didn't finish."),
  });

  const generate = useMutation({
    mutationFn: async () => {
      const args = {
        token,
        prompt,
        negativePrompt: negEnabled ? negativePrompt : "",
        stylePreset: style,
        aspectRatio: ratio,
        motion,
      };
      return kind === "video" ? await api.generateVideo(args) : await api.generateImage(args);
    },
    onSuccess: (data) => {
      setLatest(data.creation);
      setRenderError("");
      queryClient.invalidateQueries({ queryKey: ["creations", token] });
      queryClient.invalidateQueries({ queryKey: ["session", token] });
      if (kind === "video" && !data.creation.videoUrl) {
        renderClip.mutate(data.creation);
      }
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : "Generation failed."),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (prompt.trim().length < 3) {
      setFormError("Describe what you want to create — at least a few words.");
      return;
    }
    if (kind === "video" && user.videoCreditsRemaining <= 0) {
      setFormError(
        "You've used all 5 free video credits for today. Images are still unlimited — or come back when your credits reset.",
      );
      return;
    }
    generate.mutate();
  };

  const outOfCredits = kind === "video" && user.videoCreditsRemaining <= 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="glass h-fit rounded-2xl p-5">
        <h2 className="font-display text-xl font-bold">
          {kind === "video" ? "🎬 Text to Video" : "🖼️ Text to Image"}
        </h2>
        <p className="mt-1 text-sm text-[var(--dim)]">
          {kind === "video"
            ? "One generation = one daily video credit. You get a real 8-second MP4 video file with your chosen camera move baked in."
            : "Images are unlimited and free — they never touch your video credits."}
        </p>

        <label htmlFor={`prompt-${kind}`} className="mb-1.5 mt-5 block text-sm font-semibold">
          Prompt
        </label>
        <textarea
          id={`prompt-${kind}`}
          {...FIELDS.generateImage.prompt}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-black/40 px-4 py-3 outline-none focus:border-[var(--accent)]"
          placeholder={
            kind === "video"
              ? "A drone shot gliding over a misty fjord at dawn…"
              : "A cozy cabin in a snowy forest, warm light in the windows…"
          }
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <label htmlFor={`neg-toggle-${kind}`} className="text-sm font-semibold">
            Negative prompt
          </label>
          <button
            id={`neg-toggle-${kind}`}
            type="button"
            role="switch"
            aria-checked={negEnabled}
            aria-label="Toggle negative prompt"
            onClick={() => setNegEnabled((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition ${negEnabled ? "grad-bg" : "bg-white/15"}`}
          >
            <span
              className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
              style={{ left: negEnabled ? 22 : 2 }}
            />
          </button>
        </div>
        {negEnabled && (
          <input
            aria-label="Negative prompt — what to avoid"
            {...FIELDS.generateImage.negativePrompt}
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--accent)]"
            placeholder="blurry, watermark, extra fingers…"
          />
        )}

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">Style preset</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                aria-pressed={style === s}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  style === s
                    ? "grad-bg border-transparent text-white"
                    : "border-[var(--border)] bg-white/5 hover:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-semibold">Aspect ratio</legend>
            <div className="mt-2 flex gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatio(r)}
                  aria-pressed={ratio === r}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                    ratio === r
                      ? "grad-bg border-transparent text-white"
                      : "border-[var(--border)] bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          {kind === "video" && (
            <fieldset>
              <legend className="text-sm font-semibold">Camera motion</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {MOTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMotion(m.id)}
                    aria-pressed={motion === m.id}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                      motion === m.id
                        ? "grad-bg border-transparent text-white"
                        : "border-[var(--border)] bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        {formError && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={generate.isPending}
          className="grad-bg btn-glow mt-5 w-full rounded-xl py-3.5 font-display text-base font-bold text-white disabled:opacity-60"
        >
          {generate.isPending
            ? "✨ Rendering — this takes a few seconds…"
            : kind === "video"
              ? `Generate Video (${user.videoCreditsRemaining}/${user.videoDailyLimit} credits left)`
              : "Generate Image — Free & Unlimited"}
        </button>
        {outOfCredits && (
          <p className="mt-3 text-center text-sm text-[var(--dim)]">
            Video credits reset {formatDateTime(user.creditsResetAt)}. Images stay unlimited in the meantime.
          </p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-[var(--dim)]">
          How video works here: Flow 2.0 renders a cinematic AI keyframe for your prompt, then
          encodes it on the server into a real 8-second MP4 video file with your chosen camera move —
          playable and downloadable anywhere. The generation actions are also the hook point
          where an external text-to-video API (Runway/Pika-style) can be connected later.
        </p>
      </form>

      <div className="glass h-fit rounded-2xl p-5" aria-live="polite">
        <h3 className="font-display font-bold">Preview</h3>
        {generate.isPending ? (
          <div className="shimmer mt-3 flex aspect-video items-center justify-center rounded-xl border border-[var(--border)] text-sm text-[var(--dim)]">
            Rendering your {kind}…
          </div>
        ) : latest ? (
          <div className="mt-3">
            {latest.kind === "video" && latest.videoUrl ? (
              <>
                <video
                  src={latest.videoUrl}
                  poster={latest.mediaUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full rounded-xl border border-[var(--border)] bg-black"
                  aria-label={`AI video: ${latest.prompt}`}
                />
                <a
                  href={latest.videoUrl}
                  download="flow2-video.mp4"
                  className="grad-bg mt-2 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
                >
                  Download MP4
                </a>
              </>
            ) : latest.kind === "video" ? (
              <>
                <MotionClip src={latest.mediaUrl} motion={latest.motion} aspectRatio={latest.aspectRatio} title={latest.prompt} />
                {renderClip.isPending ? (
                  <p className="mt-2 text-sm text-[var(--dim)]">
                    🎞️ Encoding your real MP4 video file on the server… the animated preview above
                    shows your camera move meanwhile.
                  </p>
                ) : renderError ? (
                  <p className="mt-2 text-sm text-red-300">
                    MP4 encoding didn't finish ({renderError}). The animated preview above still
                    plays.{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => renderClip.mutate(latest)}
                    >
                      Retry MP4 render
                    </button>
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <img
                  src={latest.mediaUrl}
                  alt={`AI-generated image: ${latest.prompt}`}
                  className="w-full rounded-xl border border-[var(--border)]"
                />
                <a
                  href={latest.mediaUrl}
                  download="flow2-image"
                  className="grad-bg mt-2 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
                >
                  Download image
                </a>
              </>
            )}
            <p className="mt-3 text-sm text-[var(--dim)]">“{latest.prompt}”</p>
            <p className="text-xs text-[var(--dim)]">
              {latest.stylePreset} · {latest.aspectRatio} · saved to My Creations
            </p>
          </div>
        ) : (
          <div className="mt-3 flex aspect-video items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-4 text-center text-sm text-[var(--dim)]">
            Your latest {kind} will appear here, ready to play and download.
          </div>
        )}
      </div>
    </div>
  );
}

function CreationsGrid({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState("");
  const creations = useQuery({
    queryKey: ["creations", token],
    queryFn: () => api.listCreations({ token, limit: 60 }),
  });
  const renderOne = useMutation({
    mutationFn: async (creation: Creation) => {
      const imageBase64 = await fetchAsBase64(creation.mediaUrl);
      return await api.renderVideoFile({ token, creationId: creation.id, imageBase64 });
    },
    onSuccess: () => {
      setDeleteError("");
      queryClient.invalidateQueries({ queryKey: ["creations", token] });
    },
    onError: (e) =>
      setDeleteError(
        e instanceof Error ? `MP4 render failed: ${e.message}` : "MP4 render failed.",
      ),
  });
  const del = useMutation({
    mutationFn: async (id: number) => await api.deleteCreation({ token, id }),
    onSuccess: () => {
      setDeleteError("");
      queryClient.invalidateQueries({ queryKey: ["creations", token] });
      queryClient.invalidateQueries({ queryKey: ["session", token] });
    },
    onError: (e) => setDeleteError(e instanceof Error ? e.message : "Delete failed."),
  });

  if (creations.isPending) return <p className="text-[var(--dim)]">Loading your creations…</p>;
  if (creations.error)
    return (
      <p role="alert" className="text-red-300">
        Couldn't load your creations.{" "}
        <button type="button" className="underline" onClick={() => creations.refetch()}>
          Retry
        </button>
      </p>
    );
  const rows = creations.data.creations;
  const deleteBanner = deleteError ? (
    <p role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {deleteError}
    </p>
  ) : null;
  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-4xl" aria-hidden="true">🎨</p>
        <h3 className="font-display mt-3 text-lg font-bold">Nothing here yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--dim)]">
          Generate your first video or image and it will live here — playable, downloadable, and
          saved to your account.
        </p>
      </div>
    );
  }
  return (
    <div>
      {deleteBanner}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((c) => (
        <article key={c.id} className="glass card-hover overflow-hidden rounded-2xl">
          {c.kind === "video" && c.videoUrl ? (
            <video
              src={c.videoUrl}
              poster={c.mediaUrl}
              controls
              preload="metadata"
              playsInline
              className="w-full bg-black object-cover"
              style={{ aspectRatio: c.aspectRatio.replace(":", "/") }}
              aria-label={`AI video: ${c.prompt}`}
            />
          ) : c.kind === "video" ? (
            <div className="relative overflow-hidden">
              <img
                src={c.mediaUrl}
                alt={`AI video keyframe: ${c.prompt}`}
                loading="lazy"
                className={`kb kb-${c.motion} w-full object-cover`}
                style={{ aspectRatio: c.aspectRatio.replace(":", "/") }}
              />
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                ▶ VIDEO · {c.motion.replace("-", " ")}
              </span>
            </div>
          ) : (
            <img
              src={c.mediaUrl}
              alt={`AI-generated image: ${c.prompt}`}
              loading="lazy"
              className="w-full object-cover"
              style={{ aspectRatio: c.aspectRatio.replace(":", "/") }}
            />
          )}
          <div className="p-4">
            <p className="line-clamp-2 text-sm">“{c.prompt}”</p>
            <p className="mt-1 text-xs text-[var(--dim)]">
              {c.stylePreset} · {c.aspectRatio} · {formatDateTime(c.createdAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.kind === "video" && c.videoUrl ? (
                <a
                  href={c.videoUrl}
                  download="flow2-video.mp4"
                  className="grad-bg rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Download MP4
                </a>
              ) : c.kind === "video" ? (
                <button
                  type="button"
                  onClick={() => renderOne.mutate(c)}
                  disabled={renderOne.isPending && renderOne.variables?.id === c.id}
                  aria-label={`Render MP4 file for creation ${c.id}`}
                  className="grad-bg rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {renderOne.isPending && renderOne.variables?.id === c.id
                    ? "Encoding MP4…"
                    : "🎞 Render MP4 file"}
                </button>
              ) : null}
              <a
                href={c.mediaUrl}
                download={c.kind === "video" ? "flow2-keyframe" : "flow2-image"}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
              >
                {c.kind === "video" ? "Keyframe" : "Download"}
              </a>
              <button
                type="button"
                onClick={() => del.mutate(c.id)}
                disabled={del.isPending}
                aria-label={`Delete creation ${c.id}`}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
            {c.kind === "video" && !c.videoUrl && (
              <details className="mt-3">
                <summary className="cursor-pointer py-1 text-sm font-semibold text-[var(--accent-2)]">
                  ▶ Preview the camera move
                </summary>
                <div className="mt-2">
                  <MotionClip src={c.mediaUrl} motion={c.motion} aspectRatio={c.aspectRatio} title={c.prompt} />
                </div>
              </details>
            )}
          </div>
        </article>
      ))}
      </div>
    </div>
  );
}

function ProfilePanel({ token, user }: { token: string; user: User }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.displayName);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const saveName = useMutation({
    mutationFn: async () => await api.updateProfile({ token, displayName: name }),
    onSuccess: () => {
      setMsg("Display name saved.");
      setErr("");
      queryClient.invalidateQueries({ queryKey: ["session", token] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Save failed."),
  });
  const savePw = useMutation({
    mutationFn: async () =>
      await api.changePassword({ token, currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => {
      setMsg("Password changed. It's stored only as a salted hash.");
      setErr("");
      setCurrentPw("");
      setNewPw("");
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Password change failed."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass h-fit rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <span className="grad-bg font-display flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-extrabold text-white">
            {(user.displayName || user.email).slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">{user.displayName}</h2>
            <p className="text-sm text-[var(--dim)]">{user.email}</p>
            <p className="text-xs text-[var(--dim)]">
              Member since {formatDate(user.memberSince)}
              {user.isAdmin ? " · Site owner (admin)" : ""}
            </p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-[var(--border)] bg-black/30 p-3">
            <dd className="font-display text-xl font-bold">
              {user.videoCreditsRemaining}/{user.videoDailyLimit}
            </dd>
            <dt className="text-xs text-[var(--dim)]">video credits left today</dt>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-black/30 p-3">
            <dd className="font-display text-xl font-bold">{user.totalImages}</dd>
            <dt className="text-xs text-[var(--dim)]">images generated (all time)</dt>
          </div>
        </dl>
        <p className="mt-3 text-xs text-[var(--dim)]">
          Next video credit reset: {formatDateTime(user.creditsResetAt)} (rolling 24-hour window).
        </p>
      </div>

      <div className="glass h-fit rounded-2xl p-5">
        <h3 className="font-display font-bold">Profile settings</h3>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return setErr("Display name can't be empty.");
            saveName.mutate();
          }}
        >
          <label htmlFor="profile-name" className="mb-1 block text-sm text-[var(--dim)]">
            Display name
          </label>
          <div className="flex gap-2">
            <input
              id="profile-name"
              {...FIELDS.updateProfile.displayName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
            />
            <button type="submit" disabled={saveName.isPending} className="grad-bg rounded-xl px-4 py-2 font-semibold text-white disabled:opacity-60">
              Save
            </button>
          </div>
        </form>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (newPw.length < 8) return setErr("New password must be at least 8 characters.");
            savePw.mutate();
          }}
        >
          <h4 className="text-sm font-semibold">Change password</h4>
          <label htmlFor="pw-current" className="mb-1 mt-3 block text-sm text-[var(--dim)]">
            Current password
          </label>
          <input
            id="pw-current"
            {...FIELDS.changePassword.currentPassword}
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
            autoComplete="current-password"
          />
          <label htmlFor="pw-new" className="mb-1 mt-3 block text-sm text-[var(--dim)]">
            New password
          </label>
          <input
            id="pw-new"
            {...FIELDS.changePassword.newPassword}
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
            autoComplete="new-password"
          />
          <button type="submit" disabled={savePw.isPending} className="mt-3 rounded-xl border border-[var(--border)] px-4 py-2 font-semibold hover:bg-white/10 disabled:opacity-60">
            Update password
          </button>
        </form>
        {msg && <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{msg}</p>}
        {err && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

function Studio({
  token,
  user,
  initialTab,
  initialPrompt,
  onHome,
  onOpenAdmin,
  onLogout,
}: {
  token: string;
  user: User;
  initialTab: StudioTab;
  initialPrompt: string;
  onHome: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  const tabs: { id: StudioTab; label: string; icon: string }[] = [
    { id: "video", label: "Text to Video", icon: "🎬" },
    { id: "image", label: "Text to Image", icon: "🖼️" },
    { id: "creations", label: "My Creations", icon: "🗂️" },
    { id: "profile", label: "Profile Settings", icon: "⚙️" },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 lg:flex-row lg:gap-6">
      {/* Sidebar (top bar on phones) */}
      <aside className="pt-safe lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:py-6">
        <div className="flex items-center justify-between gap-3 py-4 lg:py-0">
          <button type="button" onClick={onHome} aria-label="Back to Flow 2.0 home" className="rounded-lg">
            <Logo size={32} />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-white/10 lg:hidden"
          >
            Sign out
          </button>
        </div>
        <nav aria-label="Studio" className="flex gap-2 overflow-x-auto pb-2 lg:mt-6 lg:flex-col lg:overflow-visible lg:pb-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === t.id
                  ? "grad-bg text-white"
                  : "border border-[var(--border)] bg-white/[0.03] hover:bg-white/10 lg:border-transparent"
              }`}
            >
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
          {user.isAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-semibold hover:bg-[var(--accent)]/20"
            >
              <span aria-hidden="true">🛡️</span> Admin Dashboard
            </button>
          )}
        </nav>
        <div className="mt-4 hidden rounded-2xl border border-[var(--border)] bg-black/30 p-4 lg:block">
          <p className="truncate text-sm font-semibold">{user.displayName}</p>
          <p className="truncate text-xs text-[var(--dim)]">{user.email}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold">
            {tab === "video" && "Creation Studio — Video"}
            {tab === "image" && "Creation Studio — Image"}
            {tab === "creations" && "My Creations"}
            {tab === "profile" && "Profile Settings"}
          </h1>
          <CreditBadge user={user} />
        </div>
        {tab === "video" && (
          <GeneratorPanel token={token} kind="video" initialPrompt={initialPrompt} user={user} />
        )}
        {tab === "image" && (
          <GeneratorPanel token={token} kind="image" initialPrompt={initialPrompt} user={user} />
        )}
        {tab === "creations" && <CreationsGrid token={token} />}
        {tab === "profile" && <ProfilePanel token={token} user={user} />}
      </main>
    </div>
  );
}

function AdminPanel({
  token,
  user,
  onBack,
  onLogout,
}: {
  token: string;
  user: User;
  onBack: () => void;
  onLogout: () => void;
}) {
  const [search, setSearch] = useState("");
  const stats = useQuery({
    queryKey: ["admin-stats", token, search],
    queryFn: () => api.adminStats({ token, search }),
  });

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-12">
      <header className="pt-safe flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-3">
          <Logo size={34} />
          <span className="rounded-full border border-[var(--accent)]/50 bg-[var(--accent)]/15 px-3 py-1 text-xs font-bold">
            SUPER ADMIN
          </span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-white/10">
            ← Studio
          </button>
          <button type="button" onClick={onLogout} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-white/10">
            Sign out
          </button>
        </div>
      </header>

      <h1 className="font-display text-2xl font-extrabold">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--dim)]">
        {SITE_URL}/admin · Signed in as {user.email} (site owner). Passwords are never visible —
        they exist only as salted PBKDF2 hashes.
      </p>

      {stats.isPending && <p className="mt-6 text-[var(--dim)]">Loading platform data…</p>}
      {stats.error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {stats.error instanceof Error ? stats.error.message : "Couldn't load admin data."}
        </p>
      )}
      {stats.data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["👥", stats.data.totals.totalUsers, "Total registered users"],
              ["🎬", stats.data.totals.videoCreditsUsedToday, "Video credits used (current windows)"],
              ["🎞️", stats.data.totals.totalVideos, "Videos generated (all time)"],
              ["🖼️", stats.data.totals.totalImages, "Images generated (all time)"],
            ].map(([icon, value, label]) => (
              <div key={label as string} className="glass rounded-2xl p-4">
                <div className="text-2xl" aria-hidden="true">{icon}</div>
                <p className="font-display mt-1 text-3xl font-extrabold">{value}</p>
                <p className="text-xs text-[var(--dim)]">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <label htmlFor="admin-search" className="mb-1.5 block text-sm font-semibold">
              Search users
            </label>
            <input
              id="admin-search"
              {...FIELDS.adminStats.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--accent)]"
              placeholder="Search by email or name…"
            />
          </div>

          <div className="glass mt-4 overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[var(--dim)]">
                    <th scope="col" className="px-4 py-3">User</th>
                    <th scope="col" className="px-4 py-3">Registered</th>
                    <th scope="col" className="px-4 py-3">Video credits used today</th>
                    <th scope="col" className="px-4 py-3">Images generated</th>
                    <th scope="col" className="px-4 py-3">Total creations</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.data.users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <span className="font-semibold">{u.displayName}</span>
                        {u.isAdmin && (
                          <span className="ml-2 rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-xs font-bold text-[#C4B5FD]">
                            OWNER
                          </span>
                        )}
                        <br />
                        <span className="text-[var(--dim)]">{u.email}</span>
                      </td>
                      <td className="px-4 py-3">{formatDate(u.registeredAt)}</td>
                      <td className="px-4 py-3">
                        <span className="font-display font-bold">{u.dailyVideoCount}</span>
                        <span className="text-[var(--dim)]"> / 5</span>
                      </td>
                      <td className="px-4 py-3 font-display font-bold">{u.totalImages}</td>
                      <td className="px-4 py-3">{u.totalCreations}</td>
                    </tr>
                  ))}
                  {stats.data.users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--dim)]">
                        No users match “{search}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function App() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("landing");
  const [token, setToken] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [legal, setLegal] = useState<LegalKind>(null);
  const [seo, setSeo] = useState<SeoKind>(null);

  const session = useQuery({
    queryKey: ["session", token],
    queryFn: () => api.getSession({ token: token ?? "" }),
    enabled: !!token,
    retry: false,
  });
  const user: User | null = session.data?.user ?? null;

  useEffect(() => {
    if (token && session.error) {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
      setToken(null);
      setView("landing");
    }
  }, [token, session.error]);

  const handleAuthed = (newToken: string) => {
    try {
      window.localStorage.setItem(TOKEN_KEY, newToken);
    } catch {
      /* ignore */
    }
    setToken(newToken);
    setAuthOpen(false);
    setView("studio");
    queryClient.invalidateQueries({ queryKey: ["session"] });
  };

  const logout = async () => {
    if (token) {
      await api.logout({ token }).catch(() => undefined);
    }
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
    setView("landing");
    queryClient.clear();
  };

  const startCreating = (prompt?: string) => {
    if (prompt) setPendingPrompt(prompt);
    if (user && token) {
      setView("studio");
    } else {
      setAuthMode("register");
      setAuthOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {view === "landing" && (
        <Landing
          user={user}
          onStart={startCreating}
          onSignIn={() => {
            setAuthMode("login");
            setAuthOpen(true);
          }}
          onOpenSeo={setSeo}
          onOpenLegal={setLegal}
        />
      )}
      {view === "studio" && token && user && (
        <Studio
          token={token}
          user={user}
          initialTab="video"
          initialPrompt={pendingPrompt}
          onHome={() => setView("landing")}
          onOpenAdmin={() => setView("admin")}
          onLogout={logout}
        />
      )}
      {view === "studio" && (!token || !user) && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <LogoMark size={52} />
          <p className="text-[var(--dim)]">
            {session.isPending ? "Loading your studio…" : "Sign in to open your studio."}
          </p>
          {!session.isPending && (
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
              }}
              className="grad-bg btn-glow rounded-xl px-6 py-3 font-display font-bold text-white"
            >
              Sign in
            </button>
          )}
        </div>
      )}
      {view === "admin" && token && user?.isAdmin && (
        <AdminPanel token={token} user={user} onBack={() => setView("studio")} onLogout={logout} />
      )}
      {view === "admin" && (!user || !user.isAdmin) && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <LogoMark size={52} />
          <h1 className="font-display text-xl font-bold">Admin access only</h1>
          <p className="max-w-sm text-sm text-[var(--dim)]">
            The Flow 2.0 admin dashboard at {SITE_URL}/admin belongs to the site owner — the first
            account registered on this deployment.
          </p>
          <button
            type="button"
            onClick={() => setView(user ? "studio" : "landing")}
            className="grad-bg rounded-xl px-5 py-2.5 font-display font-bold text-white"
          >
            {user ? "Back to studio" : "Back to home"}
          </button>
        </div>
      )}

      {authOpen && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthOpen(false)}
          onAuthed={handleAuthed}
        />
      )}
      {legal && (
        <Modal
          title={legal === "terms" ? "Terms of Service" : "Privacy Policy"}
          onClose={() => setLegal(null)}
          wide
        >
          <LegalContent kind={legal} />
        </Modal>
      )}
      {seo && (
        <Modal title={seo === "sitemap" ? "sitemap.xml" : "robots.txt"} onClose={() => setSeo(null)} wide>
          <p className="mb-3 text-sm text-[var(--dim)]">
            Canonical host: <strong className="text-white">{SITE_URL}</strong> — this exact document
            ships at the project root and is referenced by the Vercel rewrites in{" "}
            <code>vercel.json</code>.
          </p>
          <pre className="overflow-x-auto rounded-xl border border-[var(--border)] bg-black/50 p-4 text-xs leading-relaxed">
            {seo === "sitemap" ? SITEMAP_XML : ROBOTS_TXT}
          </pre>
          <button
            type="button"
            onClick={() =>
              downloadText(
                seo === "sitemap" ? "sitemap.xml" : "robots.txt",
                seo === "sitemap" ? SITEMAP_XML : ROBOTS_TXT,
                seo === "sitemap" ? "application/xml" : "text/plain",
              )
            }
            className="grad-bg mt-4 rounded-xl px-5 py-2.5 font-display font-bold text-white"
          >
            Download {seo === "sitemap" ? "sitemap.xml" : "robots.txt"}
          </button>
        </Modal>
      )}
    </div>
  );
}
