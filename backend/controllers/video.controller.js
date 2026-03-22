/**
 * controllers/video.controller.js — Request / response handlers
 *
 * Controllers are intentionally thin:
 *   - validate input
 *   - call the service layer
 *   - send the response (or forward error to errorHandler)
 */
import fs from "fs";
import {
  fetchVideoInfo,
  downloadVideo,
  getMimeType,
  safeFilename,
} from "../services/ytdlp.service.js";

/**
 * POST /info
 * Returns metadata for a given YouTube URL.
 *
 * Body: { url: string }
 * Response: { title, uploader, duration, view_count, thumbnail, id }
 */
export async function getVideoInfo(req, res, next) {
  const { url } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({ error: "url is required." });
  }

  try {
    const info = await fetchVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error("[getVideoInfo]", err.message);
    next(new Error("Could not fetch video info. Please check the URL."));
  }
}

/**
 * POST /download
 * Downloads the video via yt-dlp, streams it to the client,
 * then removes the temp file.
 *
 * Body: { url: string, quality?: string }
 */
export async function downloadVideoFile(req, res, next) {
  const { url, quality = "best" } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({ error: "url is required." });
  }

  try {
    // Fetch info once and pass it to downloadVideo
    const info                    = await fetchVideoInfo(url);
    const { filePath, ext, title } = await downloadVideo(url, quality, info);

    const mimeType = getMimeType(ext);
    const filename = `${safeFilename(title)}.${ext}`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", mimeType);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on("close", () => {
      fs.unlink(filePath, (err) => {
        if (err) console.warn("[cleanup] Failed to delete temp file:", filePath);
      });
    });
  } catch (err) {
    console.error("[downloadVideoFile]", err.message);
    next(new Error(err.message || "Download failed."));
  }
}