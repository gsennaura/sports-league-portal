import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { ListChampionships } from "@application/use_cases/ListChampionships";
import type { Championship } from "@domain/entities/Championship";
import { useAuth } from "@presentation/context/AuthContext";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

const PAGE_SIZE = 10;

const LEVEL_LABEL: Record<string, string> = {
  amador: "Amador",
  junior: "Júnior",
  juvenil: "Juvenil",
  infantil: "Infantil",
  mirim: "Mirim",
  "pre-mirim": "Pré-Mirim",
  universitario: "Universitário",
  profissional: "Profissional",
  master: "Master",
  terrao: "Terrão",
  clube_social: "Clube Social",
};

interface Props { listChampionships: ListChampionships; }

export function AdminChampionshipsPage({ listChampionships }: Props) {
  const { isAdmin, isLeagueAdmin, leagueAdminProfiles } = useAuth();
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allLeagues, setAllLeagues] = useState<{ id: string; name: string }[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/leagues?`, { headers: authHeaders() })
      .then(r => r.json() as Promise<{ id: string; name: string }[]>)
      .then(lg => {
        let visible = lg;
        if (isLeagueAdmin && !isAdmin) {
          const myIds = new Set(leagueAdminProfiles.filter(p => p.is_active).map(p => p.league_id));
          visible = lg.filter(l => myIds.has(l.id));
        }
        const sorted = visible.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setAllLeagues(sorted);
        if (sorted.length === 1) setSelectedLeagueId(sorted[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    listChampionships.execute()
      .then(setChampionships)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const byLeague = selectedLeagueId
    ? championships.filter(c => c.league_id === selectedLeagueId)
    : championships;
  const filtered = q
    ? byLeague.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.nickname ?? "").toLowerCase().includes(q) ||
        (c.division ?? "").toLowerCase().includes(q) ||
        c.sport_name.toLowerCase().includes(q) ||
        c.city_name.toLowerCase().includes(q) ||
        (c.level ?? "").toLowerCase().includes(q)
      )
    : byLeague;

  // Deduplicate: one row per championship series (group by c.id)
  const seriesMap = new Map<string, Championship>();
  for (const c of filtered) {
    const existing = seriesMap.get(c.id);
    if (!existing || c.year > existing.year) seriesMap.set(c.id, c);
  }
  const allSeries = [...seriesMap.values()].sort((a, b) =>
    (a.nickname ?? a.name).localeCompare(b.nickname ?? b.name, "pt-BR")
  );

  const totalPages = Math.max(1, Math.ceil(allSeries.length / PAGE_SIZE));
  const slice = allSeries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <div style={S.heroRow}>
            <h1 style={S.title}>Campeonatos</h1>
            <Link to="/admin/campeonatos/novo" style={S.btnNew}>+ Novo campeonato</Link>
          </div>
          <div style={S.searchWrap}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <select
                value={selectedLeagueId}
                onChange={e => { setSelectedLeagueId(e.target.value); setPage(1); }}
                disabled={isLeagueAdmin && !isAdmin}
                style={{ ...S.searchInput, flex: "0 0 auto", width: "auto", minWidth: "180px", cursor: (isLeagueAdmin && !isAdmin) ? "not-allowed" : "pointer", opacity: (isLeagueAdmin && !isAdmin) ? 0.7 : 1 }}
              >
                <option value="">Todas as ligas</option>
                {allLeagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <input
                type="search"
                placeholder="Pesquisar por nome, esporte, cidade ou nível..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ ...S.searchInput, flex: 1, minWidth: "200px" }}
              />
            </div>
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
                    <th style={S.th}>Campeonato</th>
                    <th style={S.th}>Apelido</th>
                    <th style={S.th}>Divisão</th>
                    <th style={S.th}>Esporte</th>
                    <th style={S.th}>Nível</th>
                    <th style={S.th}>Cidade</th>
                    <th style={S.th} colSpan={2}></th>
                  </tr>
                </thead>
                <tbody>
                  {slice.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={S.empty}>Nenhum campeonato cadastrado.</td>
                    </tr>
                  ) : (
                    slice.map(c => (
                      <tr key={c.id} style={S.trRow}>
                        <td style={S.td}>
                          <span style={S.champName}>{c.name}</span>
                        </td>
                        <td style={S.tdMuted}>{c.nickname ?? "—"}</td>
                        <td style={S.tdMuted}>{c.division ?? "—"}</td>
                        <td style={S.tdMuted}>{c.sport_name}</td>
                        <td style={S.td}>{c.level ? LEVEL_LABEL[c.level] ?? c.level : "—"}</td>
                        <td style={S.tdMuted}>{c.city_name}</td>
                        <td style={S.tdAction}>
                          <Link to={`/admin/campeonatos/${c.id}/nova-edicao`} style={S.newEditionLink}>
                            + Nova Edição
                          </Link>
                        </td>
                        <td style={S.tdAction}>
                          <Link to={`/admin/campeonatos/${c.id}/edicoes`} style={S.manageLink}>
                            Gerenciar →
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
                {allSeries.length} {allSeries.length === 1 ? "campeonato" : "campeonatos"}{q ? " encontrado" : ""}
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
  heroInner: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  heroRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "1rem", flexWrap: "wrap",
  },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  btnNew: {
    backgroundColor: "#cba6f7", borderRadius: "6px", color: "#11111b",
    fontSize: "0.875rem", fontWeight: 700, padding: "0.5rem 1.1rem",
    textDecoration: "none", whiteSpace: "nowrap",
  },
  searchWrap: { marginTop: "1rem" },
  searchInput: {
    width: "100%", backgroundColor: "#1e1e2e", border: "1px solid #313244",
    borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem",
    padding: "0.55rem 0.9rem", outline: "none", boxSizing: "border-box",
  },
  page: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" },
  hint: { color: "#cdd6f4", fontSize: "0.9rem" },
  error: { color: "#f38ba8", fontSize: "0.9rem" },
  tableWrap: { overflowX: "auto", borderRadius: "8px", border: "1px solid #313244" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: {
    backgroundColor: "#181825", color: "#cdd6f4", fontWeight: 600,
    fontSize: "0.84rem", textTransform: "uppercase", letterSpacing: "0.05em",
    padding: "0.7rem 1rem", textAlign: "left", borderBottom: "1px solid #313244",
    whiteSpace: "nowrap",
  },
  trRow: { borderBottom: "1px solid #1e1e2e" },
  td: { padding: "0.7rem 1rem", color: "#cdd6f4" },
  tdMuted: { padding: "0.7rem 1rem", color: "#cdd6f4" },
  tdYear: { padding: "0.7rem 1rem", color: "#89b4fa", fontFamily: "monospace", fontWeight: 600 },
  tdAction: { padding: "0.7rem 1rem", textAlign: "right" },
  manageLink: { color: "#89b4fa", textDecoration: "none", fontSize: "0.825rem", fontWeight: 600, whiteSpace: "nowrap" },
  newEditionLink: { color: "#a6e3a1", textDecoration: "none", fontSize: "0.825rem", fontWeight: 600, whiteSpace: "nowrap" },
  empty: { padding: "1.5rem", textAlign: "center", color: "#cdd6f4" },
  champName: { fontWeight: 500 },
  champNickname: { color: "#cdd6f4", fontSize: "0.85rem" },
  footer: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem",
  },
  count: { color: "#cdd6f4", fontSize: "0.85rem" },
  pagination: { display: "flex", alignItems: "center", gap: "0.5rem" },
  pgBtn: {
    backgroundColor: "#1e1e2e", border: "1px solid #313244", borderRadius: "6px",
    color: "#cdd6f4", fontSize: "0.85rem", padding: "0.4rem 0.85rem", cursor: "pointer",
  },
  pgBtnDisabled: { opacity: 0.35, cursor: "default" },
  pgInfo: { color: "#cdd6f4", fontSize: "0.85rem", minWidth: "3rem", textAlign: "center" },
};
