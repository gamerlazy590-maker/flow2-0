// Actions for Flow 2.0 — free AI image & video generation SaaS.
//
// Auth: email + password with salted PBKDF2-SHA256 hashes (WebCrypto),
// opaque session tokens stored server-side. The first account registered
// becomes the site owner (is_admin = 1) and can open the admin dashboard.
//
// Generation: ctx.tool.generate_media renders a real AI image into this
// space's blob storage. Text-to-Image returns it directly (unlimited).
// Text-to-Video renders a cinematic keyframe the same way, then the
// client sends the keyframe bytes to renderVideoFile, which encodes a
// real MP4 (host ffmpeg, zoompan camera move) via the privileged
// renderVideoClip contract and stores it as the creation's video file.
// Video usage is capped at 5 per rolling 24 hours per user.

import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { count, desc, eq, sql } from "drizzle-orm";
import { PrivilegedContracts } from "@space/privileged";
import * as schema from "./schema";
import { PROJECT_EXPORT_FILES } from "./projectExport.generated";

const DAY_MS = 24 * 60 * 60 * 1000;
const VIDEO_DAILY_LIMIT = 5;

const STYLE_PROMPTS: Record<string, string> = {
  Cinematic:
    "cinematic film still, dramatic motivated lighting, anamorphic composition, rich teal-and-violet color grade, shallow depth of field",
  Anime:
    "beautiful anime illustration, clean cel shading, vibrant colors, detailed background art, studio-quality anime key visual",
  "3D Render":
    "high-end 3D render, octane render, physically based materials, studio lighting, ultra detailed, crisp reflections",
  Realistic:
    "photorealistic, shot on a full-frame camera, natural lighting, ultra detailed textures, 8k photograph",
};

const ASPECT_ORIENTATION = {
  "16:9": "landscape",
  "9:16": "portrait",
  "1:1": "square",
} as const;

const MOTIONS = ["zoom-in", "zoom-out", "pan-left", "pan-right"] as const;

// ---------- password hashing (salted PBKDF2-SHA256) ----------

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as ArrayBuffer, iterations: 120_000, hash: "SHA-256" },
    key,
    256,
  );
  return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex) as unknown as ArrayBuffer, iterations: 120_000, hash: "SHA-256" },
    key,
    256,
  );
  const candidate = toHex(new Uint8Array(bits));
  if (candidate.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}

// ---------- session / credit helpers ----------

type Db = ReturnType<Ctx["db"]>;
type UserRow = typeof schema.users.$inferSelect;

async function userForToken(db: Db, token: string): Promise<UserRow> {
  const rows = await db
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("Please sign in to continue.");
  return row.user;
}

/** Applies the rolling 24h reset; persists and returns the fresh counter. */
async function applyCreditReset(db: Db, user: UserRow): Promise<UserRow> {
  if (Date.now() - user.lastResetAt.getTime() >= DAY_MS) {
    const now = new Date();
    await db
      .update(schema.users)
      .set({ dailyVideoCount: 0, lastResetAt: now })
      .where(eq(schema.users.id, user.id));
    return { ...user, dailyVideoCount: 0, lastResetAt: now };
  }
  return user;
}

function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: user.isAdmin === 1,
    videoCreditsUsed: user.dailyVideoCount,
    videoCreditsRemaining: Math.max(0, VIDEO_DAILY_LIMIT - user.dailyVideoCount),
    videoDailyLimit: VIDEO_DAILY_LIMIT,
    creditsResetAt: new Date(user.lastResetAt.getTime() + DAY_MS).toISOString(),
    totalImages: user.totalImages,
    memberSince: user.createdAt.toISOString(),
  };
}

const userResponse = z.object({
  id: z.number(),
  email: z.string(),
  displayName: z.string(),
  isAdmin: z.boolean(),
  videoCreditsUsed: z.number(),
  videoCreditsRemaining: z.number(),
  videoDailyLimit: z.number(),
  creditsResetAt: z.string(),
  totalImages: z.number(),
  memberSince: z.string(),
});

