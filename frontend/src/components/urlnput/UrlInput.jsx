import "./UrlInput.css";


export default function UrlInput({
  url, onChange, onFetch, onReset,
  isFetching, isDisabled, hasInfo,
}) {
  return (
    <div className="url-input-wrap">
      <div className="url-field-row">
        <div className="url-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>

        <input
          className="url-input"
          type="text"
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onFetch()}
          disabled={isDisabled}
          spellCheck={false}
          autoComplete="off"
        />

        {url && !isDisabled && (
          <button className="url-clear" onClick={() => onChange("")} title="Clear">
            ✕
          </button>
        )}
      </div>

      <div className="url-actions">
        <button
          className="btn btn-primary url-btn-fetch"
          onClick={onFetch}
          disabled={!url.trim() || isFetching || isDisabled}
        >
          {isFetching ? <><span className="spinner" /> Fetching…</> : "Fetch Info"}
        </button>

        {hasInfo && !isDisabled && (
          <button className="btn btn-ghost" onClick={onReset}>
            ↺ New Video
          </button>
        )}
      </div>
    </div>
  );
}