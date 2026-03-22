/**
 * services/ytdlp.service.js — yt-dlp integration layer
 *
 * Cookies are loaded from:
 *   - Local dev  → backend/cookies.txt file
 *   - Production → YOUTUBE_COOKIES environment variable
 */
import { exec, spawn } from "child_process";
import { promisify }   from "util";
import path            from "path";
import fs              from "fs";
import os              from "os";

import {
  YTDLP_BIN,
  FORMAT_MAP,
  MIME_MAP,
  FILE_PREFIX,
  FFMPEG_PATH,
  CONCURRENT_FRAGMENTS,
  RETRIES,
} from "../config/constants.js";

const execAsync = promisify(exec);

// ── Load cookies ──────────────────────────────────────────────────────────────
let COOKIES_FILE = null;

if (process.env.NODE_ENV === "production" && process.env.YOUTUBE_COOKIES) {
  // Production (Render) — write env variable content to a temp file
  COOKIES_FILE = path.join(os.tmpdir(), "yt_cookies.txt");
  fs.writeFileSync(COOKIES_FILE, process.env.YOUTUBE_COOKIES, "utf-8");
  console.log("✅ YouTube cookies loaded from environment variable");
} else {
  // Local development — use cookies.txt file directly
  const localCookies = path.join(process.cwd(), "cookies.txt");
  if (fs.existsSync(localCookies)) {
    COOKIES_FILE = localCookies;
    console.log("✅ YouTube cookies loaded from cookies.txt");
  } else {
    console.warn("⚠️  No cookies found — may get bot detection errors");
  }
}

// ── Utility helpers ───────────────────────────────────────────────────────────

/**
 * Returns the yt-dlp format string for a given quality label.
 * Falls back to "best" for unrecognised values.
 */
export function getFormat(quality) {
  return FORMAT_MAP[quality] ?? FORMAT_MAP["best"];
}

/**
 * Returns the MIME type for a given file extension.
 */
export function getMimeType(ext) {
  return MIME_MAP[ext] ?? "application/octet-stream";
}

/**
 * Strips characters that are illegal in filenames.
 */
export function safeFilename(title = "video") {
  return title.replace(/[/\\?%*:|"<>]/g, "-");
}

// ── Core service functions ────────────────────────────────────────────────────

/**
 * Fetches video metadata from YouTube via yt-dlp --dump-json.
 */
export async function fetchVideoInfo(url) {
  const cookieArg   = COOKIES_FILE ? `--cookies "${COOKIES_FILE}"` : "";
  const nodePath    = process.execPath; // path to current Node.js binary

  const { stdout } = await execAsync(
    `${YTDLP_BIN} --dump-json --no-playlist ${cookieArg} --extractor-args "youtube:player_client=web" "${url}"`,
    {
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:${require("path").dirname(nodePath)}`,
      }
    }
  );

  const raw = JSON.parse(stdout);
  return {
    title:      raw.title,
    uploader:   raw.uploader,
    duration:   raw.duration,
    view_count: raw.view_count,
    thumbnail:  raw.thumbnail,
    id:         raw.id,
  };
}
/**
 * Downloads a YouTube video to the system temp directory.
 */
export async function downloadVideo(url, quality = "best") {
  const isAudio        = quality === "audio only";
  const ext            = isAudio ? "m4a" : "mp4";
  const format         = getFormat(quality);
  const tmpDir         = os.tmpdir();
  const outputTemplate = path.join(tmpDir, `${FILE_PREFIX}%(id)s.%(ext)s`);

  const info = await fetchVideoInfo(url);

  // Remove leftover temp files
  fs.readdirSync(tmpDir)
    .filter((f) => f.startsWith(`${FILE_PREFIX}${info.id}`))
    .forEach((f) => fs.unlinkSync(path.join(tmpDir, f)));

  const args = [
    "--no-playlist",
    "-f",    format,
    "-o",    outputTemplate,
    "--ffmpeg-location",      FFMPEG_PATH,
    "--concurrent-fragments", CONCURRENT_FRAGMENTS,
    "--no-part",
    "--no-mtime",
    "--retries",              RETRIES,
    "--fragment-retries",     RETRIES,
    "--merge-output-format",  ext,
      "--extractor-args",       "youtube:player_client=web",
    ...(COOKIES_FILE ? ["--cookies", COOKIES_FILE] : []),
    ...(isAudio ? ["--extract-audio", "--audio-format", "m4a"] : []),
    url,
  ];

  await runProcess(YTDLP_BIN, args);

  const downloaded = fs.readdirSync(tmpDir)
    .find((f) => f.startsWith(`${FILE_PREFIX}${info.id}`));

  if (!downloaded) throw new Error("Downloaded file not found in temp directory.");

  const filePath  = path.join(tmpDir, downloaded);
  const actualExt = path.extname(downloaded).slice(1);

  return { filePath, ext: actualExt, title: info.title, id: info.id };
}

// ── Private helpers ───────────────────────────────────────────────────────────

function runProcess(bin, args) {
  return new Promise((resolve, reject) => {
    const nodePath = process.execPath;
    const proc = spawn(bin, args, {
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:${path.dirname(nodePath)}`,
      }
    });

    proc.stderr.on("data", (chunk) => process.stderr.write(`[yt-dlp] ${chunk}`));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${bin} exited with code ${code}`));
    });
  });
}