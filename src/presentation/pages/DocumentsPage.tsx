import { useEffect, useState } from "react";
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
        <div className="filter-pills">
          <button
            className={typeFilter === "" ? "filter-pill filter-pill--active" : "filter-pill"}
            onClick={() => handleTypeFilter("")}
          >Todos</button>
          {TYPES.map((t) => (
            <button
              key={t}
              className={typeFilter === t ? "filter-pill filter-pill--active" : "filter-pill"}
              style={{ color: TYPE_COLORS[t] }}
              onClick={() => handleTypeFilter(t)}
            >{DOCUMENT_TYPE_LABELS[t]}</button>
          ))}
        </div>

        {loading && <p className="muted">Carregando...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && docs.length === 0 && (
          <p className="muted">Nenhum documento publicado.</p>
        )}

        <div className="doc-list">
          {docs.map((d) => (
            <div key={d.id} className="doc-card">
              <div className="doc-card__top">
                <span className="badge" style={{ color: TYPE_COLORS[d.type], textTransform: "uppercase", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em" }}>
                  {DOCUMENT_TYPE_LABELS[d.type]}
                </span>
                <span className="doc-card__date">{formatDate(d.published_at ?? d.created_at)}</span>
              </div>
              <h3 className="doc-card__title">{d.title}</h3>
              {d.description && <p className="doc-card__desc">{d.description}</p>}
              <div className="doc-card__actions">
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="doc-card__btn">
                    📄 Baixar arquivo
                  </a>
                )}
                {d.external_url && (
                  <a href={d.external_url} target="_blank" rel="noopener noreferrer" className="doc-card__btn doc-card__btn--external">
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

// (styles migrados para src/styles/pages.css)
