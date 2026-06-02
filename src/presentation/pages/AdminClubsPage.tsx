import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { ListClubs } from "@application/use_cases/ListClubs";
import type { Club } from "@domain/entities/Club";

const PAGE_SIZE = 10;

interface Props { listClubs: ListClubs; }

export function AdminClubsPage({ listClubs }: Props) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    listClubs.execute()
      .then(setClubs)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? clubs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.nickname ?? "").toLowerCase().includes(q) ||
        (c.acronym ?? "").toLowerCase().includes(q) ||
        (c.city_name ?? "").toLowerCase().includes(q) ||
        (c.president ?? "").toLowerCase().includes(q)
      )
    : clubs;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <div style={S.heroRow}>
            <h1 style={S.title}>Clubes</h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link to="/admin/clubes/importar" style={{ ...S.btnNew, backgroundColor: "#cba6f7" }}>⬆ Importar CSV</Link>
              <Link to="/admin/clubes/novo" style={S.btnNew}>+ Novo clube</Link>
            </div>
          </div>
          <div style={S.searchWrap}>
            <input
              type="search"
              placeholder="Pesquisar por nome, cidade ou presidente..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={S.searchInput}
            />
          </div>
        </div>
      </header>
      <main style={S.page}>
        {loading && <p style={S.hint}>Carregando...</p>}
        {error && <p style={S.error}>{error}</p>}
        {!loading && !error && (
          <>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Nome</th>
                    <th style={S.th}>Apelido / Sigla</th>
                    <th style={S.th}>Cidade</th>
                    <th style={S.th}>Presidente</th>
                    <th style={S.th}>Local</th>
                    <th style={S.th}>Fundação</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={S.empty}>Nenhum clube cadastrado.</td>
                    </tr>
                  ) : (
                    slice.map(c => (
                      <tr key={c.id} style={S.trRow}>
                        <td style={S.td}>
                          <Link
                            to={`/admin/clubes/${c.id}/editar`}
                            state={{ club: c }}
                            style={S.rowLink}
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td style={S.tdMuted}>
                          {c.nickname && <span>{c.nickname}</span>}
                          {c.acronym && <span style={S.acronymBadge}>{c.acronym}</span>}
                          {!c.nickname && !c.acronym && "—"}
                        </td>
                        <td style={S.td}>{c.city_name || "—"}</td>
                        <td style={S.tdMuted}>{c.president ?? "—"}</td>
                        <td style={S.tdMuted}>{c.venue_name ?? "—"}</td>
                        <td style={S.tdMuted}>{c.founded_at ? c.founded_at.slice(0, 10) : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={S.footer}>
              <span style={S.count}>
                {filtered.length} {filtered.length === 1 ? "clube" : "clubes"}{q ? " encontrado" : ""}
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
    backgroundColor: "#181825",
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
    backgroundColor: "#1e1e2e",
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
    backgroundColor: "#181825",
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
  trRow: { borderBottom: "1px solid #1e1e2e" },
  td: { padding: "0.75rem 1rem", color: "#cdd6f4", verticalAlign: "middle" },
  tdMuted: { padding: "0.75rem 1rem", color: "#cdd6f4", verticalAlign: "middle" },
  empty: { padding: "2rem 1rem", color: "#cdd6f4", textAlign: "center" },
  rowLink: { color: "#cdd6f4", textDecoration: "none", fontWeight: 500 },
  acronymBadge: {
    display: "inline-block",
    marginLeft: "0.4rem",
    backgroundColor: "#313244",
    borderRadius: "4px",
    color: "#89b4fa",
    fontSize: "0.8rem",
    fontWeight: 700,
    padding: "0.1rem 0.45rem",
    letterSpacing: "0.03em",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "1.25rem",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  count: { color: "#cdd6f4", fontSize: "0.85rem" },
  pagination: { display: "flex", alignItems: "center", gap: "0.75rem" },
  pgBtn: {
    backgroundColor: "#313244",
    border: "none",
    borderRadius: "6px",
    color: "#cdd6f4",
    cursor: "pointer",
    fontSize: "0.85rem",
    padding: "0.4rem 0.9rem",
  },
  pgBtnDisabled: { opacity: 0.4, cursor: "default" },
  pgInfo: { color: "#cdd6f4", fontSize: "0.85rem", minWidth: "4rem", textAlign: "center" },
};
