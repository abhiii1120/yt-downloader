/**
 * services/ytdlp.service.js — yt-dlp integration layer
 *
 * All yt-dlp spawning, file management, and format logic lives here.
 * Nothing in this file knows about HTTP requests or responses.
 */
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import {
  YTDLP_BIN,
  FORMAT_MAP,
  MIME_MAP,
  FILE_PREFIX,
  CONCURRENT_FRAGMENTS,
  RETRIES,
  FFMPEG_PATH,
} from "../config/constants.js";

const execAsync = promisify(exec);

// ── Utility helpers ───────────────────────────────────────────────────────────

/**
 * Returns the yt-dlp format string for a given quality label.
 * Falls back to "best" for unrecognised values.
 * @param {string} quality
 * @returns {string}
 */
export function getFormat(quality) {
  return FORMAT_MAP[quality] ?? FORMAT_MAP["best"];
}

/**
 * Returns the MIME type for a given file extension.
 * @param {string} ext
 * @returns {string}
 */
export function getMimeType(ext) {
  return MIME_MAP[ext] ?? "application/octet-stream";
}

/**
 * Strips characters that are illegal in filenames.
 * @param {string} title
 * @returns {string}
 */
export function safeFilename(title = "video") {
  return title.replace(/[/\\?%*:|"<>]/g, "-");
}

// ── Core service functions ────────────────────────────────────────────────────

/**
 * Fetches video metadata from YouTube via yt-dlp --dump-json.
 *
 * @param {string} url - YouTube video URL
 * @returns {Promise<{ title, uploader, duration, view_count, thumbnail, id }>}
 */
export async function fetchVideoInfo(url) {
  const { stdout } = await execAsync(
    `${YTDLP_BIN} --dump-json --no-playlist "${url}"`,
  );
  const raw = JSON.parse(stdout);
  return {
    title: raw.title,
    uploader: raw.uploader,
    duration: raw.duration,
    view_count: raw.view_count,
    thumbnail: raw.thumbnail,
    id: raw.id,
  };
}

/**
 * Downloads a YouTube video to the system temp directory.
 *
 * @param {string} url     - YouTube video URL
 * @param {string} quality - Quality label (e.g. "720p", "audio only")
 * @returns {Promise<{ filePath: string, ext: string, title: string, id: string }>}
 */
export async function downloadVideo(url, quality = "best") {
  const isAudio = quality === "audio only";
  const ext = isAudio ? "m4a" : "mp4";
  const format = getFormat(quality);
  const tmpDir = os.tmpdir();
  const outputTemplate = path.join(tmpDir, `${FILE_PREFIX}%(id)s.%(ext)s`);

  // Get video ID so we can clean up and locate the output file
  const info = await fetchVideoInfo(url);

  // Remove any leftover temp files from a previous run
  fs.readdirSync(tmpDir)
    .filter((f) => f.startsWith(`${FILE_PREFIX}${info.id}`))
    .forEach((f) => fs.unlinkSync(path.join(tmpDir, f)));

  // Build yt-dlp arguments
  const args = [
    "--no-playlist",
    "-f",
    format,
    "-o",
    outputTemplate,
    "--ffmpeg-location",
    FFMPEG_PATH,
    "--concurrent-fragments",
    CONCURRENT_FRAGMENTS,
    "--no-part",
    "--no-mtime",
    "--retries",
    RETRIES,
    "--fragment-retries",
    RETRIES,
    "--merge-output-format",
    ext,
    ...(isAudio ? ["--extract-audio", "--audio-format", "m4a"] : []),
    url,
  ];

  await runProcess(YTDLP_BIN, args);

  // Locate the output file (yt-dlp may vary the extension slightly)
  const downloaded = fs
    .readdirSync(tmpDir)
    .find((f) => f.startsWith(`${FILE_PREFIX}${info.id}`));

  if (!downloaded) {
    throw new Error("Downloaded file not found in temp directory.");
  }

  const filePath = path.join(tmpDir, downloaded);
  const actualExt = path.extname(downloaded).slice(1);

  return { filePath, ext: actualExt, title: info.title, id: info.id };
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Runs a child process and returns a Promise that resolves on exit code 0.
 * stderr is forwarded to the parent process for visibility.
 *
 * @param {string}   bin  - Executable name
 * @param {string[]} args - Argument list
 * @returns {Promise<void>}
 */
function runProcess(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args);

    proc.stderr.on("data", (chunk) => {
      process.stderr.write(`[yt-dlp] ${chunk}`);
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${bin} exited with code ${code}`));
    });
  });
}
