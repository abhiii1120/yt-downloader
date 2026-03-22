import "./ErrorBox.css";

/**
 * ErrorBox
 * Displays an error message with a retry button.
 */
export default function ErrorBox({ message, onRetry }) {
  return (
    <div className="error-box" role="alert">
      <div className="error-icon">⚠</div>
      <div className="error-body">
        <p className="error-msg">{message || "Something went wrong."}</p>
        {onRetry && (
          <button className="error-retry" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}