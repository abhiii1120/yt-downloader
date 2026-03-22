import "./ProgressLoader.css";

/**
 * ProgressLoader
 * Animated stage tracker shown while download is in progress.
 */
export default function ProgressLoader({ stages, stageIdx, progress }) {
  const current = stages[stageIdx];

  return (
    <div className="progress-loader">

      {/* Top row: current stage label + percentage */}
      <div className="pl-header">
        <div className="pl-stage-label">
          <span className="pl-pulse" />
          <span>{current.label}…</span>
        </div>
        <span className="pl-pct">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="pl-track">
        <div className="pl-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Stage steps list */}
      <div className="pl-steps">
        {stages.map((s, i) => {
          const isDone   = i < stageIdx;
          const isActive = i === stageIdx;
          return (
            <div
              key={s.key}
              className={`pl-step ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
            >
              <div className="pl-step-icon">
                {isDone   ? <span className="check">✓</span>
                  : isActive ? <span className="mini-spin" />
                  : <span className="dot" />}
              </div>
              <span className="pl-step-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      <p className="pl-hint">⚡ Parallel fragment downloading enabled</p>
    </div>
  );
}