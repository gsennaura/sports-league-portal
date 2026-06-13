import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { ListVenues } from "@application/use_cases/ListVenues";
import type { Venue } from "@domain/entities/Venue";
import { API_BASE } from "@infrastructure/apiBase";

const PAGE_SIZE = 10;

interface City { id: string; name: string; }

interface Props { listVenues: ListVenues; }

export function AdminVenuesPage({ listVenues }: Props) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [cityMap, setCityMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      listVenues.execute(),
      fetch(`${API_BASE}/cities`).then(r => r.json() as Promise<City[]>),
    ])
      .then(([vs, cities]) => {
        setVenues(vs);
        const map = new Map<string, string>();
        for (const c of cities) map.set(c.id, c.name);
        setCityMap(map);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? venues.filter(v =>
        v.name.toLowerCase().includes(q) ||
        (v.nickname ?? "").toLowerCase().includes(q) ||
        (cityMap.get(v.city_id) ?? "").toLowerCase().includes(q)
      )
    : venues;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <div className="hero__row">
            <h1 className="page-title">Locais</h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link to="/admin/locais/importar" style={{ ...S.btnNew, backgroundColor: "#fab387" }}>⬆ Importar CSV</Link>
              <Link to="/admin/locais/novo" className="btn btn-success">+ Novo local</Link>
            </div>
          </div>
          <div className="search-wrap">
            <input
              type="search"
              placeholder="Pesquisar por nome, apelido ou cidade..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="search-input"
            />
          </div>
        </div>
      </header>
      <main className="page-container">
        {loading && <p className="muted">Carregando...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th >Nome</th>
                    <th >Apelido</th>
                    <th >Cidade</th>
                    <th >Bairro</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">Nenhum local cadastrado.</td>
                    </tr>
                  ) : (
                    slice.map(v => (
                      <tr
                        key={v.id}
                        
                      >
                        <td >
                          <Link
                            to={`/admin/locais/${v.id}/editar`}
                            state={{ venue: v }}
                            className="row-link"
                          >
                            {v.name}
                          </Link>
                        </td>
                        <td className="td-muted">{v.nickname ?? "—"}</td>
                        <td >{cityMap.get(v.city_id) ?? "—"}</td>
                        <td className="td-muted">{v.neighborhood ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div >
              <span className="page-info">{filtered.length} {filtered.length === 1 ? "local" : "locais"}{q ? " encontrado" : ""}</span>
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    style={{ ...S.pgBtn, ...(page === 1 ? S.pgBtnDisabled : {}) }}
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    ‹ Anterior
                  </button>
                  <span className="page-info">{page} / {totalPages}</span>
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
    top: 0,
    left: 0,
    right: 0,
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
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#cdd6f4",
    margin: 0,
  },
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
  page: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
  },
  hint: { color: "#cdd6f4", fontSize: "0.9rem" },
  error: { color: "#f38ba8", fontSize: "0.9rem" },
  tableWrap: {
    overflowX: "auto",
    borderRadius: "8px",
    border: "1px solid #313244",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
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
  trRow: {
    borderBottom: "1px solid #18265b",
  },
  td: {
    padding: "0.75rem 1rem",
    color: "#cdd6f4",
    verticalAlign: "middle",
  },
  tdMuted: {
    padding: "0.75rem 1rem",
    color: "#cdd6f4",
    verticalAlign: "middle",
  },
  empty: {
    padding: "2rem 1rem",
    color: "#cdd6f4",
    textAlign: "center",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "1.25rem",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  searchWrap: {
    marginTop: "1rem",
  },
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
  rowLink: {
    color: "#cdd6f4",
    textDecoration: "none",
    fontWeight: 500,
  },
  count: {
    color: "#cdd6f4",
    fontSize: "0.85rem",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  pgBtn: {
    backgroundColor: "#313244",
    border: "none",
    borderRadius: "6px",
    color: "#cdd6f4",
    cursor: "pointer",
    fontSize: "0.85rem",
    padding: "0.4rem 0.9rem",
  },
  pgBtnDisabled: {
    opacity: 0.4,
    cursor: "default",
  },
  pgInfo: {
    color: "#cdd6f4",
    fontSize: "0.85rem",
    minWidth: "4rem",
    textAlign: "center",
  },
};
