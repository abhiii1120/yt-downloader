/**
 * services/ytdlp.service.js — YouTube download service
 * Uses YT-API (RapidAPI) instead of local yt-dlp.
 */
import path from "path";
import fs from "fs";
import os from "os";
import {
  MIME_MAP,
  FILE_PREFIX,
  RAPIDAPI_KEY,
  RAPIDAPI_HOST,
} from "../config/constants.js";

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
    if (u.hostname.includes("youtu.be"))
      return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

// ── Quality → height map ──────────────────────────────────────────────────────

const QUALITY_HEIGHT = {
  "1080p": 1080,
  "720p": 720,
  "480p": 480,
  "360p": 360,
  best: 720, // default to 720p for "best"
};

// ── API call ──────────────────────────────────────────────────────────────────
async function fetchFromAPI(videoId) {
  const url = `https://${RAPIDAPI_HOST}/dl?id=${videoId}`;

  console.log("[API] Calling:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[API Error]", res.status, errText);
    throw new Error(`API request failed: ${res.status}`);
  }

  const data = await res.json();
  console.log("[API Response Keys]", Object.keys(data));
  console.log("[formats count]", data.formats?.length ?? 0);
  console.log("[adaptiveFormats count]", data.adaptiveFormats?.length ?? 0);
  return data;
}
// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Fetches video metadata.
 */
export async function fetchVideoInfo(url) {
  const videoId = parseYouTubeId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const data = await fetchFromAPI(videoId);

  return {
    title: data.title,
    uploader: data.channelTitle,
    duration: parseInt(data.lengthSeconds, 10),
    view_count: parseInt(data.viewCount, 10),
    thumbnail:
      data.thumbnail?.[data.thumbnail.length - 1]?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    id: videoId,
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

  const allFormats         = data.formats        ?? [];
  const allAdaptiveFormats = data.adaptiveFormats ?? [];

  let downloadUrl = null;
  let ext         = "mp4";

  if (isAudio) {
    const audioFormats = allAdaptiveFormats
      .filter((f) => f.mimeType?.includes("audio/mp4"))
      .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

    if (!audioFormats[0]) throw new Error("No audio format found");
    downloadUrl = audioFormats[0].url;
    ext         = "m4a";

  } else {
    const targetHeight = QUALITY_HEIGHT[quality] ?? 720;

    // Try combined formats first (video + audio in one file)
    const combinedMp4 = allFormats
      .filter((f) => f.mimeType?.includes("video/mp4") && f.url)
      .sort((a, b) =>
        Math.abs((a.height ?? 0) - targetHeight) -
        Math.abs((b.height ?? 0) - targetHeight)
      );

    if (combinedMp4[0]) {
      downloadUrl = combinedMp4[0].url;
      ext         = "mp4";
    } else {
      // Fallback to adaptive video
      const adaptiveVideo = allAdaptiveFormats
        .filter((f) => f.mimeType?.includes("video/mp4") && f.url && f.height)
        .sort((a, b) =>
          Math.abs((a.height ?? 0) - targetHeight) -
          Math.abs((b.height ?? 0) - targetHeight)
        );

      if (!adaptiveVideo[0]) throw new Error("No video format found");
      downloadUrl = adaptiveVideo[0].url;
      ext         = "mp4";
    }
  }

  if (!downloadUrl) throw new Error("Could not find download URL");

  console.log("[Downloading]", ext, downloadUrl.slice(0, 60) + "...");

  // Download to temp file
  const tmpDir   = os.tmpdir();
  const filePath = path.join(tmpDir, `${FILE_PREFIX}${videoId}_${Date.now()}.${ext}`);

  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) throw new Error(`Failed to fetch video: ${fileRes.status}`);

  // Convert Web Stream to Buffer (Node 18+ built-in fetch)
  const arrayBuffer = await fileRes.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

  console.log("[Downloaded]", filePath);

  return { filePath, ext, title: data.title || "video", id: videoId };
}
