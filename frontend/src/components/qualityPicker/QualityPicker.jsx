import { QUALITIES } from "../../App";
import "./QualityPicker.css";


export default function QualityPicker({ quality, onChange, disabled }) {
  return (
    <div className="quality-grid">
      {QUALITIES.map((q) => (
        <button
          key={q.id}
          className={`quality-btn ${quality === q.id ? "active" : ""}`}
          onClick={() => !disabled && onChange(q.id)}
          disabled={disabled}
          aria-pressed={quality === q.id}
        >
          <span className="q-label">{q.label}</span>
          <span className="q-tag">{q.tag}</span>
        </button>
      ))}
    </div>
  );
}