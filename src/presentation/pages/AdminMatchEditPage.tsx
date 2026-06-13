import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { UpdateMatch } from "@application/use_cases/UpdateMatch";
import type { GetMatchDetail } from "@application/use_cases/GetMatchDetail";
import type { ListVenues } from "@application/use_cases/ListVenues";
import type { ListReferees } from "@application/use_cases/ListReferees";
import type { MatchDetail } from "@domain/entities/MatchDetail";
import type { Venue } from "@domain/entities/Venue";
import type { Referee } from "@domain/entities/Referee";
import type { MatchReferee, RefereeRole } from "@domain/entities/MatchReferee";
import { ROLE_LABELS } from "@domain/entities/MatchReferee";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface Props {
  getMatchDetail: GetMatchDetail;
  updateMatch: UpdateMatch;
  listVenues: ListVenues;
  listReferees: ListReferees;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert ISO datetime string to value suitable for <input type="datetime-local"> */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // Handles "2024-06-15T18:00:00" or "2024-06-15T18:00:00Z"
  return iso.slice(0, 16);
}

/** Convert datetime-local value back to ISO-8601 string with seconds */
function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  return `${value}:00`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminMatchEditPage({ getMatchDetail, updateMatch, listVenues, listReferees }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Finish confirmation modal
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [pendingFinish, setPendingFinish] = useState<boolean | null>(null);

  // Form fields
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [homePen, setHomePen] = useState("");
  const [awayPen, setAwayPen] = useState("");
  const [hasPenalties, setHasPenalties] = useState(false);
  const [matchDate, setMatchDate] = useState("");
  const [roundNumber, setRoundNumber] = useState("");
  const [venueId, setVenueId] = useState<string>("");
  const [matchStatus, setMatchStatus] = useState("scheduled");

  // Referee team state
  const [matchReferees, setMatchReferees] = useState<MatchReferee[]>([]);
  const [allReferees, setAllReferees] = useState<Referee[]>([]);
  const [selRefereeId, setSelRefereeId] = useState("");
  const [selRole, setSelRole] = useState<RefereeRole>("main_referee");
  const [addingRef, setAddingRef] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getMatchDetail.execute(id),
      listVenues.execute(),
      listReferees.execute(),
    ])
      .then(([m, v, refs]) => {
        setMatch(m);
        setVenues(v);
        setAllReferees(refs);
        setMatchReferees(m.referees ?? []);

        if (m.home_score != null) setHomeScore(String(m.home_score));
        if (m.away_score != null) setAwayScore(String(m.away_score));
        if (m.home_penalty_score != null) {
          setHomePen(String(m.home_penalty_score));
          setAwayPen(String(m.away_penalty_score ?? ""));
          setHasPenalties(true);
        }
        setMatchDate(toDatetimeLocal(m.match_date));
        setRoundNumber(String(m.round_number));
        setVenueId(m.venue_id ?? "");
        setMatchStatus(m.status ?? "scheduled");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (hasPenalties && (homePen === "" || awayPen === "")) {
      setError("Gols de pênalti de ambos os times são obrigatórios.");
      return;
    }
    if (hasPenalties && homePen === awayPen) {
      setError("Na disputa de pênaltis deve haver um vencedor (placares diferentes).");
      return;
    }
    if (!id) return;

    // Se ainda não está encerrada, pergunta se deseja encerrar agora
    if (matchStatus !== "finished" && pendingFinish === null) {
      setShowFinishModal(true);
      return;
    }

    await doSave();
  }

  async function doSave(finishOverride?: boolean) {
    if (!id) return;
    const statusToSave = finishOverride === true
      ? "finished"
      : finishOverride === false
        ? matchStatus
        : matchStatus;

    setSubmitting(true);
    try {
      await updateMatch.execute(id, {
        home_score: homeScore !== "" ? parseInt(homeScore, 10) : null,
        away_score: awayScore !== "" ? parseInt(awayScore, 10) : null,
        home_penalty_score: hasPenalties ? parseInt(homePen, 10) : null,
        away_penalty_score: hasPenalties ? parseInt(awayPen, 10) : null,
        match_date: fromDatetimeLocal(matchDate),
        round_number: roundNumber !== "" ? parseInt(roundNumber, 10) : null,
        venue_id: venueId !== "" ? venueId : null,
        status: statusToSave,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/partidas/${id}`), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar partida.");
    } finally {
      setSubmitting(false);
      setPendingFinish(null);
    }
  }

  async function handleAddReferee() {
    if (!selRefereeId || !id) return;
    setAddingRef(true);
    setRefError(null);
    try {
      const resp = await fetch(`${API_BASE}/matches/${id}/referees`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ referee_id: selRefereeId, role: selRole }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({})) as { detail?: string };
        throw new Error(data.detail ?? "Erro ao adicionar árbitro.");
      }
      const added = await resp.json() as MatchReferee;
      setMatchReferees((prev) => [...prev, added]);
      setSelRefereeId("");
    } catch (err) {
      setRefError(err instanceof Error ? err.message : "Erro ao adicionar árbitro.");
    } finally {
      setAddingRef(false);
    }
  }

  async function handleRemoveReferee(matchRefereeId: string) {
    if (!id) return;
    setRefError(null);
    try {
      const resp = await fetch(`${API_BASE}/matches/${id}/referees/${matchRefereeId}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (!resp.ok) throw new Error("Erro ao remover árbitro.");
      setMatchReferees((prev) => prev.filter((r) => r.id !== matchRefereeId));
    } catch (err) {
      setRefError(err instanceof Error ? err.message : "Erro ao remover árbitro.");
    }
  }

  if (loading) return <main className="page-container"><p className="muted">Carregando...</p></main>;

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <button onClick={() => navigate(-1)} className="back-link">← Voltar</button>
          <h1 className="page-title">Editar Partida</h1>
        </div>
      </header>

      <main className="page-container">
        {match && (
          <div className="muted">
            <span className="team-name">{match.home_team_name}</span>
            <span className="score-sep">×</span>
            <span className="team-name">{match.away_team_name}</span>
            <div className="muted">
              {match.championship_name} {match.championship_year}
              {match.phase_name ? ` · ${match.phase_name}` : ""}
            </div>
            <div className="muted">Os times participantes não podem ser alterados.</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-body" noValidate>

          {/* ── Placar ─────────────────────────────────────────────── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Placar</legend>

            <div className="score-grid">
              <div className="score-slot">
                <label className="form-label" htmlFor="home-score">
                  {match?.home_team_name ?? "Mandante"}
                </label>
                <input
                  id="home-score"
                  type="number"
                  min={0}
                  className="form-input"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  placeholder="—"
                />
              </div>

              <span className="score-sep">–</span>

              <div className="score-slot">
                <label className="form-label" htmlFor="away-score">
                  {match?.away_team_name ?? "Visitante"}
                </label>
                <input
                  id="away-score"
                  type="number"
                  min={0}
                  className="form-input"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  placeholder="—"
                />
              </div>
            </div>

            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={hasPenalties}
                onChange={(e) => setHasPenalties(e.target.checked)}
              />
              <span style={{ marginLeft: "0.4rem" }}>Jogo foi para pênaltis</span>
            </label>

            {hasPenalties && (
              <div style={{ ...S.scoreRow, marginTop: "0.75rem" }}>
                <div className="score-slot">
                  <label className="form-label" htmlFor="home-pen">Pênaltis mandante</label>
                  <input
                    id="home-pen"
                    type="number"
                    min={0}
                    className="form-input"
                    value={homePen}
                    onChange={(e) => setHomePen(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <span className="score-sep">–</span>
                <div className="score-slot">
                  <label className="form-label" htmlFor="away-pen">Pênaltis visitante</label>
                  <input
                    id="away-pen"
                    type="number"
                    min={0}
                    className="form-input"
                    value={awayPen}
                    onChange={(e) => setAwayPen(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* ── Data e Rodada ──────────────────────────────────────── */}
          <fieldset style={{ ...S.fieldset, marginTop: "1.25rem" }}>
            <legend className="form-legend">Data e Rodada</legend>

            <div className="form-field-group">
              <div className="form-field-group">
                <label className="form-label" htmlFor="match-date">Data e hora</label>
                <input
                  id="match-date"
                  type="datetime-local"
                  className="form-input"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                />
              </div>

              <div style={{ ...S.fieldGroup, maxWidth: "120px" }}>
                <label className="form-label" htmlFor="round-number">Rodada</label>
                <input
                  id="round-number"
                  type="number"
                  min={1}
                  className="form-input"
                  value={roundNumber}
                  onChange={(e) => setRoundNumber(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>
          </fieldset>

          {/* ── Estádio ────────────────────────────────────────────── */}
          <fieldset style={{ ...S.fieldset, marginTop: "1.25rem" }}>
            <legend className="form-legend">Estádio</legend>

            <div className="form-field-group">
              <label className="form-label" htmlFor="venue-id">Local da partida</label>
              <select
                id="venue-id"
                className="form-select"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
              >
                <option value="">Estádio do mandante (padrão)</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <span className="muted">
                Se não selecionado, usa o estádio do time mandante.
              </span>
            </div>
          </fieldset>

          {/* ── Status da Partida ──────────────────────────────── */}
          <fieldset style={{ ...S.fieldset, marginTop: "1.25rem" }}>
            <legend className="form-legend">Status da Partida</legend>

            <div className="form-field-group">
              <label className="form-label" htmlFor="match-status">Status</label>
              <select
                id="match-status"
                className="form-select"
                value={matchStatus}
                onChange={(e) => setMatchStatus(e.target.value)}
              >
                <option value="scheduled">Agendada</option>
                <option value="in_progress">Ao vivo</option>
                <option value="finished">Encerrada</option>
              </select>
            </div>
          </fieldset>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">✓ Partida salva! Redirecionando…</p>}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Salvando…" : "Salvar partida"}
            </button>
          </div>
        </form>

        {/* ── Equipe de Arbitragem (fora do form — gerenciamento assíncrono) ── */}
        <section style={{ ...S.form, marginTop: "1.5rem" }}>
          <span style={{ ...S.legend, display: "block", marginBottom: "1rem" }}>Equipe de Arbitragem</span>

          {/* Current referees */}
          {matchReferees.length === 0 ? (
            <p style={{ color: "#7f849c", fontSize: "0.85rem", margin: "0 0 1rem" }}>Nenhum árbitro vinculado.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {matchReferees.map((mr) => (
                <div key={mr.id} className="form-field-group">
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "var(--c-text)", fontWeight: 600, fontSize: "0.9rem" }}>
                      {mr.referee_name ?? mr.referee_id}
                    </span>
                    {mr.referee_nickname && (
                      <span style={{ color: "var(--c-action)", fontSize: "0.8rem", marginLeft: "0.4rem" }}>
                        "{mr.referee_nickname}"
                      </span>
                    )}
                    <span style={{
                      marginLeft: "0.6rem",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "4px",
                      background: mr.role === "main_referee" ? "#f9e2af22" : mr.role === "assistant" ? "#89b4fa22" : "#a6e3a122",
                      color: mr.role === "main_referee" ? "#f9e2af" : mr.role === "assistant" ? "#89b4fa" : "#a6e3a1",
                    }}>
                      {ROLE_LABELS[mr.role as keyof typeof ROLE_LABELS] ?? mr.role}
                    </span>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemoveReferee(mr.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add referee */}
          <div className="form-field-group">
            <select
              style={{ ...S.selectInput, flex: 2 }}
              value={selRefereeId}
              onChange={(e) => setSelRefereeId(e.target.value)}
            >
              <option value="">Selecionar árbitro…</option>
              {allReferees
                .filter((r) => !matchReferees.some((mr) => mr.referee_id === r.id))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.nickname ? ` (${r.nickname})` : ""}
                  </option>
                ))}
            </select>
            <select
              style={{ ...S.selectInput, flex: 1 }}
              value={selRole}
              onChange={(e) => setSelRole(e.target.value as RefereeRole)}
            >
              <option value="main_referee">Árbitro</option>
              <option value="assistant">Assistente</option>
              <option value="delegate">Representante</option>
            </select>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleAddReferee}
              disabled={!selRefereeId || addingRef}
            >
              {addingRef ? "…" : "+ Adicionar"}
            </button>
          </div>

          {refError && <p style={{ ...S.errorMsg, marginTop: "0.5rem" }}>{refError}</p>}
        </section>
      </main>

      {/* ── Modal: encerrar partida? ───────────────────────────────── */}
      {showFinishModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--c-brand)", border: "1px solid #45475a", borderRadius: 14, padding: "1.75rem", width: "min(90vw, 400px)", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--c-text)" }}>Encerrar partida?</span>
            <p style={{ color: "#ffffff", fontSize: "0.88rem", margin: 0 }}>
              Deseja marcar esta partida como <strong style={{ color: "var(--c-negative)" }}>encerrada</strong> ao salvar?
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
              <button
                style={{ background: "none", border: "1px solid #45475a", borderRadius: 8, padding: "0.5rem 1rem", color: "#ffffff", fontSize: "0.875rem", cursor: "pointer" }}
                onClick={() => { setShowFinishModal(false); setPendingFinish(false); void doSave(false); }}
              >
                Não, manter status atual
              </button>
              <button
                style={{ background: "var(--c-negative)", border: "none", borderRadius: 8, padding: "0.5rem 1.1rem", color: "var(--c-brand)", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}
                onClick={() => { setShowFinishModal(false); setPendingFinish(true); void doSave(true); }}
              >
                Sim, encerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "linear-gradient(135deg, #18265b 0%, #313244 100%)",
    borderBottom: "1px solid #45475a",
    position: "relative",
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute", inset: 0,
    background: "linear-gradient(90deg, rgba(137,180,250,0.06) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  heroInner: {
    maxWidth: "720px", margin: "0 auto",
    padding: "1.5rem 1.5rem 1.25rem",
  },
  back: {
    background: "none", border: "none", cursor: "pointer",
    color: "#89b4fa", fontSize: "0.85rem", padding: 0, marginBottom: "0.5rem",
    display: "block",
  },
  title: {
    margin: 0, fontSize: "1.5rem", fontWeight: 700,
    color: "#cdd6f4", letterSpacing: "-0.02em",
  },
  page: {
    maxWidth: "720px", margin: "2rem auto", padding: "0 1.5rem 4rem",
  },
  muted: { color: "#cdd6f4" },
  matchInfo: {
    background: "#18265b", border: "1px solid #313244", borderRadius: "10px",
    padding: "1rem 1.25rem", marginBottom: "1.5rem",
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem",
  },
  teamName: { color: "#cdd6f4", fontWeight: 600, fontSize: "1rem" },
  vs: { color: "#cdd6f4", fontWeight: 700 },
  matchMeta: { width: "100%", color: "#7f849c", fontSize: "0.82rem" },
  matchNote: {
    width: "100%", color: "#f38ba8", fontSize: "0.78rem", fontStyle: "italic",
  },
  form: {
    background: "#18265b", border: "1px solid #313244", borderRadius: "12px",
    padding: "1.5rem",
  },
  fieldset: {
    border: "none", margin: 0, padding: 0,
  },
  legend: {
    color: "#89b4fa", fontSize: "0.78rem", fontWeight: 600,
    letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: "1rem", display: "block",
  },
  scoreRow: {
    display: "flex", alignItems: "flex-end", gap: "1rem",
  },
  scoreField: {
    display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1,
  },
  label: {
    color: "#cdd6f4", fontSize: "0.82rem", fontWeight: 500,
  },
  scoreInput: {
    background: "#18265b", border: "1px solid #45475a", borderRadius: "8px",
    padding: "0.6rem 0.75rem", color: "#cdd6f4", fontSize: "1.4rem",
    fontWeight: 700, textAlign: "center" as const, width: "100%",
    outline: "none",
  },
  scoreSep: {
    color: "#7f849c", fontSize: "1.5rem", fontWeight: 700,
    paddingBottom: "0.6rem", flexShrink: 0,
  },
  checkRow: {
    display: "flex", alignItems: "center", marginTop: "1rem",
    color: "#cdd6f4", fontSize: "0.85rem", cursor: "pointer",
  },
  fieldRow: {
    display: "flex", gap: "1rem", flexWrap: "wrap",
  },
  fieldGroup: {
    display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1,
  },
  textInput: {
    background: "#18265b", border: "1px solid #45475a", borderRadius: "8px",
    padding: "0.6rem 0.75rem", color: "#cdd6f4", fontSize: "0.95rem",
    width: "100%", outline: "none",
  },
  selectInput: {
    background: "#18265b", border: "1px solid #45475a", borderRadius: "8px",
    padding: "0.6rem 0.75rem", color: "#cdd6f4", fontSize: "0.95rem",
    width: "100%", outline: "none", cursor: "pointer",
  },
  hint: {
    color: "#7f849c", fontSize: "0.75rem",
  },
  errorMsg: {
    color: "#f38ba8", fontSize: "0.85rem", marginTop: "1rem", marginBottom: 0,
  },
  successMsg: {
    color: "#a6e3a1", fontSize: "0.85rem", marginTop: "1rem", marginBottom: 0,
  },
  actions: {
    display: "flex", gap: "0.75rem", justifyContent: "flex-end",
    marginTop: "1.5rem",
  },
  btnCancel: {
    background: "none", border: "1px solid #45475a", borderRadius: "8px",
    padding: "0.6rem 1.25rem", color: "#cdd6f4", fontSize: "0.875rem",
    cursor: "pointer",
  },
  btnSave: {
    background: "#89b4fa", border: "none", borderRadius: "8px",
    padding: "0.6rem 1.5rem", color: "#18265b", fontSize: "0.875rem",
    fontWeight: 700, cursor: "pointer",
  },
  refRow: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    background: "#18265b", border: "1px solid #313244", borderRadius: "8px",
    padding: "0.5rem 0.75rem",
  },
  refRemoveBtn: {
    background: "none", border: "1px solid #45475a44", borderRadius: "5px",
    color: "#7f849c", cursor: "pointer", fontSize: "0.8rem",
    padding: "0.2rem 0.45rem", flexShrink: 0,
  },
  refAddRow: {
    display: "flex", gap: "0.5rem", flexWrap: "wrap",
  },
  btnAddRef: {
    background: "#cba6f722", border: "1px solid #cba6f744", borderRadius: "8px",
    padding: "0.6rem 1rem", color: "#cba6f7", fontSize: "0.875rem",
    fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
    flexShrink: 0,
  },
};