const creationShape = z.object({
  id: z.number(),
  kind: z.enum(["image", "video"]),
  prompt: z.string(),
  negativePrompt: z.string(),
  stylePreset: z.string(),
  aspectRatio: z.string(),
  mediaUrl: z.string(),
  videoUrl: z.string().nullable(),
  motion: z.string(),
  createdAt: z.string(),
});

type CreationRow = typeof schema.creations.$inferSelect;

function toCreation(row: CreationRow) {
  return {
    id: row.id,
    kind: row.kind,
    prompt: row.prompt,
    negativePrompt: row.negativePrompt,
    stylePreset: row.stylePreset,
    aspectRatio: row.aspectRatio,
    mediaUrl: row.mediaUrl,
    videoUrl: row.videoUrl,
    motion: row.motion,
    createdAt: row.createdAt.toISOString(),
  };
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function buildPrompt(args: {
  prompt: string;
  negativePrompt: string;
  stylePreset: string;
  kind: "image" | "video";
}): string {
  const style = STYLE_PROMPTS[args.stylePreset] ?? STYLE_PROMPTS.Cinematic;
  let out = `${args.prompt}. Style: ${style}.`;
  if (args.kind === "video") {
    out += " Compose as a cinematic opening frame with a clear subject and depth, suitable for a slow camera move.";
  }
  if (args.negativePrompt.trim()) {
    out += ` Avoid: ${args.negativePrompt.trim()}.`;
  }
  return out;
}

// ---------- project export (downloadable ZIP of this app's own source) ----------
//
// The Publishing & deployment section offers the complete Flow 2.0 project
// as a ZIP so it can be pushed to GitHub (gamerlazy590-maker/flow2-0) and
// imported by Vercel as flow2-0. The file contents are embedded at build
// time in projectExport.generated.ts (see tools/build-project-export.mjs);
// the generated module itself is reconstructed from the same data below,
// so the ZIP contains every source file with none missing.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Assembles a valid ZIP archive (stored entries, UTF-8 names). */
function buildZip(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime =
    ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate =
    (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.data.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, entry.data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, dosTime, true);
    cd.setUint16(14, dosDate, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, entry.data.length, true);
    cd.setUint32(24, entry.data.length, true);
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nameBytes);
    offset += 30 + nameBytes.length + entry.data.length;
  }
  const cdSize = central.reduce((sum, c) => sum + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((sum, c) => sum + c.length, 0));
  let pos = 0;
  for (const chunk of all) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

/** Reproduces projectExport.generated.ts byte-for-byte from its own data. */
function projectManifestSource(): string {
  return [
    "// @generated by tools/build-project-export.mjs — do not edit by hand.",
    "export const PROJECT_EXPORT_FILES: ReadonlyArray<{ path: string; base64: string }> = [",
    ...PROJECT_EXPORT_FILES.map(
      (f) => `  ${JSON.stringify({ path: f.path, base64: f.base64 })},`,
    ),
    "];",
    "",
  ].join("\n");
}

const generateRequest = z.object({
  token: z.string().min(1),
  prompt: z.string().trim().min(3, "Describe what you want to create (at least 3 characters).").max(600),
  negativePrompt: z.string().max(300).default(""),
  stylePreset: z.enum(["Cinematic", "Anime", "3D Render", "Realistic"]).default("Cinematic"),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  motion: z.enum(MOTIONS).default("zoom-in"),
});

