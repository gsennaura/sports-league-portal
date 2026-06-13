import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";
import { useAuth } from "@presentation/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingMembership {
  id: string;
  athlete_id: string;
  team_id: string;
  membership_status: string;
  requested_by: string;
  is_active: boolean;
  athlete_name?: string | null;
  athlete_nickname?: string | null;
  athlete_position?: string | null;
  team_name?: string | null;
  team_sport_name?: string | null;
  team_category?: string | null;
  team_league_name?: string | null;
}

interface AthleteDetail {
  id: string;
  name: string;
  nickname: string | null;
  position: string | null;
  preferred_foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  photo_url: string | null;
}

interface RichTeam {
  id: string;
  name: string;
  sport_id: string;
  club_id: string | null;
  category: string | null;
  league_id: string | null;
}

interface SportOpt { id: string; name: string; }
interface LeagueOpt { id: string; name: string; }

interface EditForm {
  name: string;
  nickname: string;
  position: string;
  preferred_foot: string;
  height_cm: string;
  weight_kg: string;
  photo_url: string;
  new_team_id: string;
  new_team_name: string;
}

const POSITION_OPTIONS = [
  "", "Goleiro", "Lateral Direito", "Lateral Esquerdo", "Zagueiro",
  "Volante", "Meia", "Ponta Direita", "Ponta Esquerda", "Centroavante",
];

const FOOT_OPTIONS = [
  { value: "", label: "Selecione..." },
  { value: "Direito", label: "Direito" },
  { value: "Esquerdo", label: "Esquerdo" },
  { value: "Ambidestro", label: "Ambidestro" },
];

