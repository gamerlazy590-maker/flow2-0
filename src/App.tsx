import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Logo } from "./Logo";
import { MotionClip } from "./components/MotionClip";
import {
  addCreation,
  adminStats,
  bumpImageCount,
  changePassword,
  consumeVideoCredit,
  deleteCreation,
  getSession,
  listCreations,
  login,
  logout,
  register,
  updateDisplayName,
  DAILY_VIDEO_LIMIT,
  VIDEO_DURATION_SECONDS,
  type AspectRatio,
  type CameraMotion,
  type Creation,
  type PublicUser,
  type StylePreset,
} from "./lib/store";
import { loadImage, pollinationsUrl } from "./lib/pollinations";
import showcaseCyberpunk from "./assets/showcase-cyberpunk.webp";
import showcaseAnime from "./assets/showcase-anime.webp";
import showcaseRender from "./assets/showcase-3drender.webp";
import showcaseLandscape from "./assets/showcase-landscape.webp";
import showcasePortrait from "./assets/showcase-portrait.webp";
import showcaseNebula from "./assets/showcase-nebula.webp";

type View = "landing" | "studio" | "admin";
type StudioTab = "video" | "image" | "creations" | "profile";
type LegalKind = "terms" | "privacy" | null;
type SeoKind = "sitemap" | "robots" | null;

