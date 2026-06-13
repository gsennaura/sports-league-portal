import React, { useEffect, useState } from "react";
import type { ListDocuments } from "@application/use_cases/ListDocuments";
import type { Document, DocumentType } from "@domain/entities/Document";
import { DOCUMENT_TYPE_LABELS } from "@domain/entities/Document";

interface Props {
  listDocuments: ListDocuments;
  leagueId?: string;
}

const TYPES: DocumentType[] = ["DOCUMENTO", "EDITAL_CONVOCACAO", "RESULTADO_JULGAMENTO"];

const TYPE_COLORS: Record<DocumentType, string> = {
  DOCUMENTO: "#89b4fa",
  EDITAL_CONVOCACAO: "#f9e2af",
  RESULTADO_JULGAMENTO: "#f38ba8",
};

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function DocumentsPage({ listDocuments, leagueId }: Props) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments.execute(leagueId, typeFilter || undefined)
      .then(setDocs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [listDocuments, leagueId, typeFilter]);

  const handleTypeFilter = (t: string) => {
    setLoading(true);
    setError(null);
    setTypeFilter(t);
  };

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner"><h1 className="page-title">Documentos / TJDU</h1></div>
      </header>
      <main className="page-container">
        {/* Tipo filters */}
        <div style={S.filters}>
          <button
            style={{ ...S.filterBtn, ...(typeFilter === "" ? S.filterBtnActive : {}) }}
            onClick={() => handleTypeFilter("")}
          >Todos</button>
          {TYPES.map((t) => (
            <button
              key={t}
              style={{ ...S.filterBtn, ...(typeFilter === t ? S.filterBtnActive : {}), color: TYPE_COLORS[t] }}
              onClick={() => handleTypeFilter(t)}
            >{DOCUMENT_TYPE_LABELS[t]}</button>
          ))}
        </div>

        {loading && <p className="muted">Carregando...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && docs.length === 0 && (
          <p className="muted">Nenhum documento publicado.</p>
        )}

        <div style={S.list}>
          {docs.map((d) => (
            <div key={d.id} style={S.card}>
              <div style={S.cardTop}>
                <span style={{ ...S.typeBadge, color: TYPE_COLORS[d.type] }}>
                  {DOCUMENT_TYPE_LABELS[d.type]}
                </span>
                <span style={S.date}>{formatDate(d.published_at ?? d.created_at)}</span>
              </div>
              <h3 style={S.cardTitle}>{d.title}</h3>
              {d.description && <p style={S.cardDesc}>{d.description}</p>}
              <div style={S.cardActions}>
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={S.btnFile}>
                    📄 Baixar arquivo
                  </a>
                )}
                {d.external_url && (
                  <a href={d.external_url} target="_blank" rel="noopener noreferrer" style={S.btnExternal}>
                    🔗 Acessar link
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  filters: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.75rem" },
  filterBtn: { padding: "0.45rem 1rem", borderRadius: "20px", border: "1px solid #45475a", background: "#18265b", color: "#ffffff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 },
  filterBtnActive: { background: "#313244", borderColor: "#89b4fa", color: "#cdd6f4" },
  list: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  card: { background: "#18265b", border: "1px solid #313244", borderRadius: 10, padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" },
  cardTop: { display: "flex", alignItems: "center", gap: "0.75rem" },
  typeBadge: { fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  date: { fontSize: "0.72rem", color: "#ffffff" },
  cardTitle: { margin: 0, fontSize: "1rem", fontWeight: 700, color: "#cdd6f4" },
  cardDesc: { margin: 0, fontSize: "0.82rem", color: "#ffffff", lineHeight: 1.45 },
  cardActions: { display: "flex", gap: "0.75rem", marginTop: "0.25rem", flexWrap: "wrap" },
  btnFile: { padding: "0.45rem 1rem", borderRadius: "8px", background: "#313244", color: "#cdd6f4", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 },
  btnExternal: { padding: "0.45rem 1rem", borderRadius: "8px", background: "transparent", border: "1px solid #45475a", color: "#89b4fa", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 },
};
