// Flow 2.0 (Vercel version) — local-only data layer.
//
// HONEST LIMITATION: this build has no server. Accounts, credits and
// creations live in THIS browser's localStorage only. They are not synced
// to any server, and clearing browser data deletes them. The FAQ and the
// Profile tab say this in plain language. Do not pretend otherwise.

export const DAILY_VIDEO_LIMIT = 5;
export const VIDEO_DURATION_SECONDS = 8;

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type StylePreset = "Cinematic" | "Anime" | "3D Render" | "Realistic";
export type CameraMotion = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

export interface UserRecord {
  email: string;
  displayName: string;
  salt: string; // base64
  hash: string; // base64 PBKDF2-SHA256
  createdAt: string; // ISO
  isAdmin: boolean;
  videoCount: number; // videos used in the current rolling 24h window
  windowStart: string; // ISO start of the current 24h window
  totalImages: number;
}

export interface Creation {
  id: string;
  ownerEmail: string;
  kind: "video" | "image";
  prompt: string;
  negativePrompt: string;
  stylePreset: StylePreset;
  aspectRatio: AspectRatio;
  motion: CameraMotion;
  /** Remote keyframe URL (Pollinations). Videos animate this image in-browser. */
  imageUrl: string;
  createdAt: string; // ISO
}

export interface PublicUser {
  email: string;
  displayName: string;
  createdAt: string;
  isAdmin: boolean;
  videoCreditsRemaining: number;
  videoDailyLimit: number;
  creditsResetAt: string; // ISO
  totalImages: number;
  videoCount: number;
}

const USERS_KEY = "flow2.users.v1";
const SESSION_KEY = "flow2.session.v1";
const CREATIONS_KEY = "flow2.creations.v1";

function readUsers(): UserRecord[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as UserRecord[];
  } catch {
    return [];
  }
}

function writeUsers(users: UserRecord[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readCreations(): Creation[] {
  try {
    return JSON.parse(localStorage.getItem(CREATIONS_KEY) ?? "[]") as Creation[];
  } catch {
    return [];
  }
}

function writeCreations(creations: Creation[]) {
  localStorage.setItem(CREATIONS_KEY, JSON.stringify(creations));
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100_000, hash: "SHA-256" },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

/** Roll the 24h window forward when it has expired; returns the (possibly reset) record. */
function rollWindow(user: UserRecord): UserRecord {
  const start = new Date(user.windowStart).getTime();
  if (Number.isNaN(start) || Date.now() - start >= 24 * 60 * 60 * 1000) {
    return { ...user, videoCount: 0, windowStart: new Date().toISOString() };
  }
  return user;
}

export function toPublicUser(user: UserRecord): PublicUser {
  const rolled = rollWindow(user);
  const resetAt = new Date(new Date(rolled.windowStart).getTime() + 24 * 60 * 60 * 1000);
  return {
    email: rolled.email,
    displayName: rolled.displayName,
    createdAt: rolled.createdAt,
    isAdmin: rolled.isAdmin,
    videoCreditsRemaining: Math.max(0, DAILY_VIDEO_LIMIT - rolled.videoCount),
    videoDailyLimit: DAILY_VIDEO_LIMIT,
    creditsResetAt: resetAt.toISOString(),
    totalImages: rolled.totalImages,
    videoCount: rolled.videoCount,
  };
}

function persistRolled(user: UserRecord): UserRecord {
  const rolled = rollWindow(user);
  const users = readUsers();
  const i = users.findIndex((u) => u.email === rolled.email);
  if (i >= 0) {
    users[i] = rolled;
    writeUsers(users);
  }
  return rolled;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<PublicUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("Enter a valid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const users = readUsers();
  if (users.some((u) => u.email === cleanEmail)) {
    throw new Error("An account with this email already exists in this browser. Sign in instead.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(password, salt);
  const record: UserRecord = {
    email: cleanEmail,
    displayName: displayName.trim() || cleanEmail.split("@")[0],
    salt: toBase64(salt),
    hash,
    createdAt: new Date().toISOString(),
    // First account registered in this browser becomes the owner/admin.
    isAdmin: users.length === 0,
    videoCount: 0,
    windowStart: new Date().toISOString(),
    totalImages: 0,
  };
  users.push(record);
  writeUsers(users);
  localStorage.setItem(SESSION_KEY, cleanEmail);
  return toPublicUser(record);
}

export async function login(email: string, password: string): Promise<PublicUser> {
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email === cleanEmail);
  if (!user) throw new Error("No account with this email in this browser. Register first.");
  const hash = await hashPassword(password, fromBase64(user.salt));
  if (hash !== user.hash) throw new Error("Wrong password. Try again.");
  localStorage.setItem(SESSION_KEY, cleanEmail);
  return toPublicUser(persistRolled(user));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): PublicUser | null {
  const email = localStorage.getItem(SESSION_KEY);
  if (!email) return null;
  const user = readUsers().find((u) => u.email === email);
  if (!user) return null;
  return toPublicUser(persistRolled(user));
}

export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("Account not found.");
  const hash = await hashPassword(currentPassword, fromBase64(user.salt));
  if (hash !== user.hash) throw new Error("Current password is wrong.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  user.salt = toBase64(salt);
  user.hash = await hashPassword(newPassword, salt);
  writeUsers(users);
}

export function updateDisplayName(email: string, displayName: string): PublicUser {
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("Account not found.");
  user.displayName = displayName.trim() || user.displayName;
  writeUsers(users);
  return toPublicUser(user);
}

/** Consume one video credit (rolls the window first). Throws when out of credits. */
export function consumeVideoCredit(email: string): PublicUser {
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("Account not found.");
  const rolled = rollWindow(user);
  if (rolled.videoCount >= DAILY_VIDEO_LIMIT) {
    throw new Error(
      `You've used all ${DAILY_VIDEO_LIMIT} free video credits for today. Images are still unlimited — or come back when your credits reset.`,
    );
  }
  rolled.videoCount += 1;
  const i = users.findIndex((u) => u.email === email);
  users[i] = rolled;
  writeUsers(users);
  return toPublicUser(rolled);
}

export function bumpImageCount(email: string): void {
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return;
  user.totalImages += 1;
  writeUsers(users);
}

export function addCreation(creation: Omit<Creation, "id" | "createdAt">): Creation {
  const full: Creation = {
    ...creation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const all = readCreations();
  all.unshift(full);
  writeCreations(all);
  return full;
}

export function listCreations(email: string, limit = 60): Creation[] {
  return readCreations()
    .filter((c) => c.ownerEmail === email)
    .slice(0, limit);
}

export function deleteCreation(email: string, id: string): void {
  writeCreations(readCreations().filter((c) => !(c.id === id && c.ownerEmail === email)));
}

/** Admin view: every account registered in THIS browser (local-only by design). */
export function adminStats(): {
  totalUsers: number;
  totalCreations: number;
  totalImages: number;
  totalVideos: number;
  users: (PublicUser & { videoCountToday: number })[];
} {
  const users = readUsers().map((u) => {
    const pub = toPublicUser(u);
    return { ...pub, videoCountToday: pub.videoCount };
  });
  const creations = readCreations();
  return {
    totalUsers: users.length,
    totalCreations: creations.length,
    totalImages: creations.filter((c) => c.kind === "image").length,
    totalVideos: creations.filter((c) => c.kind === "video").length,
    users: users.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}