const SITE_URL = "https://flow2-0.vercel.app";
const STYLES: StylePreset[] = ["Cinematic", "Anime", "3D Render", "Realistic"];
const RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1"];
const MOTIONS: { id: CameraMotion; label: string }[] = [
  { id: "zoom-in", label: "Zoom in" },
  { id: "zoom-out", label: "Zoom out" },
  { id: "pan-left", label: "Pan left" },
  { id: "pan-right", label: "Pan right" },
];

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
    a: "Flow 2.0 is a free AI video generator and image creator that runs entirely in your browser at flow2-0.vercel.app. Type a prompt and Flow turns it into an 8-second video clip (5 free a day) or an HD image (unlimited). It is an independent app — a free alternative in the same category as Google Flow, Veo, Sora, Runway, and Kling, without their subscriptions or watermarks. Honest note: videos here are cinematic camera moves over one AI-generated keyframe, not real AI motion — real AI motion video needs a paid API, and this free version does not include one.",
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
    a: "Every video starts from an AI-generated cinematic keyframe — the image to video AI step happens automatically: pick a camera move (zoom in, zoom out, pan left, pan right) and Flow animates that frame into a real 8-second video clip, downloadable as WebM. For an AI scene extension video generator workflow, generate a matching follow-up scene with the same prompt tail and style preset, then chain the clips in your editor — each new scene extends the world of the last.",
  },
  {
    q: "Is there a watermark on downloads?",
    a: "No. Flow 2.0 is a free AI video generator without watermark — images download at full resolution and videos download as clean WebM clips, ready to publish. Flow 2.0 adds no watermark of its own.",
  },
  {
    q: "Can I make videos for YouTube, ads, anime, and stories?",
    a: "Absolutely. As an AI video maker for YouTube storytelling, creators build faceless channel content scene by scene in 16:9. The Anime preset doubles as an AI anime video generator for shorts and story arcs, the Realistic and 3D Render presets work as an AI commercial ad generator for product spots, and the Cinematic preset turns Flow 2.0 into an AI story video maker for trailers, book teasers, and short films. Use 9:16 for Shorts, Reels, and TikTok.",
  },
  {
    q: "Can I download my creations?",
    a: "Yes. Images download as full-resolution files, and videos download as 8-second WebM clips from My Creations. Download anything you want to keep — your library lives in this browser, so it does not follow you to another device.",
  },
  {
    q: "Where are my account and creations stored?",
    a: "In this browser only. This version of Flow 2.0 has no server: your account (email, display name, and a salted hash of your password — never the password itself), your daily video credits, and your creations are stored in your browser's local storage. They are not synced to any server or to your other devices, and clearing your browser data will delete them. That is the trade-off that keeps Flow 2.0 free with no sign-up server and no API keys.",
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

function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
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
            aria-label="Close"
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
  onClose,
  onAuthed,
}: {
  onClose: () => void;
  onAuthed: (user: PublicUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleNote, setGoogleNote] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user =
        mode === "register"
          ? await register(email, password, displayName)
          : await login(email, password);
      onAuthed(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={mode === "register" ? "Create your free account" : "Welcome back"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && (
          <div>
            <label htmlFor="auth-name" className="mb-1 block text-sm font-semibold">
              Display name
            </label>
            <input
              id="auth-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--accent)]"
              placeholder="Ali"
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--accent)]"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="mb-1 block text-sm font-semibold">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--accent)]"
            placeholder="At least 6 characters"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="grad-bg btn-glow w-full rounded-xl py-3 font-display font-bold text-white disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "register" ? "Create free account" : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "register" ? "login" : "register");
          setError("");
        }}
        className="mt-3 w-full text-center text-sm font-semibold text-[var(--accent-2)] hover:underline"
      >
        {mode === "register"
          ? "Already have an account? Sign in"
          : "No account yet? Create one free"}
      </button>
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
          Google sign-in isn't available in this free local version — your free email account
          takes ten seconds and works the same way in this browser.
        </p>
      )}
      <p className="mt-4 text-center text-xs text-[var(--dim)]">
        Passwords are stored only as salted PBKDF2 hashes in this browser — never in plain text,
        and never sent to a server (there is no server). The first account registered in this
        browser becomes the site owner with admin access.
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
          <strong className="text-white">Accounts.</strong> Keep your password private. This
          version stores accounts only in your own browser, so the site owner can only see
          accounts created in the same browser. The site owner may suspend accounts that abuse
          the service or attempt to bypass usage limits.
        </p>
        <p>
          <strong className="text-white">Availability.</strong> The service is provided "as is"
          without warranties; generated media is stored on a best-effort basis in your browser,
          so download anything you want to keep.
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
        the media you generate with its prompts — all stored only in your own browser's local
        storage. There is no server, so nothing leaves your device to us.
      </p>
      <p>
        <strong className="text-white">What we don't do.</strong> We don't sell your data, we
        don't require a credit card, and we don't use your creations to train models.
      </p>
      <p>
        <strong className="text-white">Admin visibility.</strong> The site owner can see account
        emails, registration dates, and usage counts in the admin dashboard for accounts created
        in the same browser — never passwords, which are stored only as salted hashes.
      </p>
      <p>
        <strong className="text-white">Deletion.</strong> Deleting a creation removes it from your
        browser. To delete your whole account, clear Flow 2.0's data in your browser settings.
      </p>
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
  user: PublicUser | null;
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
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0A0A0F]/85 backdrop-blur-md">
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
              <p className="mt-3 rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm leading-relaxed text-[var(--dim)]">
                <strong className="text-white">Honest note:</strong> videos on Flow 2.0 are
                8-second camera moves over one AI-generated keyframe, exported as WebM — not real
                AI motion. Real AI motion video needs a paid API, and this free version does not
                include one. Your account and creations also live in this browser only (see the
                FAQ) — there is no server behind this site.
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
            Flow 2.0 is deployed on its canonical home at{" "}
            <strong className="text-white">{SITE_URL}</strong> — a free Vercel subdomain (flow2.com
            and flow20.com were already taken). This build is a plain static site: Vite + React,
            no server, no environment variables, no API keys. The source lives on GitHub at{" "}
            <a
              className="font-semibold text-[var(--accent-2)] underline decoration-dotted"
              href="https://github.com/gamerlazy590-maker/flow2-0"
              target="_blank"
              rel="noreferrer"
            >
              github.com/gamerlazy590-maker/flow2-0
            </a>
            .
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-bold">🚀 Deploy to Vercel</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--dim)]">
                <li>Push this project to the flow2-0 GitHub repo.</li>
                <li>Import it in Vercel as project <strong className="text-white">flow2-0</strong> to claim the subdomain.</li>
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

