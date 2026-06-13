import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { UpdateMatchResult } from "@application/use_cases/UpdateMatchResult";
import type { MatchDetail } from "@domain/entities/MatchDetail";

interface Props {
  updateMatchResult: UpdateMatchResult;
  getMatchDetail: { execute(id: string): Promise<MatchDetail> };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminMatchResultPage({ updateMatchResult, getMatchDetail }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Form fields
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [homePen, setHomePen] = useState("");
  const [awayPen, setAwayPen] = useState("");
  const [hasPenalties, setHasPenalties] = useState(false);

  useEffect(() => {
    if (!id) return;
    getMatchDetail.execute(id)
      .then((m) => {
        setMatch(m);
        if (m.home_score != null) setHomeScore(String(m.home_score));
        if (m.away_score != null) setAwayScore(String(m.away_score));
        if (m.home_penalty_score != null) {
          setHomePen(String(m.home_penalty_score));
          setAwayPen(String(m.away_penalty_score ?? ""));
          setHasPenalties(true);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (homeScore === "" || awayScore === "") {
      setError("Placar mandante e visitante são obrigatórios.");
      return;
    }
    if (hasPenalties && (homePen === "" || awayPen === "")) {
      setError("Gols de pênalti de ambos os times são obrigatórios.");
      return;
    }
    if (hasPenalties && homePen === awayPen) {
      setError("Na disputa de pênaltis deve haver um vencedor (placares diferentes).");
      return;
    }
    if (!id) return;

    // Show confirmation modal instead of submitting immediately
    setShowFinishModal(true);
  }

  async function handleSave(finishMatch: boolean) {
    if (!id) return;
    setShowFinishModal(false);
    setSubmitting(true);
    try {
      await updateMatchResult.execute(id, {
        home_score: parseInt(homeScore, 10),
        away_score: parseInt(awayScore, 10),
        home_penalty_score: hasPenalties ? parseInt(homePen, 10) : null,
        away_penalty_score: hasPenalties ? parseInt(awayPen, 10) : null,
        finish_match: finishMatch,
      });
      setSuccess(true);
      setTimeout(() => navigate(-1), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar resultado.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="page-container"><p className="muted">Carregando...</p></main>;

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <button onClick={() => navigate(-1)} className="back-link">← Voltar</button>
          <h1 className="page-title">Resultado da Partida</h1>
        </div>
      </header>

      <main className="page-container">
        {match && (
          <div style={S.matchInfo}>
            <span style={S.teamName}>{match.home_team_name}</span>
            <span style={S.vs}>×</span>
            <span style={S.teamName}>{match.away_team_name}</span>
            <div style={S.matchMeta}>
              {match.championship_name} {match.championship_year}
              {match.phase_name ? ` · ${match.phase_name}` : ""}
              {match.match_date ? ` · ${fmtDate(match.match_date)}` : ""}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={S.form} noValidate>
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Placar</legend>

            <div style={S.scoreRow}>
              <div style={S.scoreField}>
                <label className="form-label" htmlFor="home-score">
                  {match?.home_team_name ?? "Mandante"}
                </label>
                <input
                  id="home-score"
                  type="number"
                  min={0}
                  style={S.scoreInput}
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  placeholder="0"
                  autoFocus
                  required
                />
              </div>

              <span style={S.scoreSep}>–</span>

              <div style={S.scoreField}>
                <label className="form-label" htmlFor="away-score">
                  {match?.away_team_name ?? "Visitante"}
                </label>
                <input
                  id="away-score"
                  type="number"
                  min={0}
                  style={S.scoreInput}
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <label style={S.checkRow}>
              <input
                type="checkbox"
                checked={hasPenalties}
                onChange={(e) => setHasPenalties(e.target.checked)}
              />
              <span style={{ marginLeft: "0.4rem" }}>Jogo foi para pênaltis</span>
            </label>

            {hasPenalties && (
              <div style={{ ...S.scoreRow, marginTop: "0.75rem" }}>
                <div style={S.scoreField}>
                  <label className="form-label" htmlFor="home-pen">Pênaltis mandante</label>
                  <input
                    id="home-pen"
                    type="number"
                    min={0}
                    style={S.scoreInput}
                    value={homePen}
                    onChange={(e) => setHomePen(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <span style={S.scoreSep}>–</span>
                <div style={S.scoreField}>
                  <label className="form-label" htmlFor="away-pen">Pênaltis visitante</label>
                  <input
                    id="away-pen"
                    type="number"
                    min={0}
                    style={S.scoreInput}
                    value={awayPen}
                    onChange={(e) => setAwayPen(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </fieldset>

          {error && <p style={S.errorMsg}>{error}</p>}
          {success && <p style={S.successMsg}>✓ Resultado salvo!</p>}

          <div style={S.actions}>
            <button type="button" style={S.btnCancel} onClick={() => navigate(-1)}>
              Cancelar
            </button>
            <button type="submit" style={S.btnSave} disabled={submitting}>
              {submitting ? "Salvando…" : "Salvar resultado"}
            </button>
          </div>
        </form>
      </main>

      {showFinishModal && (
        <div style={S.modalOverlay}>
          <div style={S.modalCard}>
            <h3 style={S.modalTitle}>Encerrar partida?</h3>
            <p style={S.modalBody}>
              Deseja também marcar esta partida como <strong style={{ color: "#a6e3a1" }}>encerrada</strong>?
              <br />
              <span style={{ fontSize: "0.82rem", color: "#ffffff" }}>
                Se não, o placar será salvo mas o status permanece inalterado.
              </span>
            </p>
            <div style={S.modalActions}>
              <button
                style={S.btnModalCancel}
                onClick={() => setShowFinishModal(false)}
              >
                Cancelar
              </button>
              <button
                style={S.btnModalSaveOnly}
                onClick={() => handleSave(false)}
                disabled={submitting}
              >
                Só salvar placar
              </button>
              <button
                style={S.btnModalFinish}
                onClick={() => handleSave(true)}
                disabled={submitting}
              >
                {submitting ? "Salvando…" : "Encerrar partida"}
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
  matchMeta: { width: "100%", color: "#cdd6f4", fontSize: "0.82rem" },
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
    color: "#cdd6f4", fontSize: "1.8rem", fontWeight: 700,
    paddingBottom: "0.4rem",
  },
  checkRow: {
    display: "flex", alignItems: "center", marginTop: "1rem",
    color: "#cdd6f4", fontSize: "0.85rem", cursor: "pointer",
  },
  errorMsg: {
    color: "#f38ba8", fontSize: "0.88rem", margin: "0.75rem 0 0",
    background: "rgba(243,139,168,0.1)", border: "1px solid rgba(243,139,168,0.25)",
    borderRadius: "6px", padding: "0.5rem 0.75rem",
  },
  successMsg: {
    color: "#a6e3a1", fontSize: "0.88rem", margin: "0.75rem 0 0",
    background: "rgba(166,227,161,0.1)", border: "1px solid rgba(166,227,161,0.25)",
    borderRadius: "6px", padding: "0.5rem 0.75rem",
  },
  actions: {
    display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem",
  },
  btnCancel: {
    background: "none", border: "1px solid #45475a", borderRadius: "8px",
    color: "#cdd6f4", padding: "0.55rem 1.1rem", fontSize: "0.88rem",
    cursor: "pointer",
  },
  btnSave: {
    background: "#89b4fa", border: "none", borderRadius: "8px",
    color: "#18265b", padding: "0.55rem 1.4rem", fontSize: "0.88rem",
    fontWeight: 700, cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1rem",
  },
  modalCard: {
    background: "#18265b", border: "1px solid #313244", borderRadius: "14px",
    padding: "1.75rem 2rem", maxWidth: "420px", width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  modalTitle: {
    margin: "0 0 0.75rem", fontSize: "1.15rem", fontWeight: 700, color: "#cdd6f4",
  },
  modalBody: {
    margin: "0 0 1.5rem", color: "#cdd6f4", fontSize: "0.92rem", lineHeight: 1.6,
  },
  modalActions: {
    display: "flex", justifyContent: "flex-end", gap: "0.65rem", flexWrap: "wrap",
  },
  btnModalCancel: {
    background: "none", border: "1px solid #45475a", borderRadius: "8px",
    color: "#ffffff", padding: "0.5rem 1rem", fontSize: "0.85rem", cursor: "pointer",
  },
  btnModalSaveOnly: {
    background: "none", border: "1px solid #89b4fa", borderRadius: "8px",
    color: "#89b4fa", padding: "0.5rem 1rem", fontSize: "0.85rem",
    fontWeight: 600, cursor: "pointer",
  },
  btnModalFinish: {
    background: "#a6e3a1", border: "none", borderRadius: "8px",
    color: "#18265b", padding: "0.5rem 1.2rem", fontSize: "0.85rem",
    fontWeight: 700, cursor: "pointer",
  },
};