const CATEGORY_LABEL: Record<string, string> = {
  amador: "Amador", profissional: "Profissional", base: "Base",
  junior: "Júnior", juvenil: "Juvenil", infantil: "Infantil",
  mirim: "Mirim", "pre-mirim": "Pré-Mirim", master: "Master",
  universitaria: "Universitária", terrao: "Terrão",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminMembershipPendingPage() {
  const { isLeagueAdmin, leagueAdminProfiles } = useAuth();
  const [items, setItems] = useState<PendingMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterLeague, setFilterLeague] = useState("");

  // Edit modal
  const [editMembership, setEditMembership] = useState<PendingMembership | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Teams / Sports / Leagues for edit cascade
  const [allTeams, setAllTeams] = useState<RichTeam[]>([]);
  const [allSports, setAllSports] = useState<SportOpt[]>([]);
  const [allLeagues, setAllLeagues] = useState<LeagueOpt[]>([]);

  // Edit modal cascade selections
  const [editLeagueId, setEditLeagueId] = useState("");
  const [editSportId, setEditSportId] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Per-row approve/reject action dropdown
  const [rowActions, setRowActions] = useState<Record<string, "approve" | "reject" | "">>({});

  const fetchPending = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/memberships/pending`, { headers: authHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar pendências.");
        return r.json() as Promise<PendingMembership[]>;
      })
      .then(setItems)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const leagueAdminMode = isLeagueAdmin;
    const myIds = leagueAdminProfiles.filter(p => p.is_active).map(p => p.league_id);
    fetchPending();
    Promise.all([
      fetch(`${API_BASE}/teams`).then(r => r.json() as Promise<RichTeam[]>),
      fetch(`${API_BASE}/sports`).then(r => r.json() as Promise<SportOpt[]>),
      fetch(`${API_BASE}/leagues?`).then(r => r.json() as Promise<LeagueOpt[]>),
    ]).then(([teams, sports, leagues]) => {
      setAllTeams(teams);
      setAllSports(sports.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      const visible = leagueAdminMode ? leagues.filter(l => myIds.includes(l.id)) : leagues;
      setAllLeagues(visible.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    }).catch(() => {});
  }, [fetchPending]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select the single league for league_admin
  useEffect(() => {
    if (isLeagueAdmin && !filterLeague) {
      const derived = [...new Set(items.map((m) => m.team_league_name).filter(Boolean))] as string[];
      if (derived.length === 1) setFilterLeague(derived[0]);
    }
  }, [items, isLeagueAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived filter options ─────────────────────────────────────────────────

  const sports = [...new Set(items.map((m) => m.team_sport_name).filter(Boolean))].sort() as string[];
  const categories = [...new Set(items.map((m) => m.team_category).filter(Boolean))].sort() as string[];
  const teams = [...new Set(items.map((m) => m.team_name).filter(Boolean))].sort() as string[];
  const leagues = [...new Set(items.map((m) => m.team_league_name).filter(Boolean))].sort() as string[];

  const filtered = items.filter((m) => {
    const q = search.toLowerCase();
    if (q && !(m.athlete_name ?? "").toLowerCase().includes(q)) return false;
    if (filterSport && m.team_sport_name !== filterSport) return false;
    if (filterCategory && m.team_category !== filterCategory) return false;
    if (filterTeam && m.team_name !== filterTeam) return false;
    if (filterLeague && m.team_league_name !== filterLeague) return false;
    return true;
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  async function doAction(id: string, action: "approve" | "reject") {
    setActioning(id);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/memberships/${id}/${action}`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? "Erro na operação.");
      }
      setItems((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na operação.");
    } finally {
      setActioning(null);
    }
  }

  async function openEdit(m: PendingMembership) {
    setEditMembership(m);
    setEditForm(null);
    setEditError(null);
    setEditLoading(true);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    // Pre-fill cascade from existing team
    const existingTeam = allTeams.find(t => t.id === m.team_id);
    const myIds = leagueAdminProfiles.filter(p => p.is_active).map(p => p.league_id);
    const league = existingTeam?.league_id ?? (isLeagueAdmin && myIds.length === 1 ? myIds[0] : "");
    setEditLeagueId(league);
    setEditSportId(existingTeam?.sport_id ?? "");
    setEditCategory(existingTeam?.category ?? "");
    try {
      const resp = await fetch(`${API_BASE}/athletes/${m.athlete_id}`, { headers: authHeaders() });
      if (!resp.ok) throw new Error("Erro ao carregar dados do atleta.");
      const detail = await resp.json() as { athlete: AthleteDetail };
      const a = detail.athlete;
      setPhotoPreviewUrl(a.photo_url ?? null);
      setEditForm({
        name: a.name,
        nickname: a.nickname ?? "",
        position: a.position ?? "",
        preferred_foot: a.preferred_foot ?? "",
        height_cm: a.height_cm != null ? String(a.height_cm) : "",
        weight_kg: a.weight_kg != null ? String(a.weight_kg) : "",
        photo_url: a.photo_url ?? "",
        new_team_id: m.team_id,
        new_team_name: m.team_name ?? "",
      });
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!editMembership || !editForm) return;
    setEditSaving(true);
    setEditError(null);
    try {
      // 0. Upload photo if a new file was selected
      let finalPhotoUrl = editForm.photo_url.trim() || null;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const pResp = await fetch(`${API_BASE}/athletes/${editMembership.athlete_id}/photo`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
        if (!pResp.ok) {
          const err = await pResp.json().catch(() => ({})) as { detail?: string };
          throw new Error(err.detail ?? "Erro ao enviar foto.");
        }
        const pData = await pResp.json() as { photo_url: string };
        finalPhotoUrl = pData.photo_url;
      }
      // 1. Change team if needed
      if (editForm.new_team_id !== editMembership.team_id) {
        const tResp = await fetch(`${API_BASE}/memberships/${editMembership.id}/team`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ team_id: editForm.new_team_id }),
        });
        if (!tResp.ok) {
          const err = await tResp.json().catch(() => ({})) as { detail?: string };
          throw new Error(err.detail ?? "Erro ao alterar time.");
        }
        const updated = await tResp.json() as PendingMembership;
        setItems((prev) =>
          prev.map((m) => m.id === editMembership.id ? { ...m, ...updated } : m)
        );
      }

      // 2. Save athlete data
      const resp = await fetch(`${API_BASE}/athletes/${editMembership.athlete_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: editForm.name.trim(),
          nickname: editForm.nickname.trim() || null,
          position: editForm.position || null,
          preferred_foot: editForm.preferred_foot || null,
          height_cm: editForm.height_cm ? parseInt(editForm.height_cm, 10) : null,
          weight_kg: editForm.weight_kg ? parseFloat(editForm.weight_kg) : null,
          photo_url: finalPhotoUrl,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? "Erro ao salvar.");
      }
      setItems((prev) =>
        prev.map((m) =>
          m.athlete_id === editMembership.athlete_id
            ? { ...m, athlete_name: editForm.name.trim() }
            : m
        )
      );
      setEditMembership(null);
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setEditSaving(false);
    }
  }

  // ── Cascade derived values for edit modal ────────────────────────────────

  const teamsInLeague = editLeagueId
    ? allTeams.filter(t => t.league_id === editLeagueId)
    : allTeams;

  const teamsInSport = editSportId
    ? teamsInLeague.filter(t => t.sport_id === editSportId)
    : teamsInLeague;

  const editFinalTeams = editCategory
    ? teamsInSport.filter(t => t.category === editCategory).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    : teamsInSport.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="page-container">
        <div className="page-container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h2 style={{ ...S.title, margin: 0 }}>Pendências de vínculo</h2>
            <Link
              to="/admin/atletas/novo"
              style={{ background: "var(--c-action)", color: "var(--c-brand)", border: "none", borderRadius: 8, padding: "0.45rem 1rem", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", whiteSpace: "nowrap" }}
            >
              + Novo atleta
            </Link>
          </div>
          <p className="muted">
            Atletas aguardando aprovação de vínculo com um time.
            {items.length > 0 && ` (${items.length} total)`}
          </p>

          {/* ── Filters ── */}
          <div className="filter-bar">
            <input
              className="search-input"
              type="search"
              placeholder="Buscar por nome do atleta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="form-select" value={filterLeague} onChange={(e) => setFilterLeague(e.target.value)} disabled={isLeagueAdmin && leagues.length <= 1}>
              <option value="">Todas as ligas</option>
              {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="form-select" value={filterSport} onChange={(e) => setFilterSport(e.target.value)}>
              <option value="">Todos os esportes</option>
              {sports.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
            </select>
            <select className="form-select" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
              <option value="">Todos os times</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {error && <p className="error-text">{error}</p>}
          {loading && <p className="muted">Carregando…</p>}

          {!loading && filtered.length === 0 && (
            <div className="muted">
              <p>{items.length === 0 ? "Nenhuma solicitação pendente" : "Nenhum resultado para os filtros aplicados"}</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="table-wrap">
              <table className="data-table pending-table">
                <thead>
                  <tr>
                    <th >Nome</th>
                    <th  className="pending-col-hide-mobile">Apelido</th>
                    <th >Posição</th>
                    <th >Time</th>
                    <th style={{ textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} >
                      <td >{m.athlete_name ?? "—"}</td>
                      <td style={{ color: "#ffffff" }} className="pending-col-hide-mobile">{m.athlete_nickname ?? "—"}</td>
                      <td style={{ color: "#ffffff" }}>{m.athlete_position ?? "—"}</td>
                      <td >
                        <span >{m.team_name ?? "—"}</span>
                        {m.team_sport_name && <span className="badge">{m.team_sport_name}</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="td-action">
                          <select
                            className="form-select"
                            value={rowActions[m.id] ?? ""}
                            disabled={actioning === m.id}
                            onChange={(e) =>
                              setRowActions(prev => ({ ...prev, [m.id]: e.target.value as "approve" | "reject" | "" }))
                            }
                          >
                            <option value="">Selecione ação...</option>
                            <option value="approve">✓ Aprovar</option>
                            <option value="reject">✗ Rejeitar</option>
                          </select>
                          <button
                            style={{
                              ...S.btnConfirm,
                              ...(rowActions[m.id] === "approve"
                                ? { background: "var(--c-positive)" }
                                : rowActions[m.id] === "reject"
                                ? { background: "#f38ba8" }
                                : { opacity: 0.4, cursor: "not-allowed" }),
                            }}
                            disabled={!rowActions[m.id] || actioning === m.id}
                            onClick={() => {
                              if (rowActions[m.id])
                                doAction(m.id, rowActions[m.id] as "approve" | "reject");
                            }}
                          >
                            {actioning === m.id ? "…" : "Confirmar"}
                          </button>
                          <button
                            title="Editar atleta"
                            className="btn-edit"
                            onClick={() => openEdit(m)}
                          >
                            ✎
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editMembership && (
        <div className="modal-overlay" onClick={() => setEditMembership(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Editar atleta</h3>
            <p className="muted">
              Solicitação de vínculo com <strong>{editMembership.team_name ?? editMembership.team_id}</strong>
            </p>

            {editError && <p className="error-text">{editError}</p>}
            {editLoading && <p className="muted">Carregando dados...</p>}

            {editForm && (
              <>
                <div className="form-field-group">
                  <label className="form-label">Nome *</label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Apelido</label>
                  <input
                    className="form-input"
                    value={editForm.nickname}
                    onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  />
                </div>

                <div className="form-field-group--2">
                  <div className="form-field-group">
                    <label className="form-label">Posição</label>
                    <select className="form-input" value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}>
                      {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p || "Selecione..."}</option>)}
                    </select>
                  </div>
                  <div className="form-field-group">
                    <label className="form-label">Pé dominante</label>
                    <select className="form-input" value={editForm.preferred_foot} onChange={(e) => setEditForm({ ...editForm, preferred_foot: e.target.value })}>
                      {FOOT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-field-group--2">
                  <div className="form-field-group">
                    <label className="form-label">Altura (cm)</label>
                    <input className="form-input" type="number" min={100} max={250} value={editForm.height_cm} onChange={(e) => setEditForm({ ...editForm, height_cm: e.target.value })} />
                  </div>
                  <div className="form-field-group">
                    <label className="form-label">Peso (kg)</label>
                    <input className="form-input" type="number" min={30} max={200} step={0.1} value={editForm.weight_kg} onChange={(e) => setEditForm({ ...editForm, weight_kg: e.target.value })} />
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Foto</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {(photoPreviewUrl || editForm.photo_url) && (
                      <img
                        src={photoPreviewUrl ?? editForm.photo_url}
                        alt="Foto do atleta"
                        style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #45475a" }}
                      />
                    )}
                    <label className="btn btn-secondary" htmlFor="athlete-photo-input">
                      {photoFile ? `📷 ${photoFile.name}` : "📷 Escolher foto"}
                    </label>
                    <input
                      id="athlete-photo-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setPhotoFile(f);
                        if (f) setPhotoPreviewUrl(URL.createObjectURL(f));
                      }}
                    />
                  </div>
                </div>

                <div style={{ ...S.fieldGroup, marginTop: "0.5rem" }}>
                  <label style={{ ...S.label, fontWeight: 600, color: "var(--c-action)", marginBottom: 8 }}>Time da solicitação</label>

                  {/* Liga */}
                  <div className="form-field-group">
                    <label className="form-label">Liga</label>
                    <select
                      style={{ ...S.input, ...(isLeagueAdmin && allLeagues.length <= 1 ? { opacity: 0.7, cursor: "not-allowed" } : {}) }}
                      value={editLeagueId}
                      disabled={isLeagueAdmin && allLeagues.length <= 1}
                      onChange={(e) => {
                        setEditLeagueId(e.target.value);
                        setEditSportId("");
                        setEditCategory("");
                        setEditForm(f => f ? { ...f, new_team_id: "", new_team_name: "" } : f);
                      }}
                    >
                      <option value="">— Selecione uma liga —</option>
                      {allLeagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  {/* Esporte */}
                  <div className="form-field-group">
                    <label className="form-label">Esporte</label>
                    <select
                      className="form-input" style={{ opacity: !editLeagueId ? 0.5 : 1 }}
                      value={editSportId}
                      disabled={!editLeagueId}
                      onChange={(e) => {
                        setEditSportId(e.target.value);
                        setEditCategory("");
                        setEditForm(f => f ? { ...f, new_team_id: "", new_team_name: "" } : f);
                      }}
                    >
                      <option value="">— Selecione um esporte —</option>
                      {teamsInLeague
                        .map(t => t.sport_id)
                        .filter((id, i, arr) => arr.indexOf(id) === i)
                        .map(sid => {
                          const sport = allSports.find(s => s.id === sid);
                          return sport ? <option key={sid} value={sid}>{sport.name}</option> : null;
                        })}
                    </select>
                  </div>

                  {/* Categoria */}
                  <div className="form-field-group">
                    <label className="form-label">Categoria</label>
                    <select
                      className="form-input" style={{ opacity: !editSportId ? 0.5 : 1 }}
                      value={editCategory}
                      disabled={!editSportId}
                      onChange={(e) => {
                        setEditCategory(e.target.value);
                        setEditForm(f => f ? { ...f, new_team_id: "", new_team_name: "" } : f);
                      }}
                    >
                      <option value="">— Selecione uma categoria —</option>
                      {[...new Set(teamsInSport.map(t => t.category).filter(Boolean))].sort().map(cat => (
                        <option key={cat} value={cat!}>{CATEGORY_LABEL[cat!] ?? cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Time */}
                  <div className="form-field-group">
                    <label className="form-label">Time</label>
                    <select
                      className="form-input" style={{ opacity: !editCategory ? 0.5 : 1 }}
                      value={editForm.new_team_id}
                      disabled={!editCategory}
                      onChange={(e) => {
                        const t = editFinalTeams.find(t => t.id === e.target.value);
                        setEditForm(f => f ? { ...f, new_team_id: e.target.value, new_team_name: t?.name ?? "" } : f);
                      }}
                    >
                      <option value="">— Selecione um time —</option>
                      {editFinalTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {editForm.new_team_id !== editMembership.team_id && editForm.new_team_id && (
                    <p className="form-warning">
                      ⚠ Time alterado para: <strong>{editForm.new_team_name || editForm.new_team_id}</strong>
                    </p>
                  )}
                </div>

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setEditMembership(null)} disabled={editSaving}>Cancelar</button>
                  <button className="btn btn-primary" onClick={saveEdit} disabled={editSaving || !editForm.name.trim()}>
                    {editSaving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#18265b", color: "#cdd6f4", padding: "40px 16px 80px" },
  container: { maxWidth: 960, margin: "0 auto" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cba6f7", margin: "0 0 6px" },
  sub: { fontSize: ".9rem", color: "#ffffff", margin: "0 0 20px" },

  filters: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
  searchInput: {
    flex: "1 1 220px",
    background: "#313244", border: "1px solid #45475a", borderRadius: 8,
    color: "#cdd6f4", padding: ".45rem .75rem", fontSize: ".9rem", outline: "none",
  },
  select: {
    flex: "1 1 140px",
    background: "#313244", border: "1px solid #45475a", borderRadius: 8,
    color: "#cdd6f4", padding: ".45rem .6rem", fontSize: ".85rem", outline: "none", cursor: "pointer",
  },

  card: { background: "#313244", borderRadius: 12, padding: "16px 20px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  info: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  athleteName: { fontWeight: 700, color: "#89dceb", fontSize: "1rem" },
  arrow: { color: "#ffffff" },
  teamName: { fontWeight: 600, color: "#a6e3a1" },
  metaRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tag: { background: "#45475a", borderRadius: 20, padding: "2px 8px", fontSize: ".72rem", color: "#cdd6f4" },
  metaText: { fontSize: ".8rem", color: "#ffffff" },
  actions: { display: "flex", gap: 10 },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid #313244" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".875rem" },
  th: { background: "#18265b", color: "#ffffff", fontWeight: 600, padding: ".55rem .85rem", textAlign: "left", borderBottom: "1px solid #313244", whiteSpace: "nowrap" } as React.CSSProperties,
  tr: { borderBottom: "1px solid #313244" },
  td: { padding: ".55rem .85rem", color: "#cdd6f4", verticalAlign: "middle" } as React.CSSProperties,
  teamCell: { fontWeight: 600, color: "#a6e3a1", marginRight: 6 },
  actionGroup: { display: "flex", gap: 6, justifyContent: "center", alignItems: "center" },
  actionSelect: { background: "#313244", border: "1px solid #45475a", borderRadius: 8, color: "#cdd6f4", padding: ".3rem .5rem", fontSize: ".82rem", outline: "none", cursor: "pointer", width: 135 } as React.CSSProperties,
  btnConfirm: { padding: ".35rem .75rem", background: "#a6e3a1", color: "#18265b", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: ".82rem" } as React.CSSProperties,
  btnEdit: { width: 30, height: 30, background: "transparent", color: "#89b4fa", border: "1px solid #89b4fa", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties,

  error: { color: "#f38ba8", background: "rgba(243,139,168,.1)", border: "1px solid rgba(243,139,168,.3)", borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", marginBottom: 12 },
  msg: { color: "#ffffff" },
  empty: { background: "#313244", borderRadius: 12, padding: "32px", textAlign: "center", color: "#ffffff" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" },
  modal: { background: "#18265b", border: "1px solid #313244", borderRadius: 14, padding: "1.75rem", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { color: "#cba6f7", margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700 },
  modalSub: { color: "#ffffff", fontSize: ".85rem", margin: "0 0 1.25rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4, marginBottom: "0.9rem" },
  label: { color: "#ffffff", fontSize: ".82rem", fontWeight: 500 },
  input: { background: "#313244", border: "1px solid #45475a", borderRadius: 8, color: "#cdd6f4", padding: ".5rem .7rem", fontSize: ".9rem", outline: "none", width: "100%", boxSizing: "border-box" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "1rem" },
  btnCancel: { padding: ".5rem 1rem", background: "transparent", color: "#ffffff", border: "1px solid #45475a", borderRadius: 8, cursor: "pointer", fontSize: ".875rem" },
  btnSave: { padding: ".5rem 1.2rem", background: "#89b4fa", color: "#18265b", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: ".875rem" },
  btnUpload: { display: "inline-block", padding: ".45rem .9rem", background: "#313244", border: "1px solid #45475a", borderRadius: 8, color: "#89b4fa", cursor: "pointer", fontSize: ".85rem", fontWeight: 600 } as React.CSSProperties,
  teamList: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 160, overflowY: "auto", border: "1px solid #45475a", borderRadius: 8, background: "#18265b", padding: 4, marginTop: 4 },
  teamItem: { background: "none", border: "none", color: "#cdd6f4", padding: ".4rem .75rem", borderRadius: 6, cursor: "pointer", textAlign: "left", fontSize: ".88rem" },
  teamItemSelected: { background: "#313244", color: "#a6e3a1", fontWeight: 700 },
  teamChangeNotice: { margin: "4px 0 0", fontSize: ".8rem", color: "#f9e2af", background: "rgba(249,226,175,.1)", borderRadius: 6, padding: ".35rem .6rem" },
};
