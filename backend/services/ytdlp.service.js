/**
 * services/ytdlp.service.js — YouTube download service
 * Uses YT-API (RapidAPI) instead of local yt-dlp.
 */
import fetch  from "node-fetch";
import path   from "path";
import fs     from "fs";
import os     from "os";
import { MIME_MAP, FILE_PREFIX, RAPIDAPI_KEY, RAPIDAPI_HOST } from "../config/constants.js";

// ── Utilities ─────────────────────────────────────────────────────────────────

export function getMimeType(ext) {
  return MIME_MAP[ext] ?? "application/octet-stream";
}

export function safeFilename(title = "video") {
  return title.replace(/[/\\?%*:|"<>]/g, "-");
}

function parseYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v");
  } catch { return null; }
}

// ── Quality → height map ──────────────────────────────────────────────────────

const QUALITY_HEIGHT = {
  "1080p": 1080,
  "720p":  720,
  "480p":  480,
  "360p":  360,
  "best":  720,   // default to 720p for "best"
};

// ── API call ──────────────────────────────────────────────────────────────────

async function fetchFromAPI(videoId) {
  const res = await fetch(
    `https://${RAPIDAPI_HOST}/videos?part=all&id=${videoId}`,
    {
      method: "GET",
      headers: {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    }
  );
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  return res.json();
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Fetches video metadata.
 */
export async function fetchVideoInfo(url) {
  const videoId = parseYouTubeId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const data = await fetchFromAPI(videoId);

  // Pick best thumbnail
  const thumbnails = data.thumbnail || [];
  const thumb = thumbnails[thumbnails.length - 1]?.url
    ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    title:      data.title,
    uploader:   data.channelTitle,
    duration:   parseInt(data.lengthSeconds, 10),
    view_count: parseInt(data.viewCount, 10),
    thumbnail:  thumb,
    id:         videoId,
  };
}

/**
 * Downloads video by streaming the direct URL to a temp file.
 */
export async function downloadVideo(url, quality = "best") {
  const videoId = parseYouTubeId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const isAudio = quality === "audio only";
  const data    = await fetchFromAPI(videoId);

  let downloadUrl = null;
  let ext         = "mp4";

  if (isAudio) {
    // Pick best audio-only format — itag 140 is m4a medium quality
    const audioFormats = (data.adaptiveFormats || [])
      .filter((f) => f.mimeType?.startsWith("audio/mp4"))
      .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

    const best = audioFormats[0];
    if (!best) throw new Error("No audio format found");
    downloadUrl = best.url;
    ext         = "m4a";

  } else {
    const targetHeight = QUALITY_HEIGHT[quality] ?? 720;

    // First try: combined video+audio from formats[] (itag 18 = 360p, 22 = 720p)
    const combined = (data.formats || [])
      .filter((f) => f.mimeType?.startsWith("video/mp4") && f.height)
      .sort((a, b) => Math.abs(a.height - targetHeight) - Math.abs(b.height - targetHeight));

    if (combined.length > 0) {
      downloadUrl = combined[0].url;
      ext         = "mp4";
    } else {
      // Fallback: best adaptive video format closest to target height
      const adaptive = (data.adaptiveFormats || [])
        .filter((f) => f.mimeType?.startsWith("video/mp4") && f.height)
        .sort((a, b) => Math.abs(a.height - targetHeight) - Math.abs(b.height - targetHeight));

      if (!adaptive[0]) throw new Error("No video format found");
      downloadUrl = adaptive[0].url;
      ext         = "mp4";
    }
  }

  if (!downloadUrl) throw new Error("Could not find a download URL");

  // Stream file to temp directory
  const tmpDir   = os.tmpdir();
  const filePath = path.join(tmpDir, `${FILE_PREFIX}${videoId}_${Date.now()}.${ext}`);

  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) throw new Error("Failed to fetch video file from YouTube");

  await new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(filePath);
    fileRes.body.pipe(dest);
    dest.on("finish", resolve);
    dest.on("error",  reject);
  });

  return { filePath, ext, title: data.title || "video", id: videoId };
}