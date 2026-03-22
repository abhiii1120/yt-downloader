/**
 * routes/video.routes.js — Video-related route definitions
 *
 * POST /info      → fetch video metadata
 * POST /download  → download and stream the video file
 */
import { Router } from "express";
import {
  getVideoInfo,
  downloadVideoFile,
} from "../controllers/video.controller.js";

const router = Router();

router.post("/info", getVideoInfo);
router.post("/download", downloadVideoFile);
router.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

export default router;
