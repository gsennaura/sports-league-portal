import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { UpdateTeam } from "@application/use_cases/UpdateTeam";
import type { GetTeamAthletes, AddAthleteToTeam, RemoveAthleteFromTeam } from "@application/use_cases/AthleteTeam";
import type { SearchAthletes } from "@application/use_cases/SearchAthletes";
import type { UpdateTeamPayload } from "@domain/repositories/TeamRepository";
import type { AthleteTeamHistory, Athlete } from "@domain/entities/Athlete";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

const CATEGORY_OPTIONS = [
  { value: "amador", label: "Amador" },
  { value: "terrao", label: "Terrão" },
  { value: "clube_social", label: "Clube Social" },
  { value: "profissional", label: "Profissional" },
  { value: "base", label: "Base / Formação" },
  { value: "junior", label: "Júnior" },
  { value: "juvenil", label: "Juvenil" },
  { value: "infantil", label: "Infantil" },
  { value: "mirim", label: "Mirim" },
  { value: "pre-mirim", label: "Pré-Mirim" },
  { value: "master", label: "Master" },
  { value: "universitaria", label: "Universitária" },
];

type Option = { id: string; name: string; nickname?: string | null };

type RawTeam = {
  id: string;
  name: string;
  sport_id: string;
  city_id: string;
  club_id: string | null;
  category: string | null;
};

interface Props {
  updateTeam: UpdateTeam;
  getTeamAthletes: GetTeamAthletes;
  addAthleteToTeam: AddAthleteToTeam;
  removeAthleteFromTeam: RemoveAthleteFromTeam;
  searchAthletes: SearchAthletes;
}

