import React, { useRef, useState } from "react";

interface Props {
  currentPhotoUrl: string;
  fallbackUrl: string;
  onConfirm: (file: File) => void;
  onClose: () => void;
  uploading?: boolean;
}

export function PhotoUploadModal({ currentPhotoUrl, fallbackUrl, onConfirm, onClose, uploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function handleConfirm() {
    if (selectedFile) onConfirm(selectedFile);
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>Alterar foto</h2>

        {/* Current / preview photo */}
        <div style={S.photoWrap}>
          <img
            src={preview ?? currentPhotoUrl}
            alt="foto"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackUrl; }}
            style={S.photo}
          />
          {preview && (
            <span style={S.previewBadge}>prévia</span>
          )}
        </div>

        {/* File picker */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          style={S.btnSelect}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {selectedFile ? "Trocar arquivo…" : "Selecionar foto…"}
        </button>
        {selectedFile && (
          <p style={S.fileName}>{selectedFile.name}</p>
        )}
        <p style={S.hint}>JPG, PNG ou WebP · máx 5 MB</p>

        {/* Actions */}
        <div style={S.actions}>
          <button type="button" style={S.btnCancel} onClick={onClose} disabled={uploading}>
            Cancelar
          </button>
          <button
            type="button"
            style={{ ...S.btnConfirm, opacity: (!selectedFile || uploading) ? 0.5 : 1 }}
            onClick={handleConfirm}
            disabled={!selectedFile || uploading}
          >
            {uploading ? "Enviando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: "12px",
    padding: "2rem",
    width: "100%",
    maxWidth: "360px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  title: { fontSize: "1.1rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  photoWrap: { position: "relative", display: "inline-block" },
  photo: {
    width: "140px", height: "140px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid #313244",
    display: "block",
  },
  previewBadge: {
    position: "absolute", bottom: "4px", right: "4px",
    backgroundColor: "#cba6f7", color: "#11111b",
    fontSize: "0.65rem", fontWeight: 700, borderRadius: "4px",
    padding: "1px 5px", textTransform: "uppercase",
  },
  btnSelect: {
    backgroundColor: "#313244", border: "1px solid #45475a",
    borderRadius: "6px", color: "#cdd6f4",
    fontSize: "0.875rem", fontWeight: 500,
    padding: "0.5rem 1.1rem", cursor: "pointer",
    width: "100%",
  },
  fileName: { fontSize: "0.78rem", color: "#a6adc8", margin: 0, wordBreak: "break-all", textAlign: "center" },
  hint: { fontSize: "0.72rem", color: "#6c7086", margin: 0 },
  actions: { display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end", marginTop: "0.25rem" },
  btnCancel: {
    backgroundColor: "transparent", border: "1px solid #313244",
    borderRadius: "6px", color: "#cdd6f4",
    fontSize: "0.875rem", fontWeight: 500,
    padding: "0.5rem 1rem", cursor: "pointer",
  },
  btnConfirm: {
    backgroundColor: "#cba6f7", border: "none",
    borderRadius: "6px", color: "#11111b",
    fontSize: "0.875rem", fontWeight: 700,
    padding: "0.5rem 1.25rem", cursor: "pointer",
    transition: "opacity 0.15s",
  },
};
