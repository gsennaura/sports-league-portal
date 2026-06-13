import { useEffect, useState } from "react";
import type { ListEmendas } from "@application/use_cases/ListEmendas";
import type { Emenda, EmendaRefType } from "@domain/entities/Emenda";
import { EMENDA_REF_TYPE_LABELS } from "@domain/entities/Emenda";

interface Props {
  listEmendas: ListEmendas;
  leagueId?: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

const REF_COLORS: Record<EmendaRefType, string> = {
  LINK_EXTERNO: "#89b4fa",
  DOCUMENTO_ANEXADO: "#a6e3a1",
};

export function EmendasPage({ listEmendas, leagueId }: Props) {
  const [emendas, setEmendas] = useState<Emenda[]>([]);
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listEmendas.execute(leagueId, yearFilter || undefined)
      .then(setEmendas)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [listEmendas, leagueId, yearFilter]);

  // Group by year for display
  const byYear = emendas.reduce<Record<number, Emenda[]>>((acc, e) => {
    (acc[e.year] ??= []).push(e);
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner"><h1 className="page-title">Emendas / Regulamento</h1></div>
      </header>
      <main className="page-container">
        {/* Year filter */}
        <div className="filter-pills">
          <button
            className={yearFilter === "" ? "filter-pill filter-pill--active" : "filter-pill"}
            onClick={() => setYearFilter("")}
          >Todos os anos</button>
          {YEAR_RANGE.map((y) => (
            <button
              key={y}
              className={yearFilter === y ? "filter-pill filter-pill--active" : "filter-pill"}
              onClick={() => setYearFilter(y)}
            >{y}</button>
          ))}
        </div>

        {loading && <p className="muted">Carregando...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && emendas.length === 0 && (
          <p className="muted">Nenhuma emenda publicada.</p>
        )}

        {years.map((y) => (
          <div key={y} className="year-group">
            <h2 className="year-group__heading">{y}</h2>
            <div className="doc-list">
              {byYear[y].map((e) => (
                <div key={e.id} className="doc-card">
                  <div className="doc-card__top">
                    <span className="badge" style={{ color: REF_COLORS[e.ref_type], textTransform: "uppercase", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em" }}>
                      {EMENDA_REF_TYPE_LABELS[e.ref_type]}
                    </span>
                  </div>
                  <h3 className="doc-card__title">{e.title}</h3>
                  {e.description && <p className="doc-card__desc">{e.description}</p>}
                  <div className="doc-card__actions">
                    {e.file_url && (
                      <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="doc-card__btn">
                        📄 Baixar documento
                      </a>
                    )}
                    {e.external_url && (
                      <a href={e.external_url} target="_blank" rel="noopener noreferrer" className="doc-card__btn doc-card__btn--external">
                        🔗 Acessar link
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </>
  );
}

// (styles migrados para src/styles/pages.css)