export function AdminTeamEditPage({ updateTeam, getTeamAthletes, addAthleteToTeam, removeAthleteFromTeam, searchAthletes: _searchAthletes }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"dados" | "atletas">("dados");

  // Form fields
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("");
  const [cityId, setCityId] = useState("");
  const [clubId, setClubId] = useState("");
  const [category, setCategory] = useState("");

  // Options
  const [sports, setSports] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Athletes tab
  const [athletes, setAthletes] = useState<AthleteTeamHistory[]>([]);
  const [athletesLoading, setAthletesLoading] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [athletesLoaded, setAthletesLoaded] = useState(false);
  const [athleteMap, setAthleteMap] = useState<Record<string, { name: string; nickname: string | null }>>({});
  // Add athlete modal — two-mode
  const [addMode, setAddMode] = useState<"choice" | "existing" | null>(null);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteSearchResults, setAthleteSearchResults] = useState<Athlete[]>([]);
  const [athleteSearchLoading, setAthleteSearchLoading] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedAthleteTeams, setSelectedAthleteTeams] = useState<{ team_id: string; team_name: string | null; start_date: string; team_sport_name: string | null }[]>([]);
  const [addAthleteStart, setAddAthleteStart] = useState("");
  const [addAthleteJersey, setAddAthleteJersey] = useState("");
  const [addAthleteError, setAddAthleteError] = useState<string | null>(null);
  const [addAthleteSaving, setAddAthleteSaving] = useState(false);

  function openAddModal() {
    setAddMode("choice");
    setAthleteSearch("");
    setAthleteSearchResults([]);
    setSelectedAthlete(null);
    setSelectedAthleteTeams([]);
    setAddAthleteStart("");
    setAddAthleteJersey("");
    setAddAthleteError(null);
  }

  function closeAddModal() {
    setAddMode(null);
    setAthleteSearch("");
    setAthleteSearchResults([]);
    setSelectedAthlete(null);
    setSelectedAthleteTeams([]);
  }
  // Exit modal
  const [exitEntry, setExitEntry] = useState<AthleteTeamHistory | null>(null);
  const [exitDate, setExitDate] = useState("");
  const [exitError, setExitError] = useState<string | null>(null);
  const [exitSaving, setExitSaving] = useState(false);

  async function loadAthletes() {
    if (!id) return;
    setAthletesLoading(true);
    try {
      const data = await getTeamAthletes.execute(id, false);
      const sorted = data.sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0) || b.start_date.localeCompare(a.start_date));
      setAthletes(sorted);
      setAthletesLoaded(true);
      // Resolve athlete names in parallel
      const uniqueIds = [...new Set(sorted.map((e) => e.athlete_id))];
      const entries = await Promise.all(
        uniqueIds.map((aid) =>
          fetch(`${API_BASE}/athletes/${aid}`)
            .then((r) => r.ok ? r.json() as Promise<{ id: string; name: string; nickname: string | null }> : null)
            .catch(() => null)
        )
      );
      const map: Record<string, { name: string; nickname: string | null }> = {};
      for (const e of entries) {
        if (e) map[e.id] = { name: e.name, nickname: e.nickname };
      }
      setAthleteMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setAthletesLoading(false);
    }
  }

  function switchTab(tab: "dados" | "atletas") {
    setActiveTab(tab);
    if (tab === "atletas" && !athletesLoaded) void loadAthletes();
  }

  async function handleAthleteSearch() {
    const q = athleteSearch.trim();
    if (q.length < 2) return;
    setAthleteSearchLoading(true);
    setAthleteSearchResults([]);
    try {
      // Detect CPF (11 digits after stripping punctuation) or email
      const digits = q.replace(/[^\d]/g, "");
      let url: string;
      if (q.includes("@")) {
        url = `${API_BASE}/athletes?email=${encodeURIComponent(q)}`;
      } else if (digits.length === 11) {
        url = `${API_BASE}/athletes?cpf=${encodeURIComponent(digits)}`;
      } else {
        url = `${API_BASE}/athletes?name=${encodeURIComponent(q)}`;
      }
      const r = await fetch(url, { headers: authHeaders() });
      if (r.ok) setAthleteSearchResults(await r.json() as Athlete[]);
    } catch { /* ignore */ } finally {
      setAthleteSearchLoading(false);
    }
  }

  async function handleAddAthlete(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAthlete || !addAthleteStart || !id) { setAddAthleteError("Atleta e data de entrada são obrigatórios."); return; }
    setAddAthleteSaving(true);
    setAddAthleteError(null);
    try {
      const entry = await addAthleteToTeam.execute(selectedAthlete.id, {
        team_id: id,
        start_date: addAthleteStart,
        jersey_number: addAthleteJersey ? parseInt(addAthleteJersey) : undefined,
      });
      setAthletes((prev) => [entry, ...prev]);
      closeAddModal();
    } catch (err) {
      setAddAthleteError(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setAddAthleteSaving(false);
    }
  }

  async function handleExit(e: React.FormEvent) {
    e.preventDefault();
    if (!exitEntry || !exitDate || !exitEntry.athlete_id) { setExitError("Data de saída é obrigatória."); return; }
    setExitSaving(true);
    setExitError(null);
    try {
      const updated = await removeAthleteFromTeam.execute(exitEntry.athlete_id, exitEntry.id, exitDate);
      setAthletes((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setExitEntry(null); setExitDate("");
    } catch (err) {
      setExitError(err instanceof Error ? err.message : "Erro ao registrar saída.");
    } finally {
      setExitSaving(false);
    }
  }

  const visibleAthletes = showAllHistory ? athletes : athletes.filter((a) => a.is_active);

  // Load options and team data in parallel
  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`${API_BASE}/sports`).then((r) => r.ok ? r.json() as Promise<Option[]> : []),
      fetch(`${API_BASE}/cities`).then((r) => r.ok ? r.json() as Promise<Option[]> : []),
      fetch(`${API_BASE}/clubs`).then((r) => r.ok ? r.json() as Promise<Option[]> : []),
      fetch(`${API_BASE}/teams/${id}`).then((r) => {
        if (!r.ok) throw new Error("Time não encontrado.");
        return r.json() as Promise<RawTeam>;
      }),
    ])
      .then(([sportsData, citiesData, clubsData, team]) => {
        setSports((sportsData as Option[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setCities((citiesData as Option[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setClubs((clubsData as Option[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setName(team.name);
        setSportId(team.sport_id);
        setCityId(team.city_id);
        setClubId(team.club_id ?? "");
        setCategory(team.category ?? "");
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => {
        setLoadingOptions(false);
        setLoadingTeam(false);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !name.trim() || !sportId || !cityId) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: UpdateTeamPayload = {
        id,
        name: name.trim(),
        sport_id: sportId,
        city_id: cityId,
        club_id: clubId || null,
        category: category || null,
      };
      await updateTeam.execute(payload);
      setSuccess(true);
      setTimeout(() => navigate("/admin/times"), 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const loading = loadingOptions || loadingTeam;

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Link to="/admin/times" className="back-link">← Times</Link>
            <Link
              to={`/admin/times/${id}/inscricoes`}
              style={{ fontSize: "13px", color: "var(--c-action)", textDecoration: "none", padding: "4px 10px", border: "1px solid #cba6f7", borderRadius: "5px" }}
            >
              📋 Inscrições em Campeonato
            </Link>
          </div>
          <h1 className="page-title">Editar time</h1>
          <p className="page-subtitle">Atualizar dados da equipe e vínculo com clube</p>
          <div className="tab-bar">
            <button style={{ ...S.tab, ...(activeTab === "dados" ? S.tabActive : {}) }} onClick={() => switchTab("dados")}>Dados</button>
            <button style={{ ...S.tab, ...(activeTab === "atletas" ? S.tabActive : {}) }} onClick={() => switchTab("atletas")}>Atletas</button>
          </div>
        </div>
      </header>

      <main className="page-container">
        {loading && activeTab === "dados" && <p style={{ color: "var(--c-text)" }}>Carregando...</p>}

        {!loading && activeTab === "dados" && (
          <form onSubmit={handleSubmit} className="form-body" noValidate>

            {error && (
              <div className="form-error">
                <span>⚠ {error}</span>
                <button type="button" className="error-banner__close" onClick={() => setError(null)}>×</button>
              </div>
            )}

            {success && (
              <div className="form-success">✓ Time atualizado com sucesso. Redirecionando...</div>
            )}

            {/* ── Identificação ─────────────────────────────────── */}
            <fieldset className="form-fieldset">
              <legend className="form-legend">Identificação</legend>
              <div className="form-field-group--2">
                <div className="form-field-group">
                  <label className="form-label" htmlFor="name">
                    Nome do time <span style={{ color: "var(--c-negative)" }}>*</span>
                  </label>
                  <input
                    id="name"
                    className="form-input"
                    type="text"
                    placeholder="Ex: Uberaba Sport Club Principal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-label" htmlFor="category">Categoria</label>
                  <select
                    id="category"
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Sem categoria</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            {/* ── Esporte e Localização ─────────────────────────── */}
            <fieldset className="form-fieldset">
              <legend className="form-legend">Esporte e Localização</legend>
              <div className="form-field-group--2">
                <div className="form-field-group">
                  <label className="form-label" htmlFor="sport">
                    Esporte <span style={{ color: "var(--c-negative)" }}>*</span>
                  </label>
                  <select
                    id="sport"
                    className="form-select"
                    value={sportId}
                    onChange={(e) => setSportId(e.target.value)}
                    required
                  >
                    <option value="">Selecionar esporte</option>
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field-group">
                  <label className="form-label" htmlFor="city">
                    Cidade <span style={{ color: "var(--c-negative)" }}>*</span>
                  </label>
                  <select
                    id="city"
                    className="form-select"
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    required
                  >
                    <option value="">Selecionar cidade</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            {/* ── Clube vinculado ────────────────────────────────── */}
            <fieldset className="form-fieldset">
              <legend className="form-legend">Clube vinculado</legend>
              <p className="muted">
                Opcional. Vincule este time a um clube existente. Times sem clube são independentes.
              </p>
              <div className="form-field-group">
                <label className="form-label" htmlFor="club">Clube</label>
                <select
                  id="club"
                  className="form-select" style={{ maxWidth: "420px" }}
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                >
                  <option value="">Nenhum clube (time independente)</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {clubId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setClubId("")}
                  >
                    Remover vínculo com clube
                  </button>
                )}
              </div>
            </fieldset>

            <div className="form-actions">
              <button
                type="submit"
                style={{ ...S.btnSave, ...(submitting ? S.btnDisabled : {}) }}
                disabled={submitting || !name.trim() || !sportId || !cityId}
              >
                {submitting ? "Salvando…" : "Salvar alterações"}
              </button>
              <Link to="/admin/times" className="btn btn-secondary">Cancelar</Link>
            </div>
          </form>
        )}

        {activeTab === "atletas" && (
          <div>
            <div className="toolbar">
              <label style={{ color: "var(--c-text)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input type="checkbox" checked={showAllHistory} onChange={(e) => setShowAllHistory(e.target.checked)} />
                Ver histórico completo
              </label>
              <button className="btn btn-success" onClick={openAddModal}>
                + Adicionar atleta
              </button>
            </div>
            {athletesLoading && <p style={{ color: "var(--c-text)" }}>Carregando…</p>}
            {!athletesLoading && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr>
                    <th >Status</th>
                    <th >Atleta</th>
                    <th >Entrada</th>
                    <th >Saída</th>
                    <th >Camisa</th>
                    <th >Ações</th>
                  </tr></thead>
                  <tbody>
                    {visibleAthletes.length === 0 ? (
                      <tr><td colSpan={6} className="muted">Nenhum atleta encontrado.</td></tr>
                    ) : visibleAthletes.map((a) => (
                      <tr key={a.id} >
                        <td ><div style={activeDotStyle(a.is_active)} /></td>
                        <td ><Link to={`/atletas/${a.athlete_id}`} className="row-link">{a.athlete_name ?? athleteMap[a.athlete_id]?.name ?? a.athlete_id}{(a.athlete_nickname ?? athleteMap[a.athlete_id]?.nickname) ? <span className="badge">{a.athlete_nickname ?? athleteMap[a.athlete_id]!.nickname}</span> : null}</Link></td>
                        <td className="td-muted">{a.start_date}</td>
                        <td className="td-muted">{a.is_active ? <span className="badge badge--success">Ativo</span> : (a.end_date ?? "—")}</td>
                        <td className="td-muted">{a.jersey_number ?? "—"}</td>
                        <td >
                          {a.is_active && (
                            <button className="btn btn-secondary" onClick={() => { setExitEntry(a); setExitDate(""); setExitError(null); }}>
                              Registrar saída
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Add Athlete Modal ───────────────────────────────── */}
      {addMode !== null && (
        <div className="modal-overlay">
          <div className="modal-card">

            {/* ── Choice step ── */}
            {addMode === "choice" && (
              <>
                <h2 className="modal-title">Adicionar Atleta</h2>
                <p style={{ color: "#ffffff", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
                  Como deseja adicionar o atleta a este time?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button
                    style={{ ...S.btnSave, textAlign: "left", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "2px" }}
                    onClick={() => setAddMode("existing")}
                  >
                    <span style={{ fontWeight: 700 }}>Atleta existente</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 400, opacity: 0.85 }}>Buscar por nome, CPF ou e-mail</span>
                  </button>
                  <button
                    style={{ ...S.btnSave, backgroundColor: "var(--c-positive)", textAlign: "left", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "2px" }}
                    onClick={() => navigate("/admin/atletas/novo", { state: { prefilledTeamId: id } })}
                  >
                    <span style={{ fontWeight: 700 }}>Criar novo atleta</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 400, opacity: 0.85 }}>Cadastrar atleta e já vincular a este time</span>
                  </button>
                </div>
                <div style={{ ...S.modalActions, marginTop: "1rem" }}>
                  <button type="button" style={{ ...S.btnCancel, border: "1px solid #313244", borderRadius: "6px", padding: "0.4rem 0.85rem" }} onClick={closeAddModal}>Cancelar</button>
                </div>
              </>
            )}

            {/* ── Existing athlete search step ── */}
            {addMode === "existing" && (
              <>
                <h2 className="modal-title">Buscar atleta existente</h2>
                <form onSubmit={handleAddAthlete} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      className="form-input" style={{ flex: 1 }}
                      placeholder="Nome, CPF (000.000.000-00) ou e-mail"
                      value={athleteSearch}
                      onChange={(e) => setAthleteSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAthleteSearch(); } }}
                      autoFocus
                    />
                    <button type="button" style={{ ...S.btnSave, fontSize: "0.82rem", padding: "0.4rem 0.85rem" }} onClick={() => void handleAthleteSearch()}>
                      {athleteSearchLoading ? "…" : "Buscar"}
                    </button>
                  </div>
                  {!athleteSearchLoading && athleteSearch.length >= 2 && athleteSearchResults.length === 0 && (
                    <p style={{ color: "#ffffff", fontSize: "0.83rem", margin: 0 }}>Nenhum atleta encontrado.</p>
                  )}
                  {athleteSearchResults.length > 0 && (
                    <div style={{ border: "1px solid #313244", borderRadius: "6px", maxHeight: "160px", overflowY: "auto" }}>
                      {athleteSearchResults.map((a) => (
                        <div
                          key={a.id}
                          style={{ padding: "0.5rem 0.85rem", cursor: "pointer", backgroundColor: selectedAthlete?.id === a.id ? "var(--c-border)" : "transparent", color: "var(--c-text)", fontSize: "0.875rem" }}
                          onClick={() => {
                          setSelectedAthlete(a);
                          // Fetch athlete's active teams
                          fetch(`${API_BASE}/athletes/${a.id}/teams`, { headers: authHeaders() })
                            .then((r) => r.ok ? r.json() : [])
                            .then((data: { team_id: string; team_name: string | null; start_date: string; is_active: boolean; team_sport_name: string | null }[]) => {
                              setSelectedAthleteTeams(data.filter((t) => t.is_active));
                            })
                            .catch(() => setSelectedAthleteTeams([]));
                        }}
                        >
                          {a.name}{a.nickname ? <span style={{ color: "#ffffff", marginLeft: "0.4rem" }}>({a.nickname})</span> : null}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedAthlete && (
                    <div>
                      <p style={{ color: "var(--c-positive)", fontSize: "0.85rem", margin: "0 0 0.35rem" }}>✓ Selecionado: {selectedAthlete.name}</p>
                      {selectedAthleteTeams.length > 0 && (
                        <div style={{ backgroundColor: "var(--c-brand)", border: "1px solid #313244", borderRadius: "6px", padding: "0.5rem 0.85rem", fontSize: "0.8rem" }}>
                          <p style={{ color: "#ffffff", margin: "0 0 0.35rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.72rem" }}>Times ativos atualmente</p>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            {selectedAthleteTeams.map((t) => (
                              <li key={t.team_id} style={{ color: "var(--c-text)" }}>
                                ⚽ {t.team_name ?? t.team_id}
                                {t.team_sport_name && <span style={{ color: "#ffffff", marginLeft: "0.4rem" }}>({t.team_sport_name})</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedAthleteTeams.length === 0 && (
                        <p style={{ color: "#ffffff", fontSize: "0.78rem", margin: 0 }}>Nenhum time ativo.</p>
                      )}
                    </div>
                  )}
                  <div className="form-field-group--2">
                    <div className="form-field-group">
                      <label className="form-label">Data de entrada <span style={{ color: "var(--c-negative)" }}>*</span></label>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <input type="date" className="form-input" style={{ flex: 1 }} value={addAthleteStart} onChange={(e) => setAddAthleteStart(e.target.value)} required />
                        <button
                          type="button"
                          style={{ flexShrink: 0, backgroundColor: "var(--c-border)", border: "1px solid #45475a", borderRadius: "6px", color: "var(--c-text)", fontSize: "0.78rem", padding: "0.45rem 0.7rem", cursor: "pointer", whiteSpace: "nowrap" }}
                          onClick={() => setAddAthleteStart(new Date().toISOString().slice(0, 10))}
                        >
                          Hoje
                        </button>
                      </div>
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Número da camisa</label>
                      <input type="number" className="form-input" value={addAthleteJersey} onChange={(e) => setAddAthleteJersey(e.target.value)} min={0} />
                    </div>
                  </div>
                  {addAthleteError && <p className="error-text">{addAthleteError}</p>}
                  <div className="modal-actions">
                    <button type="button" style={{ ...S.btnCancel, border: "1px solid #313244", borderRadius: "6px", padding: "0.4rem 0.85rem" }} onClick={() => setAddMode("choice")}>← Voltar</button>
                    <button type="submit" style={{ ...S.btnSave, ...(addAthleteSaving ? S.btnDisabled : {}) }} disabled={addAthleteSaving || !selectedAthlete}>
                      {addAthleteSaving ? "Adicionando…" : "Adicionar"}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* ── Exit Modal ─────────────────────────────────────── */}
      {exitEntry && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="modal-title">Registrar Saída</h2>
            <form onSubmit={handleExit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div className="form-field-group">
                <label className="form-label">Data de saída <span style={{ color: "var(--c-negative)" }}>*</span></label>
                <input type="date" className="form-input" value={exitDate} onChange={(e) => setExitDate(e.target.value)} required />
              </div>
              {exitError && <p className="error-text">{exitError}</p>}
              <div className="modal-actions">
                <button type="button" style={{ ...S.btnCancel, border: "1px solid #313244", borderRadius: "6px", padding: "0.4rem 0.85rem" }} onClick={() => setExitEntry(null)}>Cancelar</button>
                <button type="submit" style={{ ...S.btnSave, ...(exitSaving ? S.btnDisabled : {}) }} disabled={exitSaving}>
                  {exitSaving ? "Salvando…" : "Confirmar saída"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function activeDotStyle(active: boolean): React.CSSProperties {
  return { width: 8, height: 8, borderRadius: "50%", backgroundColor: active ? "#a6e3a1" : "#45475a", flexShrink: 0, display: "inline-block" };
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #89b4fa, #a6e3a1)" },
  heroInner: { maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: "0 0 0.2rem" },
  subtitle: { color: "#cdd6f4", fontSize: "0.875rem", margin: 0 },

  page: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  form: { display: "flex", flexDirection: "column", gap: "1.5rem" },

  errorBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  errClose: { background: "none", border: "none", color: "#f38ba8", cursor: "pointer", fontSize: "1.2rem", padding: "0 0.25rem", lineHeight: 1 },
  successBanner: { color: "#a6e3a1", backgroundColor: "#162016", border: "1px solid #2a4a2a", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },

  fieldset: { border: "1px solid #313244", borderRadius: "10px", padding: "1.25rem 1.5rem", margin: 0 },
  legend: { color: "#cba6f7", fontSize: "0.84rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 0.5rem" },
  fieldHint: { color: "#cdd6f4", fontSize: "0.83rem", margin: "0 0 1rem", fontStyle: "italic" },

  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label: { color: "#cdd6f4", fontSize: "0.825rem", fontWeight: 500 },
  required: { color: "#f38ba8" },
  input: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "7px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.85rem", outline: "none", boxSizing: "border-box", width: "100%" },
  select: { cursor: "pointer", appearance: "auto" },
  clearBtn: { marginTop: "0.5rem", background: "none", border: "1px solid #5a2a30", borderRadius: "5px", color: "#f38ba8", fontSize: "0.78rem", padding: "0.25rem 0.7rem", cursor: "pointer" },

  actions: { display: "flex", alignItems: "center", gap: "1rem", paddingTop: "0.5rem" },
  btnSave: { backgroundColor: "#89b4fa", border: "none", borderRadius: "7px", color: "#11111b", fontSize: "0.9rem", fontWeight: 700, padding: "0.6rem 1.5rem", cursor: "pointer" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  btnCancel: { color: "#cdd6f4", textDecoration: "none", fontSize: "0.875rem" },

  tabBar: { display: "flex", gap: "0.5rem", marginTop: "1rem" },
  tab: { background: "transparent", border: "1px solid #313244", borderRadius: "6px", color: "#ffffff", fontSize: "0.85rem", padding: "0.35rem 1rem", cursor: "pointer" },
  tabActive: { backgroundColor: "#89b4fa", borderColor: "#89b4fa", color: "#11111b", fontWeight: 700 },
  athletesHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  btnAddAthlete: { backgroundColor: "#a6e3a1", border: "none", borderRadius: "6px", color: "#11111b", fontWeight: 700, fontSize: "0.875rem", padding: "0.5rem 1rem", cursor: "pointer" },
  tableWrap: { overflowX: "auto", borderRadius: "8px", border: "1px solid #313244" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: { backgroundColor: "#18265b", color: "#cdd6f4", fontWeight: 600, fontSize: "0.84rem", textAlign: "left", padding: "0.75rem 1rem", borderBottom: "1px solid #313244" },
  trRow: { borderBottom: "1px solid #18265b" },
  td: { padding: "0.65rem 1rem", color: "#cdd6f4", verticalAlign: "middle" },
  tdMuted: { padding: "0.65rem 1rem", color: "#ffffff", fontSize: "0.85rem", verticalAlign: "middle" },
  rowLink: { color: "#89b4fa", textDecoration: "none" },
  nickBadge: { marginLeft: "0.4rem", fontSize: "0.72rem", color: "#cba6f7", fontStyle: "italic" },
  activeBadge: { fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#a6e3a1", color: "#18265b", borderRadius: "4px", padding: "0.1rem 0.45rem" },
  btnExit: { fontSize: "0.78rem", backgroundColor: "#45475a", border: "none", borderRadius: "5px", color: "#cdd6f4", padding: "0.2rem 0.7rem", cursor: "pointer" },
  empty: { padding: "1.5rem", color: "#ffffff", textAlign: "center" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "10px", padding: "1.75rem 2rem", width: "100%", maxWidth: "440px", boxSizing: "border-box" },
  modalTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#cdd6f4", margin: "0 0 1rem" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.25rem" },
  mError: { color: "#f38ba8", fontSize: "0.85rem", margin: 0 },
};