function CreditBadge({ user }: { user: PublicUser }) {
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

function GeneratorPanel({
  kind,
  initialPrompt,
  user,
  onUserChange,
}: {
  kind: "video" | "image";
  initialPrompt: string;
  user: PublicUser;
  onUserChange: (user: PublicUser) => void;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negEnabled, setNegEnabled] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [style, setStyle] = useState<StylePreset>("Cinematic");
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [motion, setMotion] = useState<CameraMotion>("zoom-in");
  const [formError, setFormError] = useState("");
  const [latest, setLatest] = useState<Creation | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (prompt.trim().length < 3) {
      setFormError("Describe what you want to create — at least a few words.");
      return;
    }
    if (kind === "video" && user.videoCreditsRemaining <= 0) {
      setFormError(
        `You've used all ${DAILY_VIDEO_LIMIT} free video credits for today. Images are still unlimited — or come back when your credits reset.`,
      );
      return;
    }
    setBusy(true);
    try {
      // Video credits are consumed before generation, exactly like the old app.
      let freshUser = user;
      if (kind === "video") {
        freshUser = consumeVideoCredit(user.email);
        onUserChange(freshUser);
      }
      const imageUrl = pollinationsUrl({
        prompt,
        negativePrompt: negEnabled ? negativePrompt : "",
        style,
        ratio,
      });
      // Confirm the remote generator actually returned an image.
      await loadImage(imageUrl);
      const creation = addCreation({
        ownerEmail: user.email,
        kind,
        prompt: prompt.trim(),
        negativePrompt: negEnabled ? negativePrompt.trim() : "",
        stylePreset: style,
        aspectRatio: ratio,
        motion,
        imageUrl,
      });
      if (kind === "image") bumpImageCount(user.email);
      setLatest(creation);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setBusy(false);
    }
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
            ? `One generation = one daily video credit. You get a real ${VIDEO_DURATION_SECONDS}-second video clip: your AI keyframe animated with your chosen camera move, downloadable as WebM.`
            : "Images are unlimited and free — they never touch your video credits."}
        </p>

        <label htmlFor={`prompt-${kind}`} className="mb-1.5 mt-5 block text-sm font-semibold">
          Prompt
        </label>
        <textarea
          id={`prompt-${kind}`}
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
          <>
            <input
              aria-label="Negative prompt — what to avoid"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--accent)]"
              placeholder="blurry, watermark, extra fingers…"
            />
            <p className="mt-1 text-xs text-[var(--dim)]">
              The free image API has no dedicated negative-prompt field, so this is sent as
              guidance text (“avoid: …”) and may not always be honoured.
            </p>
          </>
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
          disabled={busy}
          className="grad-bg btn-glow mt-5 w-full rounded-xl py-3.5 font-display text-base font-bold text-white disabled:opacity-60"
        >
          {busy
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
          How video works here: Flow 2.0 generates a cinematic AI keyframe for your prompt, then
          animates it in your browser into a real {VIDEO_DURATION_SECONDS}-second video clip with
          your chosen camera move — playable and downloadable as WebM. It is an image-based
          camera move, not real AI motion: a paid text-to-video API would be needed for true
          motion, and this free version does not include one.
        </p>
      </form>

      <div className="glass h-fit rounded-2xl p-5" aria-live="polite">
        <h3 className="font-display font-bold">Preview</h3>
        {busy ? (
          <div className="shimmer mt-3 flex aspect-video items-center justify-center rounded-xl border border-[var(--border)] text-sm text-[var(--dim)]">
            Rendering your {kind}…
          </div>
        ) : latest ? (
          <div className="mt-3">
            {latest.kind === "video" ? (
              <MotionClip
                src={latest.imageUrl}
                motion={latest.motion}
                aspectRatio={latest.aspectRatio}
                title={latest.prompt}
              />
            ) : (
              <>
                <img
                  src={latest.imageUrl}
                  alt={`AI-generated image: ${latest.prompt}`}
                  className="w-full rounded-xl border border-[var(--border)]"
                />
                <a
                  href={latest.imageUrl}
                  download="flow2-image.jpg"
                  target="_blank"
                  rel="noreferrer"
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

function CreationsGrid({ user }: { user: PublicUser }) {
  const [items, setItems] = useState<Creation[]>(() => listCreations(user.email));
  const [deleteError, setDeleteError] = useState("");

  const refresh = () => setItems(listCreations(user.email));

  const remove = (id: string) => {
    try {
      deleteCreation(user.email, id);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete that creation.");
    }
  };

  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-[var(--dim)]">
        No creations yet. Generate your first image or video — it will show up here.
      </div>
    );
  }

  return (
    <div>
      {deleteError && (
        <p role="alert" className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {deleteError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <article key={c.id} className="glass overflow-hidden rounded-2xl">
            {c.kind === "video" ? (
              <MotionClip src={c.imageUrl} motion={c.motion} aspectRatio={c.aspectRatio} title={c.prompt} />
            ) : (
              <img
                src={c.imageUrl}
                alt={`AI-generated image: ${c.prompt}`}
                loading="lazy"
                className="w-full object-cover"
                style={{ aspectRatio: c.aspectRatio === "9:16" ? "4/5" : c.aspectRatio === "1:1" ? "1/1" : "16/10" }}
              />
            )}
            <div className="p-4">
              <p className="text-sm text-[var(--dim)]">“{c.prompt}”</p>
              <p className="mt-1 text-xs text-[var(--dim)]">
                {c.kind === "video" ? "🎬 Video · 8s WebM" : "🖼️ Image"} · {c.stylePreset} ·{" "}
                {c.aspectRatio} · {formatDate(c.createdAt)}
              </p>
              <div className="mt-3 flex gap-2">
                {c.kind === "image" && (
                  <a
                    href={c.imageUrl}
                    download="flow2-image.jpg"
                    target="_blank"
                    rel="noreferrer"
                    className="grad-bg rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-white/10"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProfileTab({ user, onUserChange }: { user: PublicUser; onUserChange: (u: PublicUser) => void }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    try {
      onUserChange(updateDisplayName(user.email, displayName));
      setMsg("Display name updated.");
      setErr("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not update your name.");
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await changePassword(user.email, currentPassword, newPassword);
      setMsg("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not change your password.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass h-fit rounded-2xl p-5">
        <h2 className="font-display text-xl font-bold">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm text-[var(--dim)]">
          <div className="flex justify-between gap-3"><dt>Email</dt><dd className="font-semibold text-white">{user.email}</dd></div>
          <div className="flex justify-between gap-3"><dt>Joined</dt><dd>{formatDate(user.createdAt)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Role</dt><dd>{user.isAdmin ? "Owner / Admin" : "Creator"}</dd></div>
          <div className="flex justify-between gap-3"><dt>Video credits</dt><dd>{user.videoCreditsRemaining}/{user.videoDailyLimit} (reset {formatDateTime(user.creditsResetAt)})</dd></div>
          <div className="flex justify-between gap-3"><dt>Images generated</dt><dd>{user.totalImages}</dd></div>
        </dl>
        <form onSubmit={saveName} className="mt-5">
          <label htmlFor="profile-name" className="mb-1 block text-sm font-semibold">Display name</label>
          <input
            id="profile-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--accent)]"
          />
          <button type="submit" className="grad-bg mt-3 rounded-xl px-5 py-2.5 font-display text-sm font-bold text-white">
            Save name
          </button>
        </form>
        <p className="mt-4 rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-xs leading-relaxed text-[var(--dim)]">
          <strong className="text-white">Local-only account:</strong> this account lives in this
          browser only. It is not synced to a server or to your other devices, and clearing your
          browser data deletes it. Download any creations you want to keep.
        </p>
      </div>
      <div className="glass h-fit rounded-2xl p-5">
        <h2 className="font-display text-xl font-bold">Change password</h2>
        <form onSubmit={savePassword} className="mt-3 space-y-3">
          <div>
            <label htmlFor="pw-current" className="mb-1 block text-sm font-semibold">Current password</label>
            <input
              id="pw-current"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="pw-new" className="mb-1 block text-sm font-semibold">New password</label>
            <input
              id="pw-new"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--accent)]"
            />
          </div>
          {msg && <p className="text-sm text-emerald-300">{msg}</p>}
          {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
          <button type="submit" className="grad-bg rounded-xl px-5 py-2.5 font-display text-sm font-bold text-white">
            Change password
          </button>
        </form>
      </div>
    </div>
  );
}

function Studio({
  user,
  initialPrompt,
  onUserChange,
  onSignOut,
  onGoAdmin,
  onGoHome,
}: {
  user: PublicUser;
  initialPrompt: string;
  onUserChange: (u: PublicUser) => void;
  onSignOut: () => void;
  onGoAdmin: () => void;
  onGoHome: () => void;
}) {
  const [tab, setTab] = useState<StudioTab>("video");
  const tabs: { id: StudioTab; label: string; icon: string }[] = [
    { id: "video", label: "Text to Video", icon: "🎬" },
    { id: "image", label: "Text to Image", icon: "🖼️" },
    { id: "creations", label: "My Creations", icon: "🗂️" },
    { id: "profile", label: "Profile", icon: "👤" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0A0A0F]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={onGoHome} aria-label="Flow 2.0 home" className="rounded-lg">
            <Logo size={34} />
          </button>
          <div className="flex items-center gap-2">
            <CreditBadge user={user} />
            {user.isAdmin && (
              <button
                type="button"
                onClick={onGoAdmin}
                className="hidden rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-white/10 sm:block"
              >
                🛡️ Admin Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
        <nav aria-label="Studio" className="md:w-56 md:shrink-0">
          <div className="glass rounded-2xl p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--dim)]">
              {user.displayName} · {user.isAdmin ? "Owner" : "Creator"}
            </p>
            <div className="flex flex-row gap-2 md:flex-col">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-pressed={tab === t.id}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-left text-sm font-semibold md:flex-none ${
                    tab === t.id ? "grad-bg text-white" : "hover:bg-white/5"
                  }`}
                >
                  <span aria-hidden="true">{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 px-2 text-xs leading-relaxed text-[var(--dim)]">
            Videos are 8-second camera moves over an AI keyframe, exported as WebM. Images are
            unlimited and free.
          </p>
        </nav>

        <main className="min-w-0 flex-1">
          <h1 className="font-display mb-4 text-2xl font-extrabold">
            {tab === "video" && "Text to Video"}
            {tab === "image" && "Text to Image"}
            {tab === "creations" && "My Creations"}
            {tab === "profile" && "Profile Settings"}
          </h1>
          {tab === "video" && (
            <GeneratorPanel kind="video" initialPrompt={initialPrompt} user={user} onUserChange={onUserChange} />
          )}
          {tab === "image" && (
            <GeneratorPanel kind="image" initialPrompt={initialPrompt} user={user} onUserChange={onUserChange} />
          )}
          {tab === "creations" && <CreationsGrid user={user} />}
          {tab === "profile" && <ProfileTab user={user} onUserChange={onUserChange} />}
        </main>
      </div>
    </div>
  );
}

function AdminDashboard({
  user,
  onBack,
  onSignOut,
}: {
  user: PublicUser;
  onBack: () => void;
  onSignOut: () => void;
}) {
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState(() => adminStats());

  useEffect(() => {
    setStats(adminStats());
  }, []);

  const filtered = stats.users.filter(
    (u) =>
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.displayName.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0A0A0F]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo size={34} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-white/10"
            >
              ← Back to Studio
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-display text-2xl font-extrabold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--dim)]">
          Signed in as {user.email} (owner). This dashboard only sees accounts registered in
          this browser — the local-only version has no server user list.
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Total users", String(stats.totalUsers)],
            ["Total creations", String(stats.totalCreations)],
            ["Images generated", String(stats.totalImages)],
            ["Videos generated", String(stats.totalVideos)],
          ].map(([label, value]) => (
            <div key={label} className="glass rounded-2xl px-4 py-4">
              <dt className="text-xs text-[var(--dim)]">{label}</dt>
              <dd className="font-display mt-1 text-2xl font-extrabold">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="glass mt-6 overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
            <h2 className="font-display text-lg font-bold">Users</h2>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email or name…"
              aria-label="Search users"
              className="rounded-xl border border-[var(--border)] bg-black/40 px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-y border-white/10 text-xs uppercase tracking-wide text-[var(--dim)]">
                  <th scope="col" className="px-5 py-3">Email</th>
                  <th scope="col" className="px-5 py-3">Name</th>
                  <th scope="col" className="px-5 py-3">Joined</th>
                  <th scope="col" className="px-5 py-3">Videos today</th>
                  <th scope="col" className="px-5 py-3">Total images</th>
                  <th scope="col" className="px-5 py-3">Role</th>
                </tr>
              </thead>
              <tbody className="text-[var(--dim)]">
                {filtered.map((u) => (
                  <tr key={u.email} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 font-semibold text-white">{u.email}</td>
                    <td className="px-5 py-3">{u.displayName}</td>
                    <td className="px-5 py-3">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">{u.videoCountToday} / {u.videoDailyLimit}</td>
                    <td className="px-5 py-3">{u.totalImages}</td>
                    <td className="px-5 py-3">{u.isAdmin ? "Owner" : "Creator"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center">
                      No users match that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<PublicUser | null>(() => getSession());
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "landing";
    return window.location.pathname === "/admin"
      ? "admin"
      : window.location.pathname === "/studio"
        ? "studio"
        : "landing";
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [legal, setLegal] = useState<LegalKind>(null);
  const [seo, setSeo] = useState<SeoKind>(null);
  const [initialPrompt, setInitialPrompt] = useState("");

  useEffect(() => {
    if (view === "studio" || view === "admin") {
      window.history.replaceState(null, "", view === "admin" ? "/admin" : "/studio");
    } else {
      window.history.replaceState(null, "", "/");
    }
  }, [view]);

  const openStudio = (prompt?: string) => {
    if (prompt) setInitialPrompt(prompt);
    if (user) {
      setView("studio");
    } else {
      setAuthOpen(true);
    }
  };

  const handleAuthed = (u: PublicUser) => {
    setUser(u);
    setAuthOpen(false);
    setView("studio");
  };

  const handleSignOut = () => {
    logout();
    setUser(null);
    setView("landing");
  };

  return (
    <div>
      {view === "landing" && (
        <Landing
          user={user}
          onStart={openStudio}
          onSignIn={() => setAuthOpen(true)}
          onOpenSeo={setSeo}
          onOpenLegal={setLegal}
        />
      )}
      {view === "studio" && user && (
        <Studio
          user={user}
          initialPrompt={initialPrompt}
          onUserChange={setUser}
          onSignOut={handleSignOut}
          onGoAdmin={() => setView("admin")}
          onGoHome={() => setView("landing")}
        />
      )}
      {view === "admin" && user && user.isAdmin && (
        <AdminDashboard user={user} onBack={() => setView("studio")} onSignOut={handleSignOut} />
      )}
      {(view === "studio" || view === "admin") && !user && (
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <Logo size={48} />
          <h1 className="font-display mt-4 text-2xl font-bold">Sign in to continue</h1>
          <p className="mt-2 text-sm text-[var(--dim)]">
            The studio and admin dashboard need a free account.
          </p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="grad-bg btn-glow mt-6 rounded-xl px-6 py-3 font-display font-bold text-white"
          >
            Sign in / Create account
          </button>
        </div>
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onAuthed={handleAuthed} />}
      {legal && (
        <Modal title={legal === "terms" ? "Terms of Service" : "Privacy Policy"} onClose={() => setLegal(null)} wide>
          <LegalContent kind={legal} />
        </Modal>
      )}
      {seo && (
        <Modal title={seo === "sitemap" ? "sitemap.xml" : "robots.txt"} onClose={() => setSeo(null)} wide>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-xs leading-relaxed text-[var(--dim)]">
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
            className="grad-bg mt-4 rounded-xl px-5 py-2.5 font-display text-sm font-bold text-white"
          >
            Download {seo === "sitemap" ? "sitemap.xml" : "robots.txt"}
          </button>
        </Modal>
      )}
    </div>
  );
}