export const Actions = {
  register: defineAction({
    description: "Creates a Flow 2.0 account with a salted hashed password and returns a session token. The first account becomes the site owner/admin.",
    request: z.object({
      email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
      password: z.string().min(8, "Password must be at least 8 characters.").max(128),
      displayName: z.string().trim().max(60).default(""),
    }),
    response: z.object({ token: z.string(), user: userResponse }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const existing = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, args.email))
        .limit(1);
      if (existing.length > 0) {
        throw new Error("An account with this email already exists. Try signing in instead.");
      }
      const countRows = await db.select({ value: count() }).from(schema.users);
      const userCount = countRows[0]?.value ?? 0;
      const passwordHash = await hashPassword(args.password);
      const inserted = await db
        .insert(schema.users)
        .values({
          email: args.email,
          displayName: args.displayName || args.email.split("@")[0] || "Creator",
          passwordHash,
          isAdmin: userCount === 0 ? 1 : 0,
        })
        .returning();
      const user = inserted[0];
      if (!user) throw new Error("Could not create your account. Please try again.");
      const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
      await db.insert(schema.sessions).values({ token, userId: user.id });
      ctx.invalidateQueries();
      return { token, user: publicUser(user) };
    },
  }),

  login: defineAction({
    description: "Signs in with email and password and returns a fresh session token.",
    request: z.object({
      email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
      password: z.string().min(1, "Enter your password.").max(128),
    }),
    response: z.object({ token: z.string(), user: userResponse }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, args.email))
        .limit(1);
      const user = rows[0];
      if (!user || !(await verifyPassword(args.password, user.passwordHash))) {
        throw new Error("Email or password is incorrect.");
      }
      const fresh = await applyCreditReset(db, user);
      const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
      await db.insert(schema.sessions).values({ token, userId: user.id });
      return { token, user: publicUser(fresh) };
    },
  }),

  logout: defineAction({
    description: "Ends the session for the given token.",
    request: z.object({ token: z.string().min(1) }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.delete(schema.sessions).where(eq(schema.sessions.token, args.token));
      return { ok: true };
    },
  }),

  getSession: defineAction({
    description: "Returns the signed-in user's profile and live credit counters, applying the 24h video credit reset.",
    request: z.object({ token: z.string().min(1) }),
    response: z.object({ user: userResponse }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const user = await applyCreditReset(db, await userForToken(db, args.token));
      return { user: publicUser(user) };
    },
  }),

  updateProfile: defineAction({
    description: "Updates the signed-in user's display name.",
    request: z.object({
      token: z.string().min(1),
      displayName: z.string().trim().min(1, "Display name can't be empty.").max(60),
    }),
    response: z.object({ user: userResponse }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const user = await userForToken(db, args.token);
      await db
        .update(schema.users)
        .set({ displayName: args.displayName })
        .where(eq(schema.users.id, user.id));
      ctx.invalidateQueries();
      return { user: publicUser({ ...user, displayName: args.displayName }) };
    },
  }),

  changePassword: defineAction({
    description: "Changes the signed-in user's password after verifying the current one; the new password is stored as a salted hash.",
    request: z.object({
      token: z.string().min(1),
      currentPassword: z.string().min(1, "Enter your current password.").max(128),
      newPassword: z.string().min(8, "New password must be at least 8 characters.").max(128),
    }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const user = await userForToken(db, args.token);
      if (!(await verifyPassword(args.currentPassword, user.passwordHash))) {
        throw new Error("Your current password is incorrect.");
      }
      const passwordHash = await hashPassword(args.newPassword);
      await db
        .update(schema.users)
        .set({ passwordHash })
        .where(eq(schema.users.id, user.id));
      return { ok: true };
    },
  }),

  generateImage: defineAction({
    description: "Generates an AI image from a text prompt (unlimited, free) and saves it to the user's creations.",
    request: generateRequest,
    response: z.object({ creation: creationShape, user: userResponse }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const user = await userForToken(db, args.token);
      const media = await ctx.tool.generate_media(buildPrompt({ ...args, kind: "image" }), {
        orientation: ASPECT_ORIENTATION[args.aspectRatio],
      });
      const inserted = await db
        .insert(schema.creations)
        .values({
          userId: user.id,
          kind: "image",
          prompt: args.prompt,
          negativePrompt: args.negativePrompt,
          stylePreset: args.stylePreset,
          aspectRatio: args.aspectRatio,
          mediaUrl: media.url,
          blobKey: media.blobKey,
          motion: args.motion,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("Generation finished but saving failed. Please try again.");
      await db
        .update(schema.users)
        .set({ totalImages: sql`${schema.users.totalImages} + 1` })
        .where(eq(schema.users.id, user.id));
      ctx.invalidateQueries();
      return {
        creation: toCreation(row),
        user: publicUser({ ...user, totalImages: user.totalImages + 1 }),
      };
    },
  }),

  generateVideo: defineAction({
    description: "Generates an AI video: renders the cinematic keyframe (the matching renderVideoFile action then encodes the real MP4). Consumes one of the user's 5 free daily video credits.",
    request: generateRequest,
    response: z.object({ creation: creationShape, user: userResponse }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const user = await applyCreditReset(db, await userForToken(db, args.token));
      if (user.dailyVideoCount >= VIDEO_DAILY_LIMIT) {
        throw new Error(
          "You've used all 5 free video credits for today. They reset 24 hours after your window started — images are still unlimited.",
        );
      }
      const media = await ctx.tool.generate_media(buildPrompt({ ...args, kind: "video" }), {
        orientation: ASPECT_ORIENTATION[args.aspectRatio],
      });
      const inserted = await db
        .insert(schema.creations)
        .values({
          userId: user.id,
          kind: "video",
          prompt: args.prompt,
          negativePrompt: args.negativePrompt,
          stylePreset: args.stylePreset,
          aspectRatio: args.aspectRatio,
          mediaUrl: media.url,
          blobKey: media.blobKey,
          motion: args.motion,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("Generation finished but saving failed. Please try again.");
      const used = user.dailyVideoCount + 1;
      await db
        .update(schema.users)
        .set({ dailyVideoCount: used })
        .where(eq(schema.users.id, user.id));
      ctx.invalidateQueries();
      return {
        creation: toCreation(row),
        user: publicUser({ ...user, dailyVideoCount: used }),
      };
    },
  }),

  renderVideoFile: defineAction({
    description: "Encodes the real MP4 video file for a video creation from its AI keyframe (host ffmpeg, chosen camera move) and stores it as the creation's video URL.",
    privileged: [PrivilegedContracts.renderVideoClip],
    request: z.object({
      token: z.string().min(1),
      creationId: z.number().int().positive(),
      imageBase64: z.string().min(100).max(4_000_000),
    }),
    response: z.object({ creation: creationShape }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const user = await userForToken(db, args.token);
      const rows = await db
        .select()
        .from(schema.creations)
        .where(eq(schema.creations.id, args.creationId))
        .limit(1);
      const row = rows[0];
      if (!row || row.userId !== user.id) throw new Error("That creation was not found.");
      if (row.kind !== "video") throw new Error("Only video creations can be rendered to MP4.");
      if (row.videoUrl) return { creation: toCreation(row) };
      const motion = (MOTIONS as readonly string[]).includes(row.motion)
        ? (row.motion as (typeof MOTIONS)[number])
        : "zoom-in";
      const aspectRatio = (["16:9", "9:16", "1:1"] as const).includes(
        row.aspectRatio as "16:9" | "9:16" | "1:1",
      )
        ? (row.aspectRatio as "16:9" | "9:16" | "1:1")
        : "16:9";
      const rendered = await ctx.executePrivileged(PrivilegedContracts.renderVideoClip, {
        imageBase64: args.imageBase64,
        motion,
        aspectRatio,
      });
      const videoKey = `videos/${user.id}/${row.id}.mp4`;
      await ctx.blobs.put(videoKey, base64ToBytes(rendered.videoBase64), {
        contentType: "video/mp4",
      });
      const videoUrl = await ctx.blobs.getUrl(videoKey);
      await db
        .update(schema.creations)
        .set({ videoUrl, videoBlobKey: videoKey })
        .where(eq(schema.creations.id, row.id));
      ctx.invalidateQueries();
      return { creation: toCreation({ ...row, videoUrl, videoBlobKey: videoKey }) };
    },
  }),

  listCreations: defineAction({
    description: "Lists the signed-in user's creations, newest first.",
    request: z.object({
      token: z.string().min(1),
      limit: z.number().int().positive().max(60).default(60),
    }),
    response: z.object({ creations: z.array(creationShape) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const user = await userForToken(db, args.token);
      const rows = await db
        .select()
        .from(schema.creations)
        .where(eq(schema.creations.userId, user.id))
        .orderBy(desc(schema.creations.id))
        .limit(args.limit);
      return { creations: rows.map(toCreation) };
    },
  }),

  deleteCreation: defineAction({
    description: "Deletes one of the signed-in user's creations and its stored media.",
    request: z.object({ token: z.string().min(1), id: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const user = await userForToken(db, args.token);
      const rows = await db
        .select()
        .from(schema.creations)
        .where(eq(schema.creations.id, args.id))
        .limit(1);
      const row = rows[0];
      if (!row || row.userId !== user.id) throw new Error("That creation was not found.");
      await db.delete(schema.creations).where(eq(schema.creations.id, args.id));
      await ctx.blobs.delete(row.blobKey).catch(() => undefined);
      if (row.videoBlobKey) {
        await ctx.blobs.delete(row.videoBlobKey).catch(() => undefined);
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  adminStats: defineAction({
    description: "Admin only: platform totals plus a searchable table of registered users with registration dates, daily video credits used, and total images generated.",
    request: z.object({
      token: z.string().min(1),
      search: z.string().max(120).default(""),
    }),
    response: z.object({
      totals: z.object({
        totalUsers: z.number(),
        totalImages: z.number(),
        totalVideos: z.number(),
        videoCreditsUsedToday: z.number(),
      }),
      users: z.array(
        z.object({
          id: z.number(),
          email: z.string(),
          displayName: z.string(),
          isAdmin: z.boolean(),
          registeredAt: z.string(),
          dailyVideoCount: z.number(),
          totalImages: z.number(),
          totalCreations: z.number(),
        }),
      ),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const me = await userForToken(db, args.token);
      if (me.isAdmin !== 1) {
        throw new Error("Admin access only. This dashboard belongs to the site owner.");
      }
      const allUsers = await db
        .select()
        .from(schema.users)
        .orderBy(desc(schema.users.createdAt));
      const creationCounts = await db
        .select({
          userId: schema.creations.userId,
          kind: schema.creations.kind,
          value: count(),
        })
        .from(schema.creations)
        .groupBy(schema.creations.userId, schema.creations.kind);
      const perUser = new Map<number, { images: number; videos: number }>();
      let totalImagesAll = 0;
      let totalVideosAll = 0;
      for (const row of creationCounts) {
        const entry = perUser.get(row.userId) ?? { images: 0, videos: 0 };
        if (row.kind === "image") {
          entry.images += row.value;
          totalImagesAll += row.value;
        } else {
          entry.videos += row.value;
          totalVideosAll += row.value;
        }
        perUser.set(row.userId, entry);
      }
      const needle = args.search.trim().toLowerCase();
      const filtered = needle
        ? allUsers.filter(
            (u) =>
              u.email.toLowerCase().includes(needle) ||
              u.displayName.toLowerCase().includes(needle),
          )
        : allUsers;
      return {
        totals: {
          totalUsers: allUsers.length,
          totalImages: totalImagesAll,
          totalVideos: totalVideosAll,
          videoCreditsUsedToday: allUsers.reduce((sum, u) => sum + u.dailyVideoCount, 0),
        },
        users: filtered.map((u) => {
          const c = perUser.get(u.id) ?? { images: 0, videos: 0 };
          return {
            id: u.id,
            email: u.email,
            displayName: u.displayName,
            isAdmin: u.isAdmin === 1,
            registeredAt: u.createdAt.toISOString(),
            dailyVideoCount: u.dailyVideoCount,
            totalImages: u.totalImages,
            totalCreations: c.images + c.videos,
          };
        }),
      };
    },
  }),

  exportProjectZip: defineAction({
    description: "Assembles the complete Flow 2.0 project source (client, server, package.json, vercel.json, DEPLOY.md, README, drizzle migrations) into a downloadable ZIP for pushing to GitHub and deploying on Vercel.",
    request: z.object({}),
    response: z.object({
      url: z.string(),
      filename: z.string(),
      fileCount: z.number(),
      sizeBytes: z.number(),
    }),
    async handler(ctx) {
      const entries = PROJECT_EXPORT_FILES.map((f) => ({
        name: `flow2-0/${f.path}`,
        data: base64ToBytes(f.base64),
      }));
      entries.push({
        name: "flow2-0/server/src/projectExport.generated.ts",
        data: new TextEncoder().encode(projectManifestSource()),
      });
      const zip = buildZip(entries);
      const key = "exports/flow2-0-project.zip";
      await ctx.blobs.put(key, zip, { contentType: "application/zip" });
      const url = await ctx.blobs.getUrl(key);
      return {
        url,
        filename: "flow2-0-project.zip",
        fileCount: entries.length,
        sizeBytes: zip.length,
      };
    },
  }),
} satisfies ActionsModule;
