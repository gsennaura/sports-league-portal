import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import type { League } from "@domain/entities/League";

const PAGE_SIZE = 10;

interface Props { listLeagues: ListLeagues; }

export function AdminLeaguesPage({ listLeagues }: Props) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    listLeagues.execute()
      .then(setLeagues)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? leagues.filter(lg =>
        lg.name.toLowerCase().includes(q) ||
        lg.short_name.toLowerCase().includes(q) ||
        (lg.city_name ?? "").toLowerCase().includes(q) ||
        (lg.president ?? "").toLowerCase().includes(q)
      )
    : leagues;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <div className="hero__row">
            <h1 className="page-title">Ligas</h1>
            <Link to="/admin/ligas/novo" style={S.btnNew}>+ Nova liga</Link>
          </div>
          <div style={S.searchWrap}>
            <input
              type="search"
              placeholder="Pesquisar por nome, sigla, cidade ou presidente..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={S.searchInput}
            />
          </div>
        </div>
      </header>
      <main className="page-container">
        {loading && <p style={S.hint}>Carregando...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={S.th}>Nome</th>
                    <th style={S.th}>Sigla</th>
                    <th style={S.th}>Cidade</th>
                    <th style={S.th}>Presidente</th>
                    <th style={S.th}>Federada</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {slice.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={S.empty}>Nenhuma liga cadastrada.</td>
                    </tr>
                  ) : (
                    slice.map(lg => (
                      <tr key={lg.id} style={S.trRow}>
                        <td style={S.td}>
                          <Link
                            to={`/admin/ligas/${lg.id}/editar`}
                            state={{ league: lg }}
                            style={S.rowLink}
                          >
                            {lg.name}
                          </Link>
                        </td>
                        <td style={S.tdMono}>{lg.short_name}</td>
                        <td style={S.td}>{lg.city_name || "—"}</td>
                        <td style={S.tdMuted}>{lg.president ?? "—"}</td>
                        <td style={S.td}>
                          {lg.is_federated
                            ? <span style={S.badgeGreen}>Sim</span>
                            : <span style={S.badgeGray}>Não</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                          <Link
                            to={`/admin/ligas/${lg.id}/clubes`}
                            style={S.btnFiliacao}
                          >
                            Filiações →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={S.footer}>
              <span style={S.count}>
                {filtered.length} {filtered.length === 1 ? "liga" : "ligas"}{q ? " encontrada" : ""}
              </span>
              {totalPages > 1 && (
                <div style={S.pagination}>
                  <button
                    style={{ ...S.pgBtn, ...(page === 1 ? S.pgBtnDisabled : {}) }}
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    ‹ Anterior
                  </button>
                  <span style={S.pgInfo}>{page} / {totalPages}</span>
                  <button
                    style={{ ...S.pgBtn, ...(page === totalPages ? S.pgBtnDisabled : {}) }}
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Próximo ›
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    backgroundColor: "#18265b",
    borderBottom: "1px solid #313244",
    position: "relative",
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "3px",
    background: "linear-gradient(90deg, #cba6f7, #89b4fa)",
  },
  heroInner: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "1.5rem 1.5rem 1.25rem",
  },
  heroRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
  },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  btnNew: {
    backgroundColor: "#cba6f7",
    borderRadius: "6px",
    color: "#11111b",
    fontSize: "0.875rem",
    fontWeight: 700,
    padding: "0.5rem 1.1rem",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  searchWrap: { marginTop: "1rem" },
  searchInput: {
    width: "100%",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    padding: "0.55rem 0.9rem",
    outline: "none",
    boxSizing: "border-box",
  },
  page: { maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem" },
  hint: { color: "#cdd6f4", fontSize: "0.9rem" },
  error: { color: "#f38ba8", fontSize: "0.9rem" },
  tableWrap: {
    overflowX: "auto",
    borderRadius: "8px",
    border: "1px solid #313244",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: {
    backgroundColor: "#18265b",
    color: "#cdd6f4",
    fontWeight: 600,
    fontSize: "0.84rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "0.7rem 1rem",
    textAlign: "left",
    borderBottom: "1px solid #313244",
    whiteSpace: "nowrap",
  },
  trRow: { borderBottom: "1px solid #18265b" },
  td: { padding: "0.7rem 1rem", color: "#cdd6f4" },
  tdMuted: { padding: "0.7rem 1rem", color: "#cdd6f4" },
  tdMono: { padding: "0.7rem 1rem", color: "#89b4fa", fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" },
  empty: { padding: "1.5rem", textAlign: "center", color: "#cdd6f4" },
  rowLink: { color: "#cdd6f4", textDecoration: "none", fontWeight: 500 },
  btnFiliacao: {
    backgroundColor: "#313244",
    border: "1px solid #45475a",
    borderRadius: "5px",
    color: "#89b4fa",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "0.25rem 0.65rem",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  badgeGreen: { backgroundColor: "#1a2a1f", color: "#a6e3a1", border: "1px solid #2a5a30", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.82rem", fontWeight: 600 },
  badgeGray: { backgroundColor: "#18265b", color: "#cdd6f4", border: "1px solid #313244", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.82rem", fontWeight: 600 },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "1rem",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  count: { color: "#cdd6f4", fontSize: "0.85rem" },
  pagination: { display: "flex", alignItems: "center", gap: "0.5rem" },
  pgBtn: {
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "0.85rem",
    padding: "0.4rem 0.85rem",
    cursor: "pointer",
  },
  pgBtnDisabled: { opacity: 0.35, cursor: "default" },
  pgInfo: { color: "#cdd6f4", fontSize: "0.85rem", minWidth: "3rem", textAlign: "center" },
};
