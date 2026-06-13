import React, { useState, useEffect, useCallback } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { useNavigate } from "react-router-dom";
import minhaLigaLogo from "../../images/minha_liga.png";
import type { GetLiveWindowMatches } from "@application/use_cases/GetLiveWindowMatches";
import type { MatchDetail } from "@domain/entities/MatchDetail";

interface Props {
  getLiveWindowMatches: GetLiveWindowMatches;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

// ─── MatchCard ───────────────────────────────────────────────────────────────

function MatchCard({ match, onClick }: { match: MatchDetail; onClick: () => void }) {
  const isLive = match.status === "in_progress";
  const isFinished = match.status === "finished";

  return (
    <div
      className="person-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div style={S.cardHeader}>
        <span style={S.championship}>
          {match.championship_name} {match.championship_year}
        </span>
        <div style={S.cardHeaderRight}>
          {match.round_number != null && (
            <span style={S.round}>Rodada {match.round_number}</span>
          )}
          {isLive ? (
            <span style={S.liveTag}>
              <span style={S.liveDotSmall} />
              AO VIVO
            </span>
          ) : (
            <span style={S.matchTime}>
              {formatDate(match.match_date)} · {formatTime(match.match_date)}
            </span>
          )}
        </div>
      </div>

      <div style={S.teams}>
        {/* Home */}
        <div style={S.teamSide}>
          {match.home_club_logo_url && (
            <img src={match.home_club_logo_url} alt="" style={S.logo} />
          )}
          <span style={S.teamName}>{match.home_team_name}</span>
        </div>

        {/* Score / VS */}
        <div style={S.scoreBox}>
          {isLive || isFinished ? (
            <>
              <span style={{ ...S.score, color: isLive ? "#a6e3a1" : "#cdd6f4" }}>
                {match.home_score ?? 0} – {match.away_score ?? 0}
              </span>
              {match.home_penalty_score != null && (
                <span style={S.penalties}>
                  (pên: {match.home_penalty_score} – {match.away_penalty_score})
                </span>
              )}
            </>
          ) : (
            <span style={S.vs}>VS</span>
          )}
        </div>

        {/* Away */}
        <div style={{ ...S.teamSide, justifyContent: "flex-end" }}>
          <span style={S.teamName}>{match.away_team_name}</span>
          {match.away_club_logo_url && (
            <img src={match.away_club_logo_url} alt="" style={S.logo} />
          )}
        </div>
      </div>

      {(match.venue_name || match.city_name) && (
        <div style={S.venue}>
          {[match.venue_name, match.city_name].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function LiveMatchesPage({ getLiveWindowMatches }: Props) {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const data = await getLiveWindowMatches.execute();
      setMatches(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar partidas.");
    } finally {
      setLoading(false);
    }
  }, [getLiveWindowMatches]);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 30_000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const empty = !loading && !error && matches.length === 0;

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <img src={minhaLigaLogo} alt="Minha Liga" style={S.heroLogo} />
          <h1 className="page-title">Ao Vivo</h1>
          {lastUpdated && (
            <p className="page-subtitle">
              Atualizado às{" "}
              {lastUpdated.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>
      </header>

      <main className="page-container">
        {loading && <PageLoader />}
        {error && <p style={S.errorMsg}>{error}</p>}

        {!loading && (
          <>
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} onClick={() => navigate(`/partidas/${m.id}`)} />
            ))}

            {empty && (
              <p style={S.emptyMsg}>Nenhuma partida em andamento no momento.</p>
            )}
          </>
        )}
      </main>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "linear-gradient(135deg, #18265b 0%, #313244 100%)",
    borderBottom: "1px solid #45475a",
    position: "relative",
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(90deg, rgba(166,227,161,0.06) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  heroInner: {
    maxWidth: "860px",
    margin: "0 auto",
    padding: "1.5rem 1.5rem 1.25rem",
  },
  heroLogo: {
    height: "48px",
    width: "auto",
    objectFit: "contain",
    display: "block",
    marginBottom: "0.75rem",
    filter: "drop-shadow(0 1px 6px rgba(137,180,250,0.25))",
  },
  title: {
    margin: 0,
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#cdd6f4",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "0.25rem 0 0",
    fontSize: "0.8rem",
    color: "#7f849c",
  },
  page: {
    maxWidth: "860px",
    margin: "2rem auto",
    padding: "0 1.5rem 4rem",
  },
  muted: { color: "#cdd6f4" },
  errorMsg: { color: "#f38ba8", marginTop: "1rem" },
  emptyMsg: { color: "#7f849c", textAlign: "center", marginTop: "3rem" },
  // Card
  card: {
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "12px",
    padding: "1rem 1.25rem",
    marginBottom: "0.75rem",
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
    flexWrap: "wrap",
    gap: "0.25rem",
  },
  cardHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  championship: { color: "#7f849c", fontSize: "0.78rem" },
  round: { color: "#ffffff", fontSize: "0.75rem" },
  matchTime: { color: "#7f849c", fontSize: "0.78rem" },
  liveTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    background: "rgba(243,139,168,0.12)",
    color: "#f38ba8",
    borderRadius: "20px",
    padding: "0.15rem 0.6rem",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  liveDotSmall: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#f38ba8",
    display: "inline-block",
  },
  teams: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "0.75rem",
  },
  teamSide: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  teamName: {
    color: "#cdd6f4",
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  logo: {
    width: "28px",
    height: "28px",
    objectFit: "contain",
    flexShrink: 0,
  },
  scoreBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "70px",
  },
  score: {
    fontSize: "1.4rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  penalties: {
    color: "#7f849c",
    fontSize: "0.72rem",
    marginTop: "0.1rem",
  },
  vs: {
    color: "#ffffff",
    fontSize: "0.9rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  venue: {
    marginTop: "0.6rem",
    color: "#ffffff",
    fontSize: "0.75rem",
  },
};
