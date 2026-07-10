import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { UpdateDocument } from "@application/use_cases/UpdateDocument";
import type { DeleteDocument } from "@application/use_cases/DeleteDocument";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import type { DocumentRepository } from "@domain/repositories/DocumentRepository";
import type { DocumentType } from "@domain/entities/Document";
import { DOCUMENT_TYPE_LABELS } from "@domain/entities/Document";
import type { League } from "@domain/entities/League";

interface Props {
  updateDocument: UpdateDocument;
  deleteDocument: DeleteDocument;
  listLeagues: ListLeagues;
  documentRepository: DocumentRepository;
}

const TYPES: DocumentType[] = ["DOCUMENTO", "EDITAL_CONVOCACAO", "RESULTADO_JULGAMENTO"];

export function AdminDocumentEditPage({ updateDocument, deleteDocument, listLeagues, documentRepository }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("DOCUMENTO");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [leagueId, setLeagueId] = useState<string>("");
  const [isPublished, setIsPublished] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([documentRepository.adminGetById(id), listLeagues.execute()])
      .then(([doc, ls]) => {
        setTitle(doc.title);
        setType(doc.type);
        setDescription(doc.description ?? "");
        setExternalUrl(doc.external_url ?? "");
        setLeagueId(doc.league_id ?? "");
        setIsPublished(doc.is_published);
        setCurrentFileUrl(doc.file_url);
        setLeagues(ls);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [id, documentRepository, listLeagues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !title.trim()) { setError("Título é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await updateDocument.execute({
        id,
        title: title.trim(),
        type,
        description: description.trim() || null,
        file_url: currentFileUrl,
        external_url: externalUrl.trim() || null,
        league_id: leagueId || null,
        is_published: isPublished,
      });
      if (docFile) {
        await documentRepository.uploadFile(id, docFile);
      }
      navigate("/admin/documentos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm("Excluir este documento?")) return;
    try {
      await deleteDocument.execute(id);
      navigate("/admin/documentos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  if (loading) return <main style={S.page}><p style={S.muted}>Carregando...</p></main>;

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Editar Documento</h1>
          <button style={S.btnDanger} onClick={handleDelete}>Excluir</button>
        </div>
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
            Descrição
            <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label style={S.label}>
            Liga
            <select style={S.input} value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
              <option value="">— Geral —</option>
              {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>

          <label style={S.label}>
            Link externo
            <input style={S.input} type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://..." />
          </label>

          <label style={S.label}>
            Arquivo <span style={S.hint}>(substituir arquivo existente)</span>
            {currentFileUrl && !docFile && (
              <a href={currentFileUrl} target="_blank" rel="noopener noreferrer" style={S.currentFile}>📄 Ver arquivo atual</a>
            )}
            <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} style={{ color: "#cdd6f4" }} />
          </label>

          <label style={S.checkLabel}>
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Publicado
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
  heroInner: { maxWidth: 800, margin: "0 auto", padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#cdd6f4" },
  btnDanger: { padding: "0.5rem 1.1rem", borderRadius: "8px", background: "transparent", border: "1px solid #f38ba8", color: "#f38ba8", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  page: { maxWidth: 800, margin: "0 auto", padding: "2rem" },
  muted: { color: "#6c7086" },
  form: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  error: { color: "#f38ba8", background: "#2a1a1a", border: "1px solid #f38ba8", borderRadius: 8, padding: "0.75rem 1rem", margin: 0 },
  label: { display: "flex", flexDirection: "column", gap: "0.4rem", color: "#cdd6f4", fontSize: "0.85rem", fontWeight: 600 },
  hint: { fontWeight: 400, color: "#6c7086", fontSize: "0.78rem" },
  input: { padding: "0.6rem 0.9rem", borderRadius: "8px", border: "1px solid #45475a", background: "#181825", color: "#cdd6f4", fontSize: "0.9rem" },
  currentFile: { fontSize: "0.78rem", color: "#89b4fa", textDecoration: "none" },
  checkLabel: { display: "flex", alignItems: "center", gap: "0.5rem", color: "#cdd6f4", fontSize: "0.88rem", cursor: "pointer" },
  actions: { display: "flex", gap: "0.75rem", marginTop: "0.5rem" },
  btnSave: { padding: "0.65rem 1.5rem", borderRadius: "8px", background: "#89b4fa", color: "#1e1e2e", fontWeight: 700, border: "none", cursor: "pointer", fontSize: "0.9rem" },
  btnCancel: { padding: "0.65rem 1.5rem", borderRadius: "8px", background: "transparent", border: "1px solid #45475a", color: "#cdd6f4", cursor: "pointer", fontSize: "0.9rem" },
};
