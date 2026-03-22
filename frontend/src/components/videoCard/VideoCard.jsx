import { formatDuration, formatViews } from "../../App";
import "./VideoCard.css";

/**
 * VideoCard
 * Shows the video thumbnail, title, channel, duration and view count.
 */
export default function VideoCard({ info, thumbUrl }) {
  return (
    <div className="video-card">
      {thumbUrl && (
        <div className="video-thumb-wrap">
          <img src={thumbUrl} alt="Video thumbnail" className="video-thumb" />
          <div className="video-thumb-overlay">
            <span className="play-icon">▶</span>
          </div>
          {info?.duration && (
            <span className="video-duration">{formatDuration(info.duration)}</span>
          )}
        </div>
      )}

      <div className="video-meta">
        {info ? (
          <>
            <p className="video-title">{info.title}</p>
            <div className="video-badges">
              {info.uploader && (
                <span className="badge badge-channel">
                  <span className="badge-dot" />
                  {info.uploader}
                </span>
              )}
              {info.view_count && (
                <span className="badge">
                  {formatViews(info.view_count)} views
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="video-skeleton">
            <div className="skeleton-line w-full" />
            <div className="skeleton-line w-2-3" />
            <div className="skeleton-badges">
              <div className="skeleton-badge" />
              <div className="skeleton-badge" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}