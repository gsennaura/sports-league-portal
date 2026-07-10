import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CreateDocument } from "@application/use_cases/CreateDocument";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import type { DocumentRepository } from "@domain/repositories/DocumentRepository";
import type { DocumentType } from "@domain/entities/Document";
import { DOCUMENT_TYPE_LABELS } from "@domain/entities/Document";
import type { League } from "@domain/entities/League";

interface Props {
  createDocument: CreateDocument;
  listLeagues: ListLeagues;
  documentRepository: DocumentRepository;
}

const TYPES: DocumentType[] = ["DOCUMENTO", "EDITAL_CONVOCACAO", "RESULTADO_JULGAMENTO"];

export function AdminDocumentCreatePage({ createDocument, listLeagues, documentRepository }: Props) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("DOCUMENTO");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [leagueId, setLeagueId] = useState<string>("");
  const [isPublished, setIsPublished] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listLeagues.execute().then(setLeagues).catch(() => null);
  }, [listLeagues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Título é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const doc = await createDocument.execute({
        title: title.trim(),
        type,
        description: description.trim() || null,
        file_url: null,
        external_url: externalUrl.trim() || null,
        league_id: leagueId || null,
        is_published: isPublished,
      });
      if (docFile) {
        await documentRepository.uploadFile(doc.id, docFile);
      }
      navigate("/admin/documentos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar documento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}><h1 style={S.title}>Novo Documento</h1></div>
      </header>
      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form}>
          {error && <p style={S.error}>{error}</p>}

          <label style={S.label}>
            Título *
            <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label style={S.label}>
            Tipo
            <select style={S.input} value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
              {TYPES.map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>)}
            </select>
          </label>

          <label style={S.label}>
            Descrição <span style={S.hint}>(opcional)</span>
            <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label style={S.label}>
            Liga <span style={S.hint}>(deixe em branco para documento geral)</span>
            <select style={S.input} value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
              <option value="">— Geral —</option>
              {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>

          <label style={S.label}>
            Link externo <span style={S.hint}>(URL externa, opcional)</span>
            <input style={S.input} type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://..." />
          </label>

          <label style={S.label}>
            Arquivo <span style={S.hint}>(PDF, imagem — enviado ao CDN)</span>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} style={{ color: "#cdd6f4" }} />
          </label>

          <label style={S.checkLabel}>
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Publicar agora
          </label>

          <div style={S.actions}>
            <button type="submit" style={S.btnSave} disabled={submitting}>{submitting ? "Salvando..." : "Salvar"}</button>
            <button type="button" style={S.btnCancel} onClick={() => navigate("/admin/documentos")}>Cancelar</button>
          </div>
        </form>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { background: "#1e1e2e", borderBottom: "1px solid #313244" },
  heroAccent: { height: "4px", background: "linear-gradient(90deg,#89dceb,#89b4fa)" },
  heroInner: { maxWidth: 800, margin: "0 auto", padding: "1.5rem 2rem" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#cdd6f4" },
  page: { maxWidth: 800, margin: "0 auto", padding: "2rem" },
  form: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  error: { color: "#f38ba8", background: "#2a1a1a", border: "1px solid #f38ba8", borderRadius: 8, padding: "0.75rem 1rem", margin: 0 },
  label: { display: "flex", flexDirection: "column", gap: "0.4rem", color: "#cdd6f4", fontSize: "0.85rem", fontWeight: 600 },
  hint: { fontWeight: 400, color: "#6c7086", fontSize: "0.78rem" },
  input: { padding: "0.6rem 0.9rem", borderRadius: "8px", border: "1px solid #45475a", background: "#181825", color: "#cdd6f4", fontSize: "0.9rem" },
  checkLabel: { display: "flex", alignItems: "center", gap: "0.5rem", color: "#cdd6f4", fontSize: "0.88rem", cursor: "pointer" },
  actions: { display: "flex", gap: "0.75rem", marginTop: "0.5rem" },
  btnSave: { padding: "0.65rem 1.5rem", borderRadius: "8px", background: "#89b4fa", color: "#1e1e2e", fontWeight: 700, border: "none", cursor: "pointer", fontSize: "0.9rem" },
  btnCancel: { padding: "0.65rem 1.5rem", borderRadius: "8px", background: "transparent", border: "1px solid #45475a", color: "#cdd6f4", cursor: "pointer", fontSize: "0.9rem" },
};
