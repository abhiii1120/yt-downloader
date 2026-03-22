/**
 * config/constants.js — Application-wide constants
 * All magic numbers, strings, and maps live here.
 * Change these values without touching business logic.
 */

// ── Server ────────────────────────────────────────────────────────────────────
export const PORT = 4000;

// ── yt-dlp ────────────────────────────────────────────────────────────────────
export const YTDLP_BIN = "yt-dlp";
export const CONCURRENT_FRAGMENTS = "5"; // parallel chunk downloads
export const RETRIES = "3";
export const FILE_PREFIX = "ytget_";

// ── Quality → yt-dlp format string map ───────────────────────────────────────
export const FORMAT_MAP = {
  best: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best",
  "1080p":
    "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]",
  "720p":
    "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]",
  "480p":
    "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]",
  "360p":
    "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]",
  "audio only": "bestaudio[ext=m4a]/bestaudio",
};

// ── Extension → MIME type map ─────────────────────────────────────────────────
export const MIME_MAP = {
  mp4: "video/mp4",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  webm: "video/webm",
};
