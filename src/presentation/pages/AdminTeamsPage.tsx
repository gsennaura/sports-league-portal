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
            <Link to="/admin/times/novo" style={S.btnNew}>+ Novo time</Link>
          </div>
        </div>
      </header>

      <main className="page-container">
        <div style={S.toolbar}>
          <select
            style={S.filterSelect}
            value={selectedLeagueId}
            onChange={(e) => { setSelectedLeagueId(e.target.value); setSelectedSport(""); setSelectedCategory(""); setPage(1); }}
            disabled={isLeagueAdmin && !isAdmin && allLeagues.length <= 1}
          >
            {!isLeagueAdmin && <option value="">Todas as ligas</option>}
            {allLeagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select
            style={S.filterSelect}
            value={selectedSport}
            onChange={(e) => { setSelectedSport(e.target.value); setSelectedCategory(""); setPage(1); }}
          >
            <option value="">Todos os esportes</option>
            {availableSports.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            style={S.filterSelect}
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          >
            <option value="">Todas as categorias</option>
            {availableCategories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
          </select>
          <input
            style={S.search}
            type="search"
            placeholder="Buscar por nome, cidade, clube ou esporte..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        {loading && <p style={S.hint}>Carregando...</p>}
        {error && <p style={S.errorText}>Erro: {error}</p>}

        {!loading && !error && (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={S.th}>Nome</th>
                    <th style={S.th}>Categoria</th>
                    <th style={S.th}>Esporte</th>
                    <th style={S.th}>Cidade</th>
                    <th style={S.th}>Clube</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {slice.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={S.empty}>
                        {isLeagueAdmin && !selectedLeagueId
                          ? "Selecione uma liga para ver os times."
                          : search || selectedSport || selectedCategory
                            ? "Nenhum time encontrado para os filtros aplicados."
                            : "Nenhum time encontrado nesta liga."}
                      </td>
                    </tr>
                  ) : (
                    slice.map((t) => (
                      <tr key={t.id} style={S.trRow}>
                        <td style={S.td}>
                          <Link to={`/times/${toSlugPath(t.name, t.id)}`} style={S.teamLink}>{t.name}</Link>
                        </td>
                        <td style={S.td}>
                          {t.category
                            ? <span style={S.catBadge}>{CATEGORY_LABEL[t.category] ?? t.category}</span>
                            : "—"}
                        </td>
                        <td style={S.tdMuted}>{t.sport_name ?? "—"}</td>
                        <td style={S.tdMuted}>{t.city_name}</td>
                        <td style={S.td}>
                          {t.club_name
                            ? <span style={S.clubBadge}>{t.club_name}</span>
                            : <span style={S.noClub}>Sem clube</span>}
                        </td>
                        <td style={S.tdAction}>
                          <Link to={`/admin/times/${t.id}/editar`} style={S.btnEdit}>✎ Editar</Link>
                          <button style={S.btnDelete} onClick={() => { setDeleteError(null); setConfirmDelete({ id: t.id, name: t.name }); }}>✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={S.footer}>
              <span style={S.count}>
                {filtered.length} time{filtered.length !== 1 ? "s" : ""}
                {search && ` encontrado${filtered.length !== 1 ? "s" : ""}`}
              </span>
              {totalPages > 1 && (
                <div style={S.pagination}>
                  <button
                    style={S.pageBtn}
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >‹</button>
                  <span style={S.pageInfo}>{page} / {totalPages}</span>
                  <button
                    style={S.pageBtn}
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
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3 style={S.modalTitle}>Excluir time</h3>
            <p style={S.modalText}>Tem certeza que deseja excluir <strong>{confirmDelete.name}</strong>?</p>
            <p style={S.modalHint}>Esta ação não pode ser desfeita. Times com partidas registradas não podem ser excluídos.</p>
            {deleteError && <p style={S.modalError}>{deleteError}</p>}
            <div style={S.modalActions}>
              <button style={S.btnConfirmDel} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
              <button style={S.btnModalCancel} onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #89b4fa, #a6e3a1)" },
  heroInner: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  heroRow: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  subtitle: { color: "#cdd6f4", fontSize: "0.875rem", margin: "0.2rem 0 0" },
  btnNew: { backgroundColor: "#a6e3a1", color: "#11111b", fontWeight: 700, fontSize: "0.875rem", padding: "0.5rem 1.1rem", borderRadius: "7px", textDecoration: "none", whiteSpace: "nowrap" },

  page: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  toolbar: { marginBottom: "1.25rem", display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" },
  filterSelect: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "7px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.55rem 0.75rem", outline: "none", minWidth: "160px" },
  search: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "7px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.55rem 1rem", minWidth: "240px", flex: 1, outline: "none", boxSizing: "border-box" },
  hint: { color: "#cdd6f4", fontSize: "0.875rem" },
  errorText: { color: "#f38ba8", fontSize: "0.875rem" },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", backgroundColor: "#18265b", borderRadius: "10px", overflow: "hidden" },
  th: { padding: "0.8rem 1rem", textAlign: "left", color: "#cdd6f4", fontSize: "0.84rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: "#18265b", borderBottom: "1px solid #313244", whiteSpace: "nowrap" },
  trRow: { borderBottom: "1px solid #313244" },
  td: { padding: "0.75rem 1rem", color: "#cdd6f4", verticalAlign: "middle" },
  tdMuted: { padding: "0.75rem 1rem", color: "#cdd6f4", verticalAlign: "middle" },
  empty: { padding: "2rem", textAlign: "center", color: "#cdd6f4" },

  teamLink: { color: "#89b4fa", textDecoration: "none", fontWeight: 500 },
  clubBadge: { backgroundColor: "#1a2233", border: "1px solid #2a4a6a", borderRadius: "4px", color: "#89b4fa", padding: "0.15rem 0.55rem", fontSize: "0.83rem", fontWeight: 500 },
  noClub: { color: "#cdd6f4", fontSize: "0.85rem", fontStyle: "italic" },
  catBadge: { backgroundColor: "#201a2a", border: "1px solid #4a2a6a", borderRadius: "4px", color: "#cba6f7", padding: "0.15rem 0.55rem", fontSize: "0.83rem", fontWeight: 500 },
  tdAction: { padding: "0.6rem 0.75rem", verticalAlign: "middle", textAlign: "right", whiteSpace: "nowrap" },
  btnEdit: { color: "#89b4fa", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500, padding: "0.3rem 0.7rem", border: "1px solid #313244", borderRadius: "5px", whiteSpace: "nowrap" },
  btnDelete: { background: "none", border: "1px solid #5a2a30", borderRadius: "5px", color: "#f38ba8", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, padding: "0.3rem 0.6rem", marginLeft: "0.4rem" },

  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "12px", padding: "1.75rem 2rem", maxWidth: "420px", width: "90%" },
  modalTitle: { color: "#f38ba8", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.75rem" },
  modalText: { color: "#cdd6f4", fontSize: "0.95rem", margin: "0 0 0.5rem" },
  modalHint: { color: "#cdd6f4", fontSize: "0.82rem", margin: "0 0 1rem", fontStyle: "italic" },
  modalError: { color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "0.85rem", margin: "0 0 1rem" },
  modalActions: { display: "flex", gap: "0.75rem" },
  btnConfirmDel: { backgroundColor: "#f38ba8", border: "none", borderRadius: "7px", color: "#11111b", cursor: "pointer", fontSize: "0.875rem", fontWeight: 700, padding: "0.5rem 1.25rem" },
  btnModalCancel: { background: "none", border: "1px solid #313244", borderRadius: "7px", color: "#cdd6f4", cursor: "pointer", fontSize: "0.875rem", padding: "0.5rem 1.25rem" },

  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem" },
  count: { color: "#cdd6f4", fontSize: "0.85rem" },
  pagination: { display: "flex", alignItems: "center", gap: "0.5rem" },
  pageBtn: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "5px", color: "#cdd6f4", cursor: "pointer", fontSize: "1rem", padding: "0.3rem 0.65rem" },
  pageInfo: { color: "#cdd6f4", fontSize: "0.85rem" },
};
