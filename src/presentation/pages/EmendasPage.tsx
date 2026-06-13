import React, { useEffect, useState } from "react";
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
        <div style={S.filters}>
          <button
            style={{ ...S.filterBtn, ...(yearFilter === "" ? S.filterBtnActive : {}) }}
            onClick={() => setYearFilter("")}
          >Todos os anos</button>
          {YEAR_RANGE.map((y) => (
            <button
              key={y}
              style={{ ...S.filterBtn, ...(yearFilter === y ? S.filterBtnActive : {}) }}
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
          <div key={y} style={S.yearGroup}>
            <h2 style={S.yearHeading}>{y}</h2>
            <div style={S.list}>
              {byYear[y].map((e) => (
                <div key={e.id} style={S.card}>
                  <div style={S.cardTop}>
                    <span style={{ ...S.typeBadge, color: REF_COLORS[e.ref_type] }}>
                      {EMENDA_REF_TYPE_LABELS[e.ref_type]}
                    </span>
                  </div>
                  <h3 style={S.cardTitle}>{e.title}</h3>
                  {e.description && <p style={S.cardDesc}>{e.description}</p>}
                  <div style={S.cardActions}>
                    {e.file_url && (
                      <a href={e.file_url} target="_blank" rel="noopener noreferrer" style={S.btnFile}>
                        📄 Baixar documento
                      </a>
                    )}
                    {e.external_url && (
                      <a href={e.external_url} target="_blank" rel="noopener noreferrer" style={S.btnExternal}>
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

const S: Record<string, React.CSSProperties> = {
  filters: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem" },
  filterBtn: { padding: "0.4rem 0.9rem", borderRadius: "20px", border: "1px solid #45475a", background: "#18265b", color: "#ffffff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 },
  filterBtnActive: { background: "#313244", borderColor: "#cba6f7", color: "#cba6f7" },
  yearGroup: { marginBottom: "2.5rem" },
  yearHeading: { margin: "0 0 0.75rem", fontSize: "1.1rem", fontWeight: 800, color: "#cba6f7", borderBottom: "1px solid #313244", paddingBottom: "0.4rem" },
  list: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  card: { background: "#18265b", border: "1px solid #313244", borderRadius: 10, padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" },
  cardTop: { display: "flex", alignItems: "center", gap: "0.5rem" },
  typeBadge: { fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  cardTitle: { margin: 0, fontSize: "0.97rem", fontWeight: 700, color: "#cdd6f4" },
  cardDesc: { margin: 0, fontSize: "0.82rem", color: "#ffffff", lineHeight: 1.45 },
  cardActions: { display: "flex", gap: "0.75rem", marginTop: "0.25rem" },
  btnFile: { padding: "0.42rem 1rem", borderRadius: "8px", background: "#313244", color: "#cdd6f4", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 },
  btnExternal: { padding: "0.42rem 1rem", borderRadius: "8px", background: "transparent", border: "1px solid #45475a", color: "#89b4fa", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 },
};
