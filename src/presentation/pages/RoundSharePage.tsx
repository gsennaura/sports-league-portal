import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE } from "@infrastructure/apiBase";
import seteNosLogo from "../../images/sete_nos_esportes.png";
import seteColinasLogo from "../../images/sete_colinas.png";

// ─── Types ───────────────────────────────────────────────────────────────────

type MatchRow = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round_number: number | null;
  match_date: string | null;
  home_score: number | null;
  away_score: number | null;
  venue_id: string | null;
};

type TeamInfo = { name: string; logo: string | null };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NO_SHIELD =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/clubs/no_club_shield.png";

function Shield({ url, size = 64 }: { url: string | null; size?: number }) {
  return (
    <img
      src={url ?? NO_SHIELD}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = NO_SHIELD;
      }}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      alt=""
    />
  );
}

function fmtDateHeading(isoDate: string): string {
  if (isoDate === "sem-data") return "Data não definida";
  const d = new Date(`${isoDate}T12:00:00`);
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day}`;
}

function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  const t = iso.includes("T") ? iso.split("T")[1]?.slice(0, 5) : null;
  return t && t !== "00:00" ? `${t}h` : null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RoundSharePage() {
  const [sp] = useSearchParams();
  const groupId   = sp.get("groupId") ?? "";
  const round     = parseInt(sp.get("round") ?? "0", 10);
  const champName = sp.get("champ")  ?? "Campeonato";
  const phaseName = sp.get("fase")   ?? "";
  const groupName = sp.get("grupo")  ?? "";

  const [matches,  setMatches]  = useState<MatchRow[]>([]);
  const [teamMap,  setTeamMap]  = useState<Record<string, TeamInfo>>({});
  const [venueMap, setVenueMap] = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    document.title = `Rodada ${round} · ${champName}`;
    if (!groupId) { setLoading(false); return; }

    (async () => {
      const [allMatches, groupTeams, allClubs, allVenues] = await Promise.all([
        fetch(`${API_BASE}/groups/${groupId}/matches`).then(r => r.ok ? r.json() as Promise<MatchRow[]> : [] as MatchRow[]),
        fetch(`${API_BASE}/groups/${groupId}/teams`).then(r => r.ok ? r.json() as Promise<{ team_id: string; team_name: string }[]> : []),
        fetch(`${API_BASE}/clubs`).then(r => r.ok ? r.json() as Promise<{ id: string; logo_url: string | null }[]> : []),
        fetch(`${API_BASE}/venues`).then(r => r.ok ? r.json() as Promise<{ id: string; name: string }[]> : []),
      ]);

      const roundMatches = allMatches.filter(m => (m.round_number ?? 0) === round);
      setMatches(roundMatches);

      const vMap: Record<string, string> = {};
      for (const v of allVenues) vMap[v.id] = v.name;
      setVenueMap(vMap);

      const clubMap  = new Map(allClubs.map(c => [c.id, c.logo_url]));
      const nameMap  = new Map(groupTeams.map(t => [t.team_id, t.team_name]));
      const uniqueIds = [...new Set(roundMatches.flatMap(m => [m.home_team_id, m.away_team_id]))];

      const rawTeams = await Promise.all(
        uniqueIds.map(id =>
          fetch(`${API_BASE}/teams/${id}`)
            .then(r => r.ok ? r.json() as Promise<{ id: string; name: string; club_id: string | null }> : null)
            .catch(() => null),
        ),
      );

      const infos: Record<string, TeamInfo> = {};
      for (const t of rawTeams) {
        if (!t) continue;
        infos[t.id] = {
          name: nameMap.get(t.id) ?? t.name,
          logo: t.club_id ? (clubMap.get(t.club_id) ?? null) : null,
        };
      }
      setTeamMap(infos);
    })().catch(e => setError((e as Error).message)).finally(() => setLoading(false));
  }, [groupId, round]);

  const getTeam = (id: string): TeamInfo =>
    teamMap[id] ?? { name: id.slice(0, 8) + "…", logo: null };

  const context = [phaseName, groupName].filter(Boolean).join("  ·  ");

  // Group by date (sorted chronologically, sem-data last)
  const byDate = new Map<string, MatchRow[]>();
  for (const m of matches) {
    const key = m.match_date?.split("T")[0] ?? "sem-data";
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  }
  const dateKeys = [...byDate.keys()].sort((a, b) => {
    if (a === "sem-data") return 1;
    if (b === "sem-data") return -1;
    return a.localeCompare(b);
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background: #0a0303; }
        * { box-sizing: border-box; }
      `}</style>

      <div className="modal-overlay">

        {/* Close button */}
        <button onClick={() => window.close()} className="btn btn-secondary" title="Fechar">✕</button>

        {loading && (
          <div className="muted">
            <p style={{ color: "#fca5a5", fontSize: "1.2rem" }}>Carregando…</p>
          </div>
        )}

        {error && (
          <div className="muted">
            <p style={{ color: "#f87171" }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div id="round-card" className="card">

            {/* Top accent bar */}
            <div className="hero__bar" />

            {/* Header: logos + championship info */}
            <div className="toolbar">
              <div className="logo-pair">
                <img src={seteColinasLogo} className="avatar avatar--lg" alt="Liga" />
                <img src={seteNosLogo}    className="avatar"  alt="Sete nos Esportes" />
              </div>
              <div className="team-name">{champName}</div>
              {context && <div className="muted">{context}</div>}
            </div>

            {/* Divider */}
            <div  />

            {/* Round section */}
            <div className="page-section">
              <div className="muted">R O D A D A</div>
              <div className="muted">{round}</div>
            </div>

            {/* Gradient separator */}
            <div  />

            {/* Matches grouped by date */}
            <div className="data-list">
              {matches.length === 0 && (
                <div style={{ color: "#5a3030", textAlign: "center", padding: "48px 0", fontSize: "1.1rem" }}>
                  Nenhuma partida nesta rodada.
                </div>
              )}

              {dateKeys.map(dateKey => {
                const dayMatches = byDate.get(dateKey)!;
                return (
                  <div key={dateKey} className="page-section">
                    {/* Date heading */}
                    <div className="section-heading">
                      <div className="muted" />
                      <span className="muted">{fmtDateHeading(dateKey)}</span>
                      <div className="muted" />
                    </div>

                    {dayMatches.map(m => {
                      const home      = getTeam(m.home_team_id);
                      const away      = getTeam(m.away_team_id);
                      const hasScore  = m.home_score != null && m.away_score != null;
                      const homeWin   = hasScore && m.home_score! > m.away_score!;
                      const awayWin   = hasScore && m.away_score! > m.home_score!;
                      const draw      = hasScore && m.home_score === m.away_score;
                      const time      = fmtTime(m.match_date);
                      const venueName = m.venue_id ? (venueMap[m.venue_id] ?? null) : null;

                      return (
                        <div key={m.id} className="card">
                          <div  />

                          <div className="match-team-row">
                            {/* Home */}
                            <div className="match-team-row">
                              <div className="team-name">
                                <div style={{
                                  ...S.teamName,
                                  fontWeight: homeWin ? 700 : 500,
                                  color: homeWin ? "#fca5a5" : draw ? "#fcd34d" : hasScore ? "#7a5050" : "#f0dede",
                                }}>
                                  {home.name}
                                </div>
                                {homeWin && <div className="badge badge--success">VENCEDOR</div>}
                              </div>
                              <Shield url={home.logo} size={56} />
                            </div>

                            {/* Score / VS */}
                            <div className="score-box">
                              {hasScore ? (
                                <div className="score-big">
                                  {m.home_score} – {m.away_score}
                                </div>
                              ) : (
                                <div className="score-sep">vs</div>
                              )}
                            </div>

                            {/* Away */}
                            <div className="match-team-row">
                              <Shield url={away.logo} size={56} />
                              <div className="team-name">
                                <div style={{
                                  ...S.teamName,
                                  fontWeight: awayWin ? 700 : 500,
                                  color: awayWin ? "#fca5a5" : draw ? "#fcd34d" : hasScore ? "#7a5050" : "#f0dede",
                                  textAlign: "left",
                                }}>
                                  {away.name}
                                </div>
                                {awayWin && <div style={{ ...S.winnerBadge, textAlign: "left" }}>VENCEDOR</div>}
                              </div>
                            </div>
                          </div>

                          {/* Time + venue */}
                          {(time || venueName) && (
                            <div className="muted">
                              {time      && <span>🕐 {time}</span>}
                              {time && venueName && <span style={{ color: "#4a2020" }}>·</span>}
                              {venueName && <span>🏟 {venueName}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Bottom accent bar */}
            <div className="hero__bar" />
          </div>
        )}
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 10000,
    background: "#0a0303",
    overflowY: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    paddingBottom: 48,
  },

  closeBtn: {
    position: "fixed" as const,
    top: 16,
    right: 20,
    zIndex: 10002,
    background: "#2a0e0e",
    border: "1px solid #4a2020",
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#fca5a5",
    fontSize: "1rem",
    lineHeight: 1,
  },

  centerMsg: {
    position: "fixed" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    width: 1080,
    minHeight: 1080,
    background: "linear-gradient(180deg, #150707 0%, #120606 100%)",
    boxShadow: "0 16px 80px rgba(0,0,0,0.8)",
    display: "flex",
    flexDirection: "column" as const,
  },

  accentBar: {
    height: 14,
    background: "linear-gradient(90deg, #7f1d1d 0%, #dc2626 45%, #f97316 100%)",
  },

  header: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "40px 60px 24px",
    gap: 10,
  },

  logoPair: {
    display: "flex",
    alignItems: "center",
    gap: 36,
    marginBottom: 10,
  },

  logoMain: {
    width: 108,
    height: 108,
    objectFit: "contain" as const,
    filter: "drop-shadow(0 0 24px rgba(220,38,38,0.45))",
  },

  logoSec: {
    width: 88,
    height: 88,
    objectFit: "contain" as const,
    filter: "drop-shadow(0 0 18px rgba(249,115,22,0.35))",
  },

  champName: {
    fontSize: 26,
    fontWeight: 600,
    color: "#fef2f2",
    textAlign: "center" as const,
    letterSpacing: "0.02em",
  },

  contextLine: {
    fontSize: 18,
    color: "#8a5050",
    textAlign: "center" as const,
    letterSpacing: "0.04em",
  },

  divider: {
    margin: "0 80px",
    borderTop: "1px solid #2d1212",
  },

  roundSection: {
    textAlign: "center" as const,
    padding: "28px 60px 4px",
  },

  rodadaLabel: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.45em",
    color: "#5a2828",
    marginBottom: 0,
  },

  roundNumber: {
    fontSize: 160,
    fontWeight: 900,
    lineHeight: 0.9,
    background: "linear-gradient(90deg, #dc2626 0%, #f97316 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    filter: "drop-shadow(0 0 32px rgba(220,38,38,0.4))",
  },

  gradSep: {
    margin: "12px 80px 0",
    height: 3,
    background: "linear-gradient(90deg, #7f1d1d 0%, #dc2626 50%, #f97316 100%)",
    borderRadius: 2,
  },

  matchList: {
    padding: "28px 40px 40px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
    flex: 1,
  },

  dateGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    marginBottom: 28,
  },

  dateHeading: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 4,
  },

  dateLine: {
    flex: 1,
    height: 1,
    background: "linear-gradient(90deg, transparent, #3d1414)",
  },

  dateText: {
    fontSize: 17,
    fontWeight: 600,
    color: "#f87171",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },

  matchCard: {
    background: "linear-gradient(135deg, #1c0b0b 0%, #200d0d 100%)",
    border: "1px solid #3b1313",
    borderRadius: 16,
    padding: "20px 28px 14px",
    position: "relative" as const,
    overflow: "hidden",
  },

  edgeAccent: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: "linear-gradient(180deg, #dc2626, #f97316)",
    borderRadius: "16px 0 0 16px",
  },

  teamsRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  teamSideHome: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 14,
    justifyContent: "flex-end",
    minWidth: 0,
    overflow: "hidden" as const,
  },

  teamNameWrapHome: {
    minWidth: 0,
    overflow: "hidden" as const,
    textAlign: "right" as const,
  },

  teamSideAway: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 14,
    justifyContent: "flex-start",
    minWidth: 0,
    overflow: "hidden" as const,
  },

  teamNameWrapAway: {
    minWidth: 0,
    overflow: "hidden" as const,
    textAlign: "left" as const,
  },

  teamName: {
    fontSize: 26,
    lineHeight: 1.2,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  winnerBadge: {
    fontSize: 10,
    color: "#fca5a5",
    letterSpacing: "0.08em",
    marginTop: 3,
    textAlign: "right" as const,
  },

  scoreBox: {
    width: 140,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 8px",
  },

  score: {
    fontSize: 40,
    fontWeight: 800,
    fontFamily: "'Courier New', monospace",
    background: "linear-gradient(90deg, #fca5a5, #fdba74)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    lineHeight: 1,
    letterSpacing: "-0.02em",
    textAlign: "center" as const,
  },

  vsText: {
    fontSize: 28,
    color: "#3a1616",
    fontWeight: 300,
    letterSpacing: "0.1em",
  },

  matchMeta: {
    textAlign: "center" as const,
    marginTop: 10,
    fontSize: 14,
    color: "#8a5050",
    letterSpacing: "0.03em",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap" as const,
  },
};
