import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { authHeaders } from "@infrastructure/authHeaders";
import { API_BASE } from "@infrastructure/apiBase";

// ─── Types ───────────────────────────────────────────────────────────────────

type MatchData = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round_number: number | null;
  match_date: string | null;
  home_score: number | null;
  away_score: number | null;
  venue_id: string | null;
};

type TeamEntry = { team_id: string; team_name: string; group_id: string };
type VenueOption = { id: string; name: string };

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminGroupMatchesPage() {
  const { champId, groupId } = useParams<{ champId: string; groupId: string }>();
  const [searchParams] = useSearchParams();

  const editionId  = searchParams.get("edicao");
  const groupName  = searchParams.get("grupo") ?? "Grupo";
  const phaseName  = searchParams.get("fase")  ?? "Fase";
  const champName  = searchParams.get("champ") ?? "Campeonato";

  const backUrl = champId && editionId
    ? `/admin/campeonatos/${champId}/gerenciar?edicao=${editionId}`
    : champId
    ? `/admin/campeonatos/${champId}/gerenciar`
    : "/admin/campeonatos";

  // ── Data ──────────────────────────────────────────────────────────────────
  const [teams,   setTeams]   = useState<TeamEntry[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [venues,  setVenues]  = useState<VenueOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Add-match form ────────────────────────────────────────────────────────
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [matchHomeId,    setMatchHomeId]    = useState("");
  const [matchAwayId,    setMatchAwayId]    = useState("");
  const [matchRound,     setMatchRound]     = useState("1");
  const [matchDatePart,  setMatchDatePart]  = useState("");
  const [matchTimePart,  setMatchTimePart]  = useState("");
  const [matchVenueId,   setMatchVenueId]   = useState("");

  // ── Edit form ─────────────────────────────────────────────────────────────
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editRound,      setEditRound]      = useState("");
  const [editDatePart,   setEditDatePart]   = useState("");
  const [editTimePart,   setEditTimePart]   = useState("");
  const [editVenueId,    setEditVenueId]    = useState("");

  // ── Round schedule config (ephemeral — resets on page refresh) ───────────
  const [showRoundConfig,  setShowRoundConfig]  = useState(false);
  const [rcRound1Date,     setRcRound1Date]     = useState("");
  const [rcRound1Time,     setRcRound1Time]     = useState("");
  const [rcIntervalDays,   setRcIntervalDays]   = useState("7");

  // ── Actions ───────────────────────────────────────────────────────────────
  const [submitting,     setSubmitting]     = useState(false);
  const [generating,     setGenerating]     = useState(false);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [submitError,    setSubmitError]    = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId) return;
    Promise.all([
      fetch(`${API_BASE}/groups/${groupId}/teams`).then(r  => r.ok  ? r.json() as Promise<TeamEntry[]>  : []),
      fetch(`${API_BASE}/groups/${groupId}/matches`).then(r => r.ok ? r.json() as Promise<MatchData[]> : []),
      fetch(`${API_BASE}/venues`).then(r => r.ok ? r.json() as Promise<VenueOption[]> : []),
    ])
      .then(([t, m, v]) => {
        setTeams(t);
        setMatches([...m].sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0)));
        setVenues(v);
        setMatchRound(m.length > 0
          ? String(Math.max(...m.filter(x => x.round_number != null).map(x => x.round_number!)) + 1)
          : "1"
        );
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!matchHomeId || !matchAwayId || matchHomeId === matchAwayId) {
      setSubmitError("Selecione mandante e visitante diferentes.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const matchDatetime = matchDatePart
      ? `${matchDatePart}T${matchTimePart || "00:00"}:00`
      : null;
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          home_team_id: matchHomeId,
          away_team_id: matchAwayId,
          round_number: parseInt(matchRound, 10) || 1,
          match_date: matchDatetime,
          venue_id: matchVenueId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const newMatch = await res.json() as MatchData;
      setMatches(prev =>
        [...prev, newMatch].sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0))
      );
      setMatchHomeId("");
      setMatchAwayId("");
      setMatchDatePart("");
      setMatchTimePart("");
      setMatchVenueId("");
      setMatchRound(String((newMatch.round_number ?? 1) + 1));
      setShowAddForm(false);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMatchId) return;
    setSubmitError(null);
    const matchDatetime = editDatePart
      ? `${editDatePart}T${editTimePart || "00:00"}:00`
      : null;
    try {
      const res = await fetch(`${API_BASE}/matches/${editingMatchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          round_number: editRound !== "" ? parseInt(editRound, 10) : null,
          match_date: matchDatetime,
          venue_id: editVenueId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const updated = await res.json() as MatchData;
      setMatches(prev =>
        prev.map(m => m.id === editingMatchId ? updated : m)
            .sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0))
      );
      setEditingMatchId(null);
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  async function handleDelete(matchId: string) {
    if (deletingId) return;
    if (!window.confirm("Excluir esta partida?")) return;
    setDeletingId(matchId);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (!res.ok && res.status !== 204) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      setMatches(prev => prev.filter(m => m.id !== matchId));
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleGenerate() {
    if (generating || teams.length < 2) return;
    setGenerating(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/matches/generate`, {
        method: "POST",
        headers: { ...authHeaders() },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const newMatches = await res.json() as MatchData[];
      setMatches(prev =>
        [...prev, ...newMatches].sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0))
      );
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  // ── Share ─────────────────────────────────────────────────────────

  function openRoundShare(round: number) {
    const params = new URLSearchParams({
      groupId: groupId ?? "",
      round:   String(round),
      champ:   champName,
      fase:    phaseName,
      grupo:   groupName,
    });
    window.open(`/share/rodada?${params.toString()}`, "_blank", "noopener");
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns the date/time for a given round number based on the round config. */
  function computeRoundDate(roundNum: number): { date: string; time: string } | null {
    if (!rcRound1Date || isNaN(roundNum) || roundNum < 1) return null;
    // Use noon to avoid DST edge cases
    const base = new Date(`${rcRound1Date}T12:00:00`);
    const interval = Math.max(0, parseInt(rcIntervalDays, 10) || 0);
    base.setDate(base.getDate() + (roundNum - 1) * interval);
    const yyyy = base.getFullYear();
    const mm   = String(base.getMonth() + 1).padStart(2, "0");
    const dd   = String(base.getDate()).padStart(2, "0");
    return { date: `${yyyy}-${mm}-${dd}`, time: rcRound1Time };
  }

  function fmtDate(d: string | null): string {
    if (!d) return "—";
    const datePart = d.split("T")[0];
    const timePart = d.includes("T") ? d.split("T")[1]?.slice(0, 5) : null;
    const [y, m, day] = datePart.split("-");
    return timePart && timePart !== "00:00" ? `${day}/${m}/${y} ${timePart}` : `${day}/${m}/${y}`;
  }

  function teamName(id: string) {
    return teams.find(t => t.team_id === id)?.team_name ?? id.slice(0, 8) + "…";
  }

  // ── Rounds grouping ───────────────────────────────────────────────────────
  const rounds = [...new Set(matches.map(m => m.round_number ?? 0))].sort((a, b) => a - b);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <main className="page-container"><p style={{ color: "#cdd6f4" }}>Carregando…</p></main>;

  if (error) {
    return (
      <main className="page-container">
        <p style={{ color: "#f38ba8" }}>{error}</p>
        <Link to={backUrl} style={{ color: "#89b4fa" }}>← Voltar</Link>
      </main>
    );
  }

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to={backUrl} className="back-link">← {champName}</Link>
          <div className="hero__row">
            <div>
              <p style={S.breadcrumb}>{phaseName}</p>
              <h1 className="page-title">{groupName}</h1>
            </div>
            <div style={S.headerActions}>
              <button
                style={{
                  ...S.btnGenerate,
                  opacity: teams.length < 2 || generating ? 0.5 : 1,
                  cursor: teams.length < 2 || generating ? "default" : "pointer",
                }}
                onClick={handleGenerate}
                disabled={teams.length < 2 || generating}
                title={teams.length < 2 ? "Adicione ao menos 2 times no grupo primeiro" : "Gerar todos os confrontos (ida e volta)"}
              >
                {generating ? "Gerando…" : "⚡ Gerar confrontos"}
              </button>
              <button
                style={S.btnAdd}
                onClick={() => {
                  setShowAddForm(v => !v);
                  setSubmitError(null);
                  setMatchHomeId("");
                  setMatchAwayId("");
                  setMatchDatePart("");
                  setMatchTimePart("");
                  setMatchVenueId("");
                }}
              >
                {showAddForm ? "Cancelar" : "+ Adicionar partida"}
              </button>
            </div>
          </div>
          {/* Teams pill bar */}
          <div style={S.pillRow}>
            {teams.map(t => (
              <span key={t.team_id} style={S.teamPill}>{t.team_name}</span>
            ))}
            {teams.length === 0 && (
              <span style={{ color: "#ffffff", fontSize: "0.8rem", fontStyle: "italic" }}>
                Nenhum time neste grupo.
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="page-container">

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {submitError && (
          <div style={S.errBanner}>
            <span>⚠ {submitError}</span>
            <button onClick={() => setSubmitError(null)} style={S.errClose}>×</button>
          </div>
        )}

        {/* ── Round schedule config ─────────────────────────────────────── */}
        <div style={S.rcPanel}>
          <button
            type="button"
            style={S.rcToggle}
            onClick={() => setShowRoundConfig(v => !v)}
          >
            <span>📅 Calendário de rodadas</span>
            {rcRound1Date ? (
              <span style={S.rcActive}>
                Rodada 1: {rcRound1Date.split("-").reverse().join("/")}
                {rcRound1Time ? ` ${rcRound1Time}` : ""}
                {" · "}+{rcIntervalDays}d entre rodadas
              </span>
            ) : (
              <span style={{ color: "#ffffff", fontSize: "0.78rem" }}>não configurado</span>
            )}
            <span style={{ marginLeft: "auto", color: "#ffffff", fontSize: "0.7rem" }}>
              {showRoundConfig ? "▲" : "▼"}
            </span>
          </button>
          {showRoundConfig && (
            <div style={S.rcBody}>
              <p style={S.rcHint}>
                Configure a data/hora da Rodada 1 e o intervalo em dias entre rodadas.
                Ao preencher o número da rodada em qualquer partida, a data será preenchida automaticamente.
                Essa configuração some ao recarregar a página.
              </p>
              <div style={S.rcFields}>
                <div className="form-field">
                  <label className="form-label">Data da Rodada 1</label>
                  <input
                    type="date"
                    style={S.input}
                    value={rcRound1Date}
                    onChange={e => setRcRound1Date(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Hora padrão</label>
                  <input
                    type="time"
                    style={{ ...S.input, maxWidth: "130px" }}
                    value={rcRound1Time}
                    onChange={e => setRcRound1Time(e.target.value)}
                    disabled={!rcRound1Date}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Intervalo (dias)</label>
                  <input
                    type="number"
                    style={{ ...S.input, maxWidth: "90px" }}
                    value={rcIntervalDays}
                    onChange={e => setRcIntervalDays(e.target.value)}
                    min={0}
                    placeholder="7"
                  />
                </div>
                {rcRound1Date && (
                  <button
                    type="button"
                    style={{ ...S.btnCancelSmall, alignSelf: "flex-end", color: "#f38ba8", borderColor: "#f38ba8" }}
                    onClick={() => { setRcRound1Date(""); setRcRound1Time(""); setRcIntervalDays("7"); }}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Add match form ────────────────────────────────────────────── */}
        {showAddForm && (
          <div style={S.formCard}>
            <h2 style={S.formTitle}>Nova partida</h2>
            <form onSubmit={(e) => void handleAddMatch(e)}>
              <div style={S.formGrid}>
                <div className="form-field">
                  <label className="form-label">Mandante</label>
                  <select
                    style={S.input}
                    value={matchHomeId}
                    onChange={e => setMatchHomeId(e.target.value)}
                    required
                    autoFocus
                  >
                    <option value="">Selecione</option>
                    {teams.map(t => (
                      <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Visitante</label>
                  <select
                    style={S.input}
                    value={matchAwayId}
                    onChange={e => setMatchAwayId(e.target.value)}
                    required
                  >
                    <option value="">Selecione</option>
                    {teams.filter(t => t.team_id !== matchHomeId).map(t => (
                      <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Rodada</label>
                  <input
                    type="number"
                    style={{ ...S.input, maxWidth: "100px" }}
                    value={matchRound}
                    onChange={e => {
                      const v = e.target.value;
                      setMatchRound(v);
                      const n = parseInt(v, 10);
                      if (!isNaN(n) && n > 0) {
                        const computed = computeRoundDate(n);
                        if (computed) {
                          setMatchDatePart(computed.date);
                          setMatchTimePart(computed.time);
                        }
                      }
                    }}
                    min={1}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Data (opcional)</label>
                  <input
                    type="date"
                    style={S.input}
                    value={matchDatePart}
                    onChange={e => setMatchDatePart(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Hora (opcional)</label>
                  <input
                    type="time"
                    style={{ ...S.input, maxWidth: "140px" }}
                    value={matchTimePart}
                    onChange={e => setMatchTimePart(e.target.value)}
                    disabled={!matchDatePart}
                  />
                </div>
                <div style={{ ...S.field, gridColumn: "span 3" } as React.CSSProperties}>
                  <label className="form-label">Estádio (opcional)</label>
                  <select
                    style={{ ...S.input, maxWidth: "360px" }}
                    value={matchVenueId}
                    onChange={e => setMatchVenueId(e.target.value)}
                  >
                    <option value="">Sem estádio</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="submit" style={S.btnSave} disabled={submitting}>
                  {submitting ? "Salvando…" : "Salvar partida"}
                </button>
                <button type="button" style={S.btnCancel} onClick={() => setShowAddForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Match list ────────────────────────────────────────────────── */}
        {matches.length === 0 && !showAddForm && (
          <div style={S.emptyState}>
            <p style={S.emptyTitle}>Nenhuma partida cadastrada</p>
            <p style={S.emptyHint}>
              Use "⚡ Gerar confrontos" para criar todos os jogos do turno automaticamente,
              ou "+ Adicionar partida" para inserir manualmente.
            </p>
          </div>
        )}

        {rounds.map(round => {
          const roundMatches = matches.filter(m => (m.round_number ?? 0) === round);
          return (
            <section key={round} style={S.roundSection}>
              <div style={S.roundHeader}>
                <span style={S.roundLabel}>{round === 0 ? "Sem rodada" : `Rodada ${round}`}</span>
                <span style={S.roundCount}>{roundMatches.length} partida{roundMatches.length !== 1 ? "s" : ""}</span>
                {round !== 0 && (
                  <button
                    style={S.btnShare}
                    onClick={() => openRoundShare(round)}
                    title="Abrir post da rodada para Instagram"
                  >
                    📸 Gerar imagem
                  </button>
                )}
              </div>
              <div style={S.matchTable}>
                {roundMatches.map(m => (
                  <div key={m.id} style={S.matchRow}>
                    {editingMatchId === m.id ? (
                      /* ── Inline edit form ── */
                      <form
                        onSubmit={(e) => void handleSaveSchedule(e)}
                        style={S.editForm}
                      >
                        <div style={S.matchVsBlock}>
                          <span style={S.homeTeam}>{teamName(m.home_team_id)}</span>
                          <span style={S.vsLabel}>×</span>
                          <span style={S.awayTeam}>{teamName(m.away_team_id)}</span>
                        </div>
                        <div style={S.editControls}>
                          <div className="form-field">
                            <label style={S.labelSm}>Rodada</label>
                            <input
                              type="number"
                              style={{ ...S.input, width: "80px" }}
                              value={editRound}
                              onChange={e => {
                                const v = e.target.value;
                                setEditRound(v);
                                const n = parseInt(v, 10);
                                if (!isNaN(n) && n > 0) {
                                  const computed = computeRoundDate(n);
                                  if (computed) {
                                    setEditDatePart(computed.date);
                                    setEditTimePart(computed.time);
                                  }
                                }
                              }}
                              min={1}
                              autoFocus
                            />
                          </div>
                          <div className="form-field">
                            <label style={S.labelSm}>Data</label>
                            <input
                              type="date"
                              style={{ ...S.input, maxWidth: "160px" }}
                              value={editDatePart}
                              onChange={e => setEditDatePart(e.target.value)}
                            />
                          </div>
                          <div className="form-field">
                            <label style={S.labelSm}>Hora</label>
                            <input
                              type="time"
                              style={{ ...S.input, maxWidth: "120px" }}
                              value={editTimePart}
                              onChange={e => setEditTimePart(e.target.value)}
                              disabled={!editDatePart}
                            />
                          </div>
                          <div style={{ ...S.field, flex: 1, minWidth: "180px" }}>
                            <label style={S.labelSm}>Estádio</label>
                            <select
                              style={S.input}
                              value={editVenueId}
                              onChange={e => setEditVenueId(e.target.value)}
                            >
                              <option value="">Sem estádio</option>
                              {venues.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ display: "flex", gap: "0.4rem", alignSelf: "flex-end" }}>
                            <button type="submit" style={S.btnSaveSmall}>✓ Salvar</button>
                            <button
                              type="button"
                              style={S.btnCancelSmall}
                              onClick={() => setEditingMatchId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      /* ── Match display row ── */
                      <>
                        <div style={S.matchVsBlock}>
                          <span style={S.homeTeam}>{teamName(m.home_team_id)}</span>
                          {m.home_score != null ? (
                            <span style={S.scoreBlock}>{m.home_score} – {m.away_score}</span>
                          ) : (
                            <span style={S.vsLabel}>×</span>
                          )}
                          <span style={S.awayTeam}>{teamName(m.away_team_id)}</span>
                        </div>
                        <div style={S.matchMeta}>
                          {m.match_date && (
                            <span style={S.dateChip}>📅 {fmtDate(m.match_date)}</span>
                          )}
                          {m.venue_id && venues.find(v => v.id === m.venue_id) && (
                            <span style={S.venueChip}>
                              🏟 {venues.find(v => v.id === m.venue_id)!.name}
                            </span>
                          )}
                          {m.home_score != null && (
                            <span style={S.resultChip}>Resultado registrado</span>
                          )}
                        </div>
                        <div style={S.matchActions}>
                          <button
                            style={S.btnEditMatch}
                            onClick={() => {
                              setEditingMatchId(m.id);
                              setEditRound(m.round_number != null ? String(m.round_number) : "");
                              const dt = m.match_date ? m.match_date.replace("Z", "").split("T") : ["", ""];
                              setEditDatePart(dt[0] ?? "");
                              setEditTimePart(dt[1] ? dt[1].slice(0, 5) : "");
                              setEditVenueId(m.venue_id ?? "");
                            }}
                            title="Editar rodada / data / estádio"
                          >
                            ✎ Editar
                          </button>
                          <Link
                            to={`/admin/partidas/${m.id}/resultado`}
                            style={S.btnScore}
                            title="Registrar/editar resultado"
                          >
                            ⚽ Resultado
                          </Link>
                          <button
                            style={S.btnDelete}
                            onClick={() => void handleDelete(m.id)}
                            disabled={deletingId === m.id}
                            title="Excluir partida"
                          >
                            {deletingId === m.id ? "…" : "🗑 Excluir"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  // Header
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #a6e3a1, #89b4fa)" },
  heroInner: { maxWidth: "960px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  breadcrumb: { margin: "0 0 2px", fontSize: "0.8rem", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em" },
  heroRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: "0 0 0.75rem" },
  headerActions: { display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", paddingTop: "0.2rem" },
  pillRow: { display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  teamPill: { backgroundColor: "#18265b", border: "1px solid #45475a", borderRadius: "20px", color: "#cdd6f4", padding: "0.2rem 0.7rem", fontSize: "0.78rem" },

  // Page
  page: { maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem 5rem" },

  // Error
  errBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem", marginBottom: "1.5rem" },
  errClose: { background: "none", border: "none", color: "#f38ba8", cursor: "pointer", fontSize: "1.2rem", padding: "0 0.25rem", lineHeight: "1" },

  // Buttons
  btnAdd: { backgroundColor: "transparent", border: "1px solid #cba6f7", borderRadius: "6px", color: "#cba6f7", fontSize: "0.875rem", fontWeight: 600, padding: "0.45rem 1rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnGenerate: { backgroundColor: "transparent", border: "1px solid #f9e2af", borderRadius: "6px", color: "#f9e2af", fontSize: "0.875rem", fontWeight: 600, padding: "0.45rem 1rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnSave: { backgroundColor: "#a6e3a1", border: "none", borderRadius: "6px", color: "#11111b", fontSize: "0.875rem", fontWeight: 700, padding: "0.5rem 1.25rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnCancel: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.5rem 0.9rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnSaveSmall: { backgroundColor: "#a6e3a1", border: "none", borderRadius: "5px", color: "#11111b", fontSize: "0.8rem", fontWeight: 700, padding: "0.35rem 0.75rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnCancelSmall: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "5px", color: "#cdd6f4", fontSize: "0.8rem", padding: "0.35rem 0.6rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnEditMatch: { background: "none", border: "1px solid #89b4fa", borderRadius: "5px", color: "#89b4fa", fontSize: "0.8rem", cursor: "pointer", padding: "0.3rem 0.65rem", whiteSpace: "nowrap" },
  btnScore: { display: "inline-block", border: "1px solid #a6e3a1", borderRadius: "5px", color: "#a6e3a1", fontSize: "0.8rem", padding: "0.3rem 0.65rem", textDecoration: "none", whiteSpace: "nowrap" },
  btnDelete: { background: "none", border: "1px solid #45475a", borderRadius: "5px", color: "#f38ba8", fontSize: "0.8rem", cursor: "pointer", padding: "0.3rem 0.65rem", whiteSpace: "nowrap" },
  btnShare: { background: "none", border: "1px solid #cba6f7", borderRadius: "5px", color: "#cba6f7", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", padding: "0.2rem 0.65rem", whiteSpace: "nowrap", marginLeft: "auto" },

  // Round schedule config panel
  rcPanel: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "10px", marginBottom: "1.25rem", overflow: "hidden" },
  rcToggle: { width: "100%", display: "flex", alignItems: "center", gap: "0.65rem", background: "none", border: "none", cursor: "pointer", color: "#ffffff", fontSize: "0.82rem", fontWeight: 600, padding: "0.65rem 1rem", textAlign: "left" as const },
  rcActive: { color: "#f9e2af", fontSize: "0.78rem", backgroundColor: "rgba(249,226,175,0.08)", border: "1px solid rgba(249,226,175,0.25)", borderRadius: "4px", padding: "0.1rem 0.5rem" },
  rcBody: { padding: "0.75rem 1rem 1rem", borderTop: "1px solid #313244" },
  rcHint: { margin: "0 0 0.75rem", color: "#ffffff", fontSize: "0.8rem", lineHeight: 1.5 },
  rcFields: { display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" as const },

  // Add form card
  formCard: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "10px", padding: "1.5rem", marginBottom: "2rem" },
  formTitle: { margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "#cba6f7" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 100px 1fr 110px", gap: "0.85rem", alignItems: "start" },

  // Fields
  field: { display: "flex", flexDirection: "column", gap: "4px" },
  label: { fontSize: "0.75rem", fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em" },
  labelSm: { fontSize: "0.7rem", fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { backgroundColor: "#18265b", border: "1px solid #45475a", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.5rem 0.75rem", outline: "none", boxSizing: "border-box", width: "100%" },

  // Empty state
  emptyState: { backgroundColor: "#18265b", border: "1px dashed #313244", borderRadius: "12px", padding: "3rem 2rem", textAlign: "center", marginBottom: "2rem" },
  emptyTitle: { margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600, color: "#cdd6f4" },
  emptyHint: { margin: 0, fontSize: "0.875rem", color: "#ffffff", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" },

  // Round section
  roundSection: { marginBottom: "1.5rem" },
  roundHeader: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" },
  roundLabel: { fontSize: "0.78rem", fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.06em" },
  roundCount: { fontSize: "0.75rem", color: "#ffffff" },

  // Match table
  matchTable: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  matchRow: {
    backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "8px",
    padding: "0.85rem 1.1rem", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
  },

  // Match content
  matchVsBlock: { display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "240px" },
  homeTeam: { fontSize: "0.95rem", fontWeight: 600, color: "#cdd6f4", textAlign: "right", flex: 1 },
  vsLabel: { fontSize: "0.9rem", color: "#ffffff", flexShrink: 0 },
  awayTeam: { fontSize: "0.95rem", fontWeight: 600, color: "#cdd6f4", textAlign: "left", flex: 1 },
  scoreBlock: { fontSize: "1rem", fontWeight: 800, color: "#a6e3a1", fontFamily: "monospace", flexShrink: 0, padding: "0.1rem 0.5rem", backgroundColor: "rgba(166,227,161,.1)", borderRadius: "4px" },
  matchMeta: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
  dateChip: { fontSize: "0.78rem", color: "#cdd6f4", backgroundColor: "#18265b", border: "1px solid #45475a", borderRadius: "4px", padding: "0.15rem 0.5rem" },
  resultChip: { fontSize: "0.75rem", color: "#a6e3a1", backgroundColor: "rgba(166,227,161,.1)", border: "1px solid rgba(166,227,161,.3)", borderRadius: "4px", padding: "0.15rem 0.5rem" },
  venueChip: { fontSize: "0.78rem", color: "#f9e2af", backgroundColor: "rgba(249,226,175,.08)", border: "1px solid rgba(249,226,175,.25)", borderRadius: "4px", padding: "0.15rem 0.5rem" },
  matchActions: { display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" },

  // Edit inline form
  editForm: { display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" },
  editControls: { display: "flex", alignItems: "flex-end", gap: "0.75rem", flexWrap: "wrap" },
};
