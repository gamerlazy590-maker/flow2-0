DROP TABLE IF EXISTS entries;
--> statement-breakpoint
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  daily_video_count INTEGER NOT NULL DEFAULT 0,
  last_reset_at INTEGER NOT NULL,
  total_images INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE creations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT NOT NULL DEFAULT '',
  style_preset TEXT NOT NULL DEFAULT 'Cinematic',
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  media_url TEXT NOT NULL,
  blob_key TEXT NOT NULL,
  motion TEXT NOT NULL DEFAULT 'zoom-in',
  created_at INTEGER NOT NULL
);
