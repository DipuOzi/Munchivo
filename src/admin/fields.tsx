import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2, X } from "lucide-react";
import { fileToImageSource } from "./imageUpload";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="adm-field">
      <span className="adm-field-label">{label}</span>
      <div className="adm-field-slot">{children}</div>
      {hint && <span className="adm-field-hint">{hint}</span>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className="adm-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        className="adm-input adm-textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await fileToImageSource(file));
    } catch {
      setError("That image could not be read. Try another file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="adm-image-field">
      <span className="adm-field-label">{label}</span>
      <div className="adm-image-row">
        <div className="adm-image-preview">
          {value ? (
            <img src={value} alt="" onError={(event) => { (event.currentTarget as HTMLImageElement).style.opacity = "0.25"; }} />
          ) : (
            <span>No image</span>
          )}
        </div>
        <div className="adm-image-actions">
          <input
            className="adm-input"
            type="text"
            value={value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("@idb:") ? "Uploaded image" : value}
            placeholder="/images/example.jpg or https://..."
            onChange={(event) => onChange(event.target.value)}
          />
          <div className="adm-image-buttons">
            <button type="button" className="adm-btn adm-btn--small" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={15} aria-hidden="true" /> {busy ? "Uploading…" : "Upload image"}
            </button>
            {value && (
              <button type="button" className="adm-btn adm-btn--small adm-btn--danger" onClick={() => onChange("")}>
                <X size={15} aria-hidden="true" /> Remove
              </button>
            )}
          </div>
          {hint && <span className="adm-field-hint">{hint}</span>}
          {error && <span className="adm-error-text">{error}</span>}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="adm-hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}

export function ListControls({
  index,
  length,
  onMove,
  onRemove,
  removeLabel,
}: {
  index: number;
  length: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="adm-list-controls">
      <button
        type="button"
        className="adm-icon-btn"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label="Move up"
      >
        <ArrowUp size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="adm-icon-btn"
        onClick={() => onMove(1)}
        disabled={index === length - 1}
        aria-label="Move down"
      >
        <ArrowDown size={15} aria-hidden="true" />
      </button>
      <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={onRemove} aria-label={removeLabel}>
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export function AdminSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="adm-section">
      <div className="adm-section-head">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="adm-section-body">{children}</div>
    </section>
  );
}

export function AdminGrid({ children }: { children: ReactNode }) {
  return <div className="adm-grid">{children}</div>;
}
