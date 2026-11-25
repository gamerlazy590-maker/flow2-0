// Drizzle schema for the AI Image & Video Generator.
//
// Tables mirror the brief's database requirements:
//   users      — user_id, email, hashed_password, daily_video_count,
//                last_reset_timestamp, plus admin flag and image totals
//   sessions   — opaque login tokens issued at sign-in
//   creations  — generated_media_urls (media_url + blob_key) per user

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  // Salted PBKDF2 hash, stored as "<saltHex>:<hashHex>" — never plaintext.
  passwordHash: text("password_hash").notNull(),
  isAdmin: integer("is_admin").notNull().default(0),
  dailyVideoCount: integer("daily_video_count").notNull().default(0),
  lastResetAt: integer("last_reset_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  totalImages: integer("total_images").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const creations = sqliteTable("creations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  kind: text("kind", { enum: ["image", "video"] }).notNull(),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt").notNull().default(""),
  stylePreset: text("style_preset").notNull().default("Cinematic"),
  aspectRatio: text("aspect_ratio").notNull().default("16:9"),
  // generated_media_urls: durable own-origin blob URL + its blob key.
  // For images this is the image itself; for videos it is the AI keyframe,
  // and videoUrl/videoBlobKey point at the rendered MP4 once encoding runs.
  mediaUrl: text("media_url").notNull(),
  blobKey: text("blob_key").notNull(),
  videoUrl: text("video_url"),
  videoBlobKey: text("video_blob_key"),
  motion: text("motion").notNull().default("zoom-in"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
