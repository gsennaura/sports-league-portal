import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "@infrastructure/apiBase";

interface MatchItem {
  id: string;
  match_date: string | null;
  round_number: number | null;
  home_team_name: string;
  away_team_name: string;
  home_team_category: string | null;
  away_team_category: string | null;
  home_score: number | null;
  away_score: number | null;
  championship_name: string;
  championship_year: number | null;
  phase_name: string | null;
  league_name: string | null;
  venue_name: string | null;
  status: string | null;
  sport_name: string | null;
}

const S: Record<string, React.CSSProperties> = {
  page:     { minHeight: "100vh", background: "#18265b", color: "#cdd6f4" },
  inner:    { maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" },
  title:    { fontSize: "22px", fontWeight: 700, color: "#cdd6f4", margin: "0 0 4px" },
  subtitle: { fontSize: "14px", color: "#ffffff", margin: "0 0 24px" },
  card:     { background: "#18265b", borderRadius: "10px", padding: "20px", marginBottom: "20px" },
  filters:  { display: "flex", gap: "16px", flexWrap: "wrap" as const, alignItems: "flex-end", marginBottom: "20px" },
  field:    { display: "flex", flexDirection: "column" as const },
  label:    { fontSize: "12px", color: "#ffffff", marginBottom: "5px" },
  input:    { padding: "8px 12px", background: "#313244", color: "#cdd6f4", border: "1px solid #45475a", borderRadius: "6px", fontSize: "14px" },
  table:    { width: "100%", borderCollapse: "collapse" as const, fontSize: "14px" },
  th:       { textAlign: "left" as const, padding: "10px 12px", color: "#ffffff", borderBottom: "1px solid #313244", fontWeight: 600, fontSize: "12px", textTransform: "uppercase" as const },
  td:       { padding: "10px 12px", borderBottom: "1px solid #313244", verticalAlign: "middle" as const, color: "#cdd6f4" },
  tdMuted:  { padding: "10px 12px", borderBottom: "1px solid #313244", verticalAlign: "middle" as const, color: "#ffffff", fontSize: "13px" },
  scoreCell:{ padding: "10px 12px", borderBottom: "1px solid #313244", verticalAlign: "middle" as const, fontWeight: 700, color: "#f9e2af", fontFamily: "monospace", fontSize: "15px" },
  actionLink: { padding: "4px 10px", borderRadius: "5px", fontSize: "12px", fontWeight: 600, textDecoration: "none", marginRight: "6px" },
  tabRow:   { display: "flex", gap: "0", marginBottom: "20px", borderBottom: "1px solid #313244" },
  tab:      { padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600, borderBottom: "2px solid transparent", color: "#ffffff", background: "transparent", border: "none" },
  tabActive:{ padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600, borderBottom: "2px solid #89b4fa", color: "#89b4fa", background: "transparent", border: "none" },
  empty:    { textAlign: "center" as const, color: "#ffffff", padding: "40px", fontSize: "14px" },
  loader:   { textAlign: "center" as const, color: "#ffffff", padding: "40px", fontSize: "14px" },
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: string | null, hasScore: boolean): React.ReactNode {
  if (hasScore) return <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#a6e3a1", color: "#18265b" }}>Finalizada</span>;
  if (status === "live") return <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#f38ba8", color: "#18265b" }}>Ao vivo</span>;
  return <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#313244", color: "#cdd6f4" }}>Agendada</span>;
}

export function AdminMatchesPage() {
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [days, setDays] = useState(30);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filterLeague, setFilterLeague] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTeam, setFilterTeam] = useState("");

  useEffect(() => {
    setLoading(true);
    setMatches([]);
    const url = tab === "upcoming"
      ? `${API_BASE}/matches/upcoming?days=${days}`
      : `${API_BASE}/matches/recent?days=${days}`;
    fetch(url)
      .then(r => r.ok ? r.json() as Promise<MatchItem[]> : [])
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [tab, days]);

  // ── Derive distinct filter options from loaded matches ────────────────────
  const leagueOptions = [...new Set(matches.map(m => m.league_name).filter((v): v is string => !!v))].sort();
  const sportOptions = [...new Set(matches.map(m => m.sport_name).filter((v): v is string => !!v))].sort();
  const categoryOptions = [...new Set(matches.flatMap(m => [m.home_team_category, m.away_team_category]).filter((v): v is string => !!v))].sort();

  // ── Apply filters ─────────────────────────────────────────────────────────
  const q = searchText.toLowerCase();
  const filtered = matches
    .filter(m => !filterLeague || m.league_name === filterLeague)
    .filter(m => !filterSport || m.sport_name === filterSport)
    .filter(m => !filterCategory || m.home_team_category === filterCategory || m.away_team_category === filterCategory)
    .filter(m => !filterTeam || m.home_team_name.toLowerCase().includes(filterTeam.toLowerCase()) || m.away_team_name.toLowerCase().includes(filterTeam.toLowerCase()))
    .filter(m => !q || m.home_team_name.toLowerCase().includes(q) || m.away_team_name.toLowerCase().includes(q) || (m.championship_name ?? "").toLowerCase().includes(q) || (m.league_name ?? "").toLowerCase().includes(q));

  return (
    <div className="page-container">
      <div className="hero__inner">
        <h1 className="page-title">Partidas</h1>
        <p className="page-subtitle">Consulte e gerencie partidas agendadas e recentes.</p>

        {/* Tabs */}
        <div style={S.tabRow}>
          <button style={tab === "upcoming" ? S.tabActive : S.tab} onClick={() => setTab("upcoming")}>Próximas</button>
          <button style={tab === "recent"   ? S.tabActive : S.tab} onClick={() => setTab("recent")}>Recentes</button>
        </div>

        {/* Filters */}
        <div style={S.filters}>
          <div className="form-field">
            <label className="form-label">Liga</label>
            <select style={S.input} value={filterLeague} onChange={e => setFilterLeague(e.target.value)}>
              <option value="">Todas as ligas</option>
              {leagueOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Esporte</label>
            <select style={S.input} value={filterSport} onChange={e => setFilterSport(e.target.value)}>
              <option value="">Todos os esportes</option>
              {sportOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Categoria</label>
            <select style={S.input} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Buscar time</label>
            <input
              style={{ ...S.input, width: "200px" }}
              placeholder="Nome do time…"
              value={filterTeam}
              onChange={e => setFilterTeam(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Buscar campeonato</label>
            <input
              style={{ ...S.input, width: "220px" }}
              placeholder="Nome do campeonato…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Janela ({days} dias)</label>
            <select
              style={S.input}
              value={days}
              onChange={e => setDays(Number(e.target.value))}
            >
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={S.card}>
          {loading ? (
            <div style={S.loader}>Carregando partidas…</div>
          ) : filtered.length === 0 ? (
            <div style={S.empty}>Nenhuma partida encontrada.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={S.th}>Data</th>
                  <th style={S.th}>Partida</th>
                  <th style={{ ...S.th, textAlign: "center" as const }}>Placar</th>
                  <th style={S.th}>Campeonato / Fase</th>
                  <th style={S.th}>Local</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const hasScore = m.home_score !== null && m.away_score !== null;
                  return (
                    <tr key={m.id}>
                      <td style={S.tdMuted}>{formatDate(m.match_date)}</td>
                      <td style={S.td}>
                        <span style={{ fontWeight: 600 }}>{m.home_team_name}</span>
                        <span style={{ color: "#ffffff", margin: "0 6px" }}>vs</span>
                        <span style={{ fontWeight: 600 }}>{m.away_team_name}</span>
                      </td>
                      <td style={{ ...S.scoreCell, textAlign: "center" as const }}>
                        {hasScore ? `${m.home_score} – ${m.away_score}` : "— – —"}
                      </td>
                      <td style={S.tdMuted}>
                        {m.championship_name}{m.championship_year ? ` ${m.championship_year}` : ""}
                        {m.phase_name ? <><br /><span style={{ fontSize: "12px", color: "#ffffff" }}>{m.phase_name}</span></> : null}
                      </td>
                      <td style={S.tdMuted}>{m.venue_name ?? "—"}</td>
                      <td style={S.td}>{statusBadge(m.status, hasScore)}</td>
                      <td style={S.td}>
                        {!hasScore && (
                          <Link
                            to={`/admin/partidas/${m.id}/resultado`}
                            style={{ ...S.actionLink, background: "#89b4fa", color: "#18265b" }}
                          >
                            Resultado
                          </Link>
                        )}
                        <Link
                          to={`/admin/partidas/${m.id}/editar`}
                          style={{ ...S.actionLink, background: "#313244", color: "#cdd6f4" }}
                        >
                          Editar
                        </Link>
                        <Link
                          to={`/partidas/${m.id}`}
                          style={{ ...S.actionLink, background: "transparent", color: "#ffffff", border: "1px solid #45475a" }}
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
