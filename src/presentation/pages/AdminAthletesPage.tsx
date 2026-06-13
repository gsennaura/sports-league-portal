import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { SearchAthletes } from "@application/use_cases/SearchAthletes";
import type { DeleteAthlete } from "@application/use_cases/DeleteAthlete";
import type { Athlete, AthleteTeamHistory } from "@domain/entities/Athlete";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";
import { useAuth } from "@presentation/context/AuthContext";

const CATEGORY_LABEL: Record<string, string> = {
  amador: "Amador", profissional: "Profissional", base: "Base",
  junior: "Júnior", juvenil: "Juvenil", infantil: "Infantil",
  mirim: "Mirim", "pre-mirim": "Pré-Mirim", master: "Master",
  universitaria: "Universitária", rural: "Rural", "inter-municipal": "Inter-municipal",
};

const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/main/athletes/no_athlete_photo.png";

interface Props {
  searchAthletes: SearchAthletes;
  deleteAthlete: DeleteAthlete;
}

export function AdminAthletesPage({ searchAthletes, deleteAthlete }: Props) {
  const { isAdmin, isLeagueAdmin, leagueAdminProfiles } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Athlete[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Cascade filter state
  interface TeamRow { id: string; name: string; sport_name: string | null; category: string | null; club_id: string | null; }
  const [allLeagues, setAllLeagues] = useState<{ id: string; name: string }[]>([]);
  const [allTeams, setAllTeams] = useState<TeamRow[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [leagueClubIds, setLeagueClubIds] = useState<Set<string>>(new Set());
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamAthletes, setTeamAthletes] = useState<AthleteTeamHistory[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

  // Load leagues
  useEffect(() => {
    fetch(`${API_BASE}/leagues??limit=200`, { headers: authHeaders() })
      .then((r) => r.json() as Promise<{ id: string; name: string }[]>)
      .then((all) => {
        let leagues = all;
        if (isLeagueAdmin && !isAdmin) {
          const myIds = new Set(leagueAdminProfiles.filter((p) => p.is_active).map((p) => p.league_id));
          leagues = all.filter((l) => myIds.has(l.id));
        }
        setAllLeagues(leagues);
        if (leagues.length === 1) setSelectedLeagueId(leagues[0].id);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isLeagueAdmin, leagueAdminProfiles.length]);

  // Load all teams
  useEffect(() => {
    fetch(`${API_BASE}/teams?limit=500`, { headers: authHeaders() })
      .then((r) => r.json() as Promise<TeamRow[]>)
      .then(setAllTeams)
      .catch(() => {});
  }, []);

  // Load clubs for selected league
  useEffect(() => {
    if (!selectedLeagueId) { setLeagueClubIds(new Set()); return; }
    fetch(`${API_BASE}/leagues/${selectedLeagueId}/clubs`, { headers: authHeaders() })
      .then((r) => r.json() as Promise<{ club_id: string }[]>)
      .then((rows) => setLeagueClubIds(new Set(rows.map((r) => r.club_id))))
      .catch(() => setLeagueClubIds(new Set()));
  }, [selectedLeagueId]);

  // Load athletes for selected team
  useEffect(() => {
    if (!selectedTeamId) { setTeamAthletes([]); return; }
    setLoadingAthletes(true);
    fetch(`${API_BASE}/teams/${selectedTeamId}/athletes?active=true`, { headers: authHeaders() })
      .then((r) => r.json() as Promise<AthleteTeamHistory[]>)
      .then(setTeamAthletes)
      .catch(() => setTeamAthletes([]))
      .finally(() => setLoadingAthletes(false));
  }, [selectedTeamId]);

  // Derived cascade options
  const teamsInLeague = selectedLeagueId
    ? allTeams.filter((t) => t.club_id != null && leagueClubIds.has(t.club_id))
    : (isLeagueAdmin && !isAdmin ? [] : allTeams);

  const availableSports = [...new Set(teamsInLeague.map((t) => t.sport_name).filter(Boolean))].sort() as string[];

  const teamsForSport = selectedSport ? teamsInLeague.filter((t) => t.sport_name === selectedSport) : teamsInLeague;

  const availableCategories = [...new Set(teamsForSport.map((t) => t.category).filter(Boolean))].sort() as string[];

  const teamOptions = (selectedCategory ? teamsForSport.filter((t) => t.category === selectedCategory) : teamsForSport)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  async function handleDelete(athlete: Athlete) {
    if (!confirm(`Tem certeza que deseja excluir "${athlete.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(athlete.id);
    setDeleteError(null);
    try {
      await deleteAthlete.execute(athlete.id);
      setResults((prev) => prev?.filter((a) => a.id !== athlete.id) ?? null);
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  const handleSearch = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setSelectedTeamId(""); // clear team selection when doing text search
    try {
      setResults(await searchAthletes.execute(q));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeamAthletes = query.trim()
    ? teamAthletes.filter((a) =>
        (a.athlete_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
        (a.athlete_nickname ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : teamAthletes;

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <div className="hero__row">
            <h1 className="page-title">Atletas</h1>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Link to="/admin/atletas/importar" style={{ ...S.btnNew, background: "none", border: "1px solid #89b4fa", color: "var(--c-link)" }}>⬆ Importar CSV</Link>
              <Link to="/admin/atletas/novo" className="btn btn-success">+ Novo atleta</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="page-container">
        {/* Cascade filter bar */}
        <div className="toolbar">
          <select
            className="filter-select"
            value={selectedLeagueId}
            onChange={(e) => { setSelectedLeagueId(e.target.value); setSelectedSport(""); setSelectedCategory(""); setSelectedTeamId(""); }}
            disabled={isLeagueAdmin && !isAdmin && allLeagues.length <= 1}
          >
            {!isLeagueAdmin && <option value="">Todas as ligas</option>}
            {allLeagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select
            className="filter-select"
            value={selectedSport}
            onChange={(e) => { setSelectedSport(e.target.value); setSelectedCategory(""); setSelectedTeamId(""); }}
          >
            <option value="">Todos os esportes</option>
            {availableSports.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedTeamId(""); }}
          >
            <option value="">Todas as categorias</option>
            {availableCategories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
          </select>
          <select
            style={{ ...S.filterSelect, minWidth: "200px", flex: 1 }}
            value={selectedTeamId}
            onChange={(e) => { setSelectedTeamId(e.target.value); setResults(null); setSearched(false); }}
          >
            <option value="">Selecione um time</option>
            {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Text search (secondary — for name filter or full_admin search) */}
        <div className="search-wrap">
          <input
            type="search"
            placeholder={selectedTeamId ? "Filtrar atletas do time..." : "Buscar atleta por nome (mín. 2 caracteres)…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !selectedTeamId) handleSearch(); }}
            className="search-input"
          />
          {!selectedTeamId && (
            <button onClick={handleSearch} disabled={loading || query.trim().length < 2} className="btn btn-primary">
              {loading ? "Buscando…" : "Buscar"}
            </button>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}
        {deleteError && (
          <p style={{ ...S.error, backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem" }}>
            ⚠ {deleteError}
          </p>
        )}

        {/* Team athlete results */}
        {selectedTeamId && (
          <>
            {loadingAthletes && <p className="muted">Carregando atletas...</p>}
            {!loadingAthletes && filteredTeamAthletes.length === 0 && (
              <p className="muted">{teamAthletes.length === 0 ? "Nenhum atleta ativo neste time." : "Nenhum atleta encontrado para o filtro."}</p>
            )}
            {!loadingAthletes && filteredTeamAthletes.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th >Foto</th>
                      <th >Nome</th>
                      <th >Apelido</th>
                      <th >Posição</th>
                      <th >N° Camisa</th>
                      <th >Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeamAthletes.map((a) => (
                      <tr key={a.id} >
                        <td >
                          <img
                            src={a.athlete_photo_url ?? NO_PHOTO}
                            alt={a.athlete_name ?? ""}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_PHOTO; }}
                            className="avatar"
                          />
                        </td>
                        <td >
                          <Link to={`/atletas/${a.athlete_id}`} className="row-link">{a.athlete_name ?? "?"}</Link>
                        </td>
                        <td className="td-muted">{a.athlete_nickname ?? "—"}</td>
                        <td className="td-muted">{a.athlete_position ?? "—"}</td>
                        <td className="td-muted">{a.jersey_number ?? "—"}</td>
                        <td >
                          <div className="td-action">
                            <Link to={`/admin/atletas/${a.athlete_id}/editar`} className="btn-edit">Editar</Link>
                            <Link to={`/admin/atletas/${a.athlete_id}/times`} className="btn btn-secondary">Times</Link>
                            <Link to={`/admin/atletas/${a.athlete_id}/ligas`} className="btn btn-secondary">Ligas</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Text search results (when no team selected) */}
        {!selectedTeamId && (
          <>
            {!searched && !isLeagueAdmin && <p className="muted">Selecione um time nos filtros acima, ou busque por nome.</p>}
            {!searched && isLeagueAdmin && !selectedTeamId && <p className="muted">Selecione um time para ver os atletas.</p>}
            {searched && !loading && results?.length === 0 && (
              <p className="muted">Nenhum atleta encontrado para "{query}".</p>
            )}
            {results && results.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th >Foto</th>
                      <th >Nome</th>
                      <th >Apelido</th>
                      <th >Posição</th>
                      <th >CPF</th>
                      <th >RG</th>
                      <th >Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((a) => (
                      <tr key={a.id} >
                        <td >
                          <img
                            src={a.photo_url ?? NO_PHOTO}
                            alt={a.name}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_PHOTO; }}
                            className="avatar"
                          />
                        </td>
                        <td >
                          <Link to={`/atletas/${a.id}`} className="row-link">{a.name}</Link>
                        </td>
                        <td className="td-muted">{a.nickname ?? "—"}</td>
                        <td className="td-muted">{a.position ?? "—"}</td>
                        <td className="td-muted">{a.cpf ?? "—"}</td>
                        <td className="td-muted">{a.rg ?? "—"}</td>
                        <td >
                          <div className="td-action">
                            <Link to={`/admin/atletas/${a.id}/editar`} state={{ athlete: a }} className="btn-edit">Editar</Link>
                            <Link to={`/admin/atletas/${a.id}/times`} className="btn btn-secondary">Times</Link>
                            <Link to={`/admin/atletas/${a.id}/ligas`} className="btn btn-secondary">Ligas</Link>
                            <button
                              onClick={() => handleDelete(a)}
                              disabled={deletingId === a.id}
                              className="btn btn-danger"
                            >
                              {deletingId === a.id ? "…" : "Excluir"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #a6e3a1, #89b4fa)" },
  heroInner: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  heroRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  btnNew: { backgroundColor: "#a6e3a1", borderRadius: "6px", color: "#11111b", fontSize: "0.875rem", fontWeight: 700, padding: "0.5rem 1.1rem", textDecoration: "none", whiteSpace: "nowrap" },
  page: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  toolbar: { display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" },
  filterSelect: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.55rem 0.75rem", outline: "none", minWidth: "150px" },
  searchWrap: { display: "flex", gap: "0.5rem", marginBottom: "1.25rem" },
  searchInput: { flex: 1, backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.9rem", outline: "none" },
  searchBtn: { backgroundColor: "#89b4fa", border: "none", borderRadius: "6px", color: "#11111b", fontWeight: 700, fontSize: "0.875rem", padding: "0.55rem 1.2rem", cursor: "pointer", whiteSpace: "nowrap" },
  hint: { color: "#ffffff", fontSize: "0.9rem" },
  error: { color: "#f38ba8", fontSize: "0.9rem" },
  tableWrap: { overflowX: "auto", borderRadius: "8px", border: "1px solid #313244" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: { backgroundColor: "#18265b", color: "#cdd6f4", fontWeight: 600, fontSize: "0.84rem", textAlign: "left", padding: "0.75rem 1rem", borderBottom: "1px solid #313244", whiteSpace: "nowrap" },
  trRow: { borderBottom: "1px solid #18265b" },
  td: { padding: "0.65rem 1rem", color: "#cdd6f4", verticalAlign: "middle" },
  tdMuted: { padding: "0.65rem 1rem", color: "#ffffff", fontSize: "0.85rem", verticalAlign: "middle" },
  rowLink: { color: "#89b4fa", textDecoration: "none", fontWeight: 500 },
  thumb: { width: 32, height: 32, objectFit: "cover", borderRadius: "50%", border: "1px solid #313244", display: "block" },
  actionGroup: { display: "flex", gap: "0.4rem", flexWrap: "wrap" },
  btnEdit: { fontSize: "0.78rem", fontWeight: 600, backgroundColor: "#cba6f7", color: "#11111b", borderRadius: "5px", padding: "0.2rem 0.6rem", textDecoration: "none" },
  btnSec: { fontSize: "0.78rem", fontWeight: 600, backgroundColor: "#313244", color: "#cdd6f4", borderRadius: "5px", padding: "0.2rem 0.6rem", textDecoration: "none" },
  btnDelete: { fontSize: "0.78rem", fontWeight: 600, backgroundColor: "#f38ba8", color: "#11111b", borderRadius: "5px", padding: "0.2rem 0.6rem", border: "none", cursor: "pointer" },
};
