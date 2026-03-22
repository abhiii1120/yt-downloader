import { QUALITIES } from "../../App";
import "./DownloadBtn.css";

/**
 * DownloadBtn
 * Large download CTA button with format label derived from selected quality.
 */
export default function DownloadBtn({ quality, onClick }) {
  const isAudio  = quality === "audio only";
  const format   = isAudio ? "MP3" : "MP4";
  const selected = QUALITIES.find((q) => q.id === quality);

  return (
    <button className="download-btn" onClick={onClick}>
      <div className="dl-btn-inner">
        <span className="dl-icon">↓</span>
        <div className="dl-text">
          <span className="dl-label">Download {format}</span>
          <span className="dl-sub">{selected?.label} · {selected?.tag}</span>
        </div>
      </div>
      <div className="dl-shimmer" aria-hidden="true" />
    </button>
  );
}