import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toSlugPath } from "@utils/slug";
import type { ListTeams } from "@application/use_cases/ListTeams";
import type { DeleteTeam } from "@application/use_cases/DeleteTeam";
import type { Team } from "@domain/entities/Team";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";
import { useAuth } from "@presentation/context/AuthContext";

const PAGE_SIZE = 20;

const CATEGORY_LABEL: Record<string, string> = {
  amador: "Amador",
  profissional: "Profissional",
  base: "Base",
  junior: "Júnior",
  juvenil: "Juvenil",
  infantil: "Infantil",
  mirim: "Mirim",
  "pre-mirim": "Pré-Mirim",
  master: "Master",
  universitaria: "Universitária",
  rural: "Rural",
  "inter-municipal": "Inter-municipal",
};

interface Props {
  listTeams: ListTeams;
  deleteTeam: DeleteTeam;
}

export function AdminTeamsPage({ listTeams, deleteTeam }: Props) {
  const { isAdmin, isLeagueAdmin, leagueAdminProfiles } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // League / sport / category filters
  const [allLeagues, setAllLeagues] = useState<{ id: string; name: string }[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [leagueClubIds, setLeagueClubIds] = useState<Set<string>>(new Set());
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    listTeams
      .execute()
      .then((data) => setTeams(data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

  // Load club IDs for selected league
  useEffect(() => {
    if (!selectedLeagueId) { setLeagueClubIds(new Set()); return; }
    fetch(`${API_BASE}/leagues/${selectedLeagueId}/clubs`, { headers: authHeaders() })
      .then((r) => r.json() as Promise<{ club_id: string }[]>)
      .then((rows) => setLeagueClubIds(new Set(rows.map((r) => r.club_id))))
      .catch(() => setLeagueClubIds(new Set()));
  }, [selectedLeagueId]);

  // Apply cascade filters
  const leagueFiltered = selectedLeagueId
    ? teams.filter((t) => t.club_id != null && leagueClubIds.has(t.club_id))
    : isLeagueAdmin && !isAdmin ? [] : teams;

  const availableSports = [...new Set(leagueFiltered.map((t) => t.sport_name).filter(Boolean))].sort() as string[];
  const availableCategories = [...new Set(leagueFiltered.map((t) => t.category).filter(Boolean))].sort() as string[];

  const filtered = leagueFiltered.filter((t) => {
    if (selectedSport && t.sport_name !== selectedSport) return false;
    if (selectedCategory && t.category !== selectedCategory) return false;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.city_name ?? "").toLowerCase().includes(q) ||
      (t.club_name ?? "").toLowerCase().includes(q) ||
      (t.sport_name ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTeam.execute(confirmDelete.id);
      setTeams((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <div className="hero__row">
            <div>
              <h1 className="page-title">Times</h1>
              <p className="page-subtitle">Gerenciamento de equipes</p>
            </div>
            <Link to="/admin/times/novo" className="btn btn-success">+ Novo time</Link>
          </div>
        </div>
      </header>

      <main className="page-container">
        <div className="toolbar">
          <select
            className="filter-select"
            value={selectedLeagueId}
            onChange={(e) => { setSelectedLeagueId(e.target.value); setSelectedSport(""); setSelectedCategory(""); setPage(1); }}
            disabled={isLeagueAdmin && !isAdmin && allLeagues.length <= 1}
          >
            {!isLeagueAdmin && <option value="">Todas as ligas</option>}
            {allLeagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select
            className="filter-select"
            value={selectedSport}
            onChange={(e) => { setSelectedSport(e.target.value); setSelectedCategory(""); setPage(1); }}
          >
            <option value="">Todos os esportes</option>
            {availableSports.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          >
            <option value="">Todas as categorias</option>
            {availableCategories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
          </select>
          <input
            className="search-wrap"
            type="search"
            placeholder="Buscar por nome, cidade, clube ou esporte..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        {loading && <p className="muted">Carregando...</p>}
        {error && <p className="error-text">Erro: {error}</p>}

        {!loading && !error && (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th >Nome</th>
                    <th >Categoria</th>
                    <th >Esporte</th>
                    <th >Cidade</th>
                    <th >Clube</th>
                    <th ></th>
                  </tr>
                </thead>
                <tbody>
                  {slice.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        {isLeagueAdmin && !selectedLeagueId
                          ? "Selecione uma liga para ver os times."
                          : search || selectedSport || selectedCategory
                            ? "Nenhum time encontrado para os filtros aplicados."
                            : "Nenhum time encontrado nesta liga."}
                      </td>
                    </tr>
                  ) : (
                    slice.map((t) => (
                      <tr key={t.id} >
                        <td >
                          <Link to={`/times/${toSlugPath(t.name, t.id)}`} className="row-link">{t.name}</Link>
                        </td>
                        <td >
                          {t.category
                            ? <span className="badge">{CATEGORY_LABEL[t.category] ?? t.category}</span>
                            : "—"}
                        </td>
                        <td className="td-muted">{t.sport_name ?? "—"}</td>
                        <td className="td-muted">{t.city_name}</td>
                        <td >
                          {t.club_name
                            ? <span className="badge">{t.club_name}</span>
                            : <span className="muted">Sem clube</span>}
                        </td>
                        <td className="td-action">
                          <Link to={`/admin/times/${t.id}/editar`} className="btn-edit">✎ Editar</Link>
                          <button className="btn btn-danger" onClick={() => { setDeleteError(null); setConfirmDelete({ id: t.id, name: t.name }); }}>✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div >
              <span className="page-info">
                {filtered.length} time{filtered.length !== 1 ? "s" : ""}
                {search && ` encontrado${filtered.length !== 1 ? "s" : ""}`}
              </span>
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >‹</button>
                  <span className="page-info">{page} / {totalPages}</span>
                  <button
                    className="page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >›</button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Excluir time</h3>
            <p className="modal-body">Tem certeza que deseja excluir <strong>{confirmDelete.name}</strong>?</p>
            <p className="muted">Esta ação não pode ser desfeita. Times com partidas registradas não podem ser excluídos.</p>
            {deleteError && <p className="form-error">{deleteError}</p>}
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

