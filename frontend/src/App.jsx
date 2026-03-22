import { useState, useEffect, useRef } from "react";
import UrlInput from "./components/urlnput/UrlInput";
import VideoCard from "./components/videoCard/VideoCard";
import QualityPicker from "./components/qualityPicker/QualityPicker";
import ProgressLoader from "./components/progressLoader/ProgressLoader";
import DownloadBtn from "./components/downloadButton/DownloadBtn";
import ErrorBox from "./components/errorBox/ErrorBox";
import "./App.css";

// ─── Constants ───────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL;

export const QUALITIES = [
  { id: "best", label: "Best", tag: "AUTO" },
  { id: "1080p", label: "1080p", tag: "FHD" },
  { id: "720p", label: "720p", tag: "HD" },
  { id: "480p", label: "480p", tag: "SD" },
  { id: "360p", label: "360p", tag: "LOW" },
  { id: "audio only", label: "Audio", tag: "MP3" },
];

export const STAGES = [
  { key: "connecting", label: "Connecting to YouTube", pct: 10 },
  { key: "extracting", label: "Extracting stream info", pct: 28 },
  { key: "downloading", label: "Downloading video", pct: 72 },
  { key: "processing", label: "Processing & merging", pct: 90 },
  { key: "saving", label: "Saving to your device", pct: 100 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function parseYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

export function formatDuration(secs) {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatViews(n) {
  if (!n) return null;
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("best");
  const [status, setStatus] = useState("idle");
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const timerRef = useRef(null);

  const videoId = parseYouTubeId(url);
  const thumbUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;
  const isDownloading = status === "downloading";

  // Stage animation
  function startStages() {
    setStageIdx(0);
    setProgress(STAGES[0].pct);
    let i = 0;
    const delays = [700, 1400, 4500, 2800];
    const tick = () => {
      i++;
      if (i < STAGES.length - 1) {
        setStageIdx(i);
        setProgress(STAGES[i].pct);
        timerRef.current = setTimeout(tick, delays[i] ?? 2000);
      }
    };
    timerRef.current = setTimeout(tick, delays[0]);
  }

  function finishStages() {
    clearTimeout(timerRef.current);
    setStageIdx(STAGES.length - 1);
    setProgress(100);
  }

  function resetStages() {
    clearTimeout(timerRef.current);
    setStageIdx(0);
    setProgress(0);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function handleFetch() {
    if (!url.trim()) return;
    setStatus("fetching");
    setError("");
    setInfo(null);
    try {
      const res = await fetch(`${API}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch video info");
      setInfo(data);
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  async function handleDownload() {
    setStatus("downloading");
    resetStages();
    startStages();
    try {
      const res = await fetch(`${API}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, quality }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Download failed");
      }
      finishStages();
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const ext = quality === "audio only" ? "mp3" : "mp4";
      const filename = `${info?.title || "video"}.${ext}`.replace(
        /[/\\?%*:|"<>]/g,
        "-",
      );
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(dlUrl);
      setStatus("done");
      setTimeout(() => {
        setStatus("ready");
        resetStages();
      }, 2500);
    } catch (e) {
      resetStages();
      setError(e.message);
      setStatus("error");
    }
  }

  function handleReset() {
    setUrl("");
    setInfo(null);
    setError("");
    setStatus("idle");
    resetStages();
  }

  return (
    <div className="app">
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />
      <div className="bg-orb orb-3" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <header className="site-header">
        <div className="logo">
          <div className="logo-mark">
            <span className="logo-arrow">↓</span>
          </div>
          <div className="logo-text-wrap">
            <span className="logo-name">YTGET</span>
            <span className="logo-sub">Video Downloader</span>
          </div>
        </div>
        <div className="header-badge">v2.0</div>
      </header>

      <section className="hero">
        <h1 className="hero-title">
          Download Any
          <br />
          <span className="hero-accent">YouTube Video</span>
        </h1>
        <p className="hero-desc">
          Paste a link · Pick your quality · Get your file
        </p>
      </section>

      <main className="main-card">
        <div className="step-block">
          <div className="step-label-row">
            <span className="step-num">01</span>
            <span className="step-title">Paste YouTube URL</span>
          </div>
          <UrlInput
            url={url}
            onChange={(val) => {
              setUrl(val);
              setStatus("idle");
              setInfo(null);
              setError("");
            }}
            onFetch={handleFetch}
            onReset={handleReset}
            isFetching={status === "fetching"}
            isDisabled={isDownloading}
            hasInfo={!!info}
          />
        </div>

        {(thumbUrl || info) && (
          <div className="step-block animate-in">
            <div className="step-label-row">
              <span className="step-num">02</span>
              <span className="step-title">Video Details</span>
            </div>
            <VideoCard info={info} thumbUrl={thumbUrl} />
          </div>
        )}

        {(status === "ready" || isDownloading || status === "done") && (
          <div className="step-block animate-in">
            <div className="step-label-row">
              <span className="step-num">03</span>
              <span className="step-title">Choose Quality & Download</span>
            </div>
            <QualityPicker
              quality={quality}
              onChange={setQuality}
              disabled={isDownloading}
            />

            {isDownloading ? (
              <ProgressLoader
                stages={STAGES}
                stageIdx={stageIdx}
                progress={progress}
              />
            ) : status === "done" ? (
              <div className="done-box">
                <span className="done-icon">✓</span>
                <span>Download complete! Check your downloads folder.</span>
              </div>
            ) : (
              <DownloadBtn quality={quality} onClick={handleDownload} />
            )}
          </div>
        )}

        {status === "error" && (
          <ErrorBox
            message={error}
            onRetry={() => setStatus(info ? "ready" : "idle")}
          />
        )}
      </main>

      <footer className="site-footer">
        <p className="footer-tech">Built with Vite + React + yt-dlp</p>
      </footer>
    </div>
  );
}
