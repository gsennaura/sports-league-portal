import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ListDocuments } from "@application/use_cases/ListDocuments";
import type { DeleteDocument } from "@application/use_cases/DeleteDocument";
import type { Document } from "@domain/entities/Document";
import { DOCUMENT_TYPE_LABELS } from "@domain/entities/Document";

interface Props {
  listDocuments: ListDocuments;
  deleteDocument: DeleteDocument;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const TYPE_COLORS: Record<string, string> = {
  DOCUMENTO: "#89b4fa",
  EDITAL_CONVOCACAO: "#f9e2af",
  RESULTADO_JULGAMENTO: "#f38ba8",
};

export function AdminDocumentsPage({ listDocuments, deleteDocument }: Props) {
  const [items, setItems] = useState<Document[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments.execute(undefined, undefined, true)
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [listDocuments]);

  const filtered = items.filter((d) =>
    d.title.toLowerCase().includes(filter.toLowerCase())
  );

  async function handleDelete(d: Document) {
    if (!confirm(`Excluir "${d.title}"?`)) return;
    try {
      await deleteDocument.execute(d.id);
      setItems((prev) => prev.filter((x) => x.id !== d.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Documentos / TJDU</h1>
          <Link to="/admin/documentos/novo" style={S.btnNew}>+ Novo documento</Link>
        </div>
      </header>
      <main style={S.page}>
        <input
          type="text"
          placeholder="Filtrar por título..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={S.searchInput}
        />

        {loading && <p style={S.muted}>Carregando...</p>}
        {error && <p style={S.error}>{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p style={S.muted}>Nenhum documento encontrado.</p>
        )}

        <div style={S.list}>
          {filtered.map((d) => (
            <div key={d.id} style={{ ...S.row, opacity: d.is_published ? 1 : 0.6 }}>
              <div style={S.rowBody}>
                <div style={S.rowTop}>
                  <span style={{ ...S.typeBadge, color: TYPE_COLORS[d.type] ?? "#cdd6f4" }}>
                    {DOCUMENT_TYPE_LABELS[d.type] ?? d.type}
                  </span>
                  {d.is_published ? (
                    <span style={S.badgePublished}>Publicado</span>
                  ) : (
                    <span style={S.badgeDraft}>Rascunho</span>
                  )}
                  <span style={S.rowDate}>{formatDate(d.published_at ?? d.created_at)}</span>
                </div>
                <span style={S.rowTitle}>{d.title}</span>
                {d.description && <span style={S.rowDesc}>{d.description}</span>}
                <div style={S.rowLinks}>
                  {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={S.fileLink}>📄 Arquivo</a>}
                  {d.external_url && <a href={d.external_url} target="_blank" rel="noopener noreferrer" style={S.fileLink}>🔗 Link externo</a>}
                </div>
              </div>
              <div style={S.rowActions}>
                <Link to={`/admin/documentos/${d.id}/editar`} style={S.btnEdit}>Editar</Link>
                <button style={S.btnDelete} onClick={() => handleDelete(d)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { background: "#1e1e2e", borderBottom: "1px solid #313244" },
  heroAccent: { height: "4px", background: "linear-gradient(90deg,#89dceb,#89b4fa)" },
  heroInner: { maxWidth: 1100, margin: "0 auto", padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#cdd6f4" },
  btnNew: { padding: "0.55rem 1.2rem", borderRadius: "8px", background: "#89b4fa", color: "#1e1e2e", fontWeight: 700, textDecoration: "none", fontSize: "0.85rem" },
  page: { maxWidth: 1100, margin: "0 auto", padding: "2rem" },
  searchInput: { width: "100%", padding: "0.65rem 1rem", borderRadius: "8px", border: "1px solid #45475a", background: "#1e1e2e", color: "#cdd6f4", fontSize: "0.9rem", marginBottom: "1.5rem", boxSizing: "border-box" },
  muted: { color: "#6c7086", fontSize: "0.9rem" },
  error: { color: "#f38ba8", fontSize: "0.9rem" },
  list: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  row: { display: "flex", alignItems: "flex-start", gap: "1rem", background: "#1e1e2e", border: "1px solid #313244", borderRadius: "10px", padding: "1rem 1.25rem" },
  rowBody: { flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem", minWidth: 0 },
  rowTop: { display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" },
  typeBadge: { fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  badgePublished: { background: "#1a3a1f", color: "#a6e3a1", border: "1px solid #2a5a2f", borderRadius: 4, padding: "0 0.35rem", fontSize: "0.68rem", fontWeight: 700 },
  badgeDraft: { background: "#2a2a1a", color: "#f9e2af", border: "1px solid #4a3a1a", borderRadius: 4, padding: "0 0.35rem", fontSize: "0.68rem", fontWeight: 700 },
  rowDate: { fontSize: "0.72rem", color: "#6c7086" },
  rowTitle: { fontWeight: 700, color: "#cdd6f4", fontSize: "0.95rem" },
  rowDesc: { fontSize: "0.78rem", color: "#a6adc8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowLinks: { display: "flex", gap: "0.75rem", marginTop: "0.1rem" },
  fileLink: { fontSize: "0.75rem", color: "#89b4fa", textDecoration: "none" },
  rowActions: { display: "flex", gap: "0.5rem", flexShrink: 0 },
  btnEdit: { padding: "0.4rem 0.9rem", borderRadius: "6px", background: "#313244", color: "#cdd6f4", textDecoration: "none", fontSize: "0.78rem", fontWeight: 600 },
  btnDelete: { padding: "0.4rem 0.9rem", borderRadius: "6px", background: "transparent", border: "1px solid #f38ba8", color: "#f38ba8", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
};
