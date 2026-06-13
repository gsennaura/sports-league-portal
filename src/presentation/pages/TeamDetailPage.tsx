import { useState, useEffect, useRef } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toSlugPath } from "@utils/slug";
import type { GetTeamMatches } from "@application/use_cases/GetTeamMatches";
import type { GetTeamMatchYears } from "@application/use_cases/GetTeamMatchYears";
import type { GetTeamDetail } from "@application/use_cases/GetTeamDetail";
import type { GetTeamAthletes, AddAthleteToTeam } from "@application/use_cases/AthleteTeam";
import type { GetTeamAthleteStats } from "@application/use_cases/GetTeamAthleteStats";
import type { SearchAthletes } from "@application/use_cases/SearchAthletes";
import type { Team } from "@domain/entities/Team";
import type { TeamMatch } from "@domain/entities/TeamMatch";
import type { AthleteTeamHistory, Athlete, TeamAthleteStat } from "@domain/entities/Athlete";
import { useAuth } from "@presentation/context/AuthContext";

const NO_SHIELD = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/clubs/no_club_shield.png";

function Shield({ url, size = 18 }: { url: string | null; size?: number }) {
  return (
    <img
      src={url ?? NO_SHIELD}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_SHIELD; }}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      alt=""
    />
  );
}

const categoryLabel: Record<string, string> = {
  amador: "Amador",
  clube_social: "Clube Social",
  profissional: "Profissional",
  base: "Base",
  junior: "Júnior",
  juvenil: "Juvenil",
  infantil: "Infantil",
  mirim: "Mirim",
  "pre-mirim": "Pré-Mirim",
  master: "Master",
  universitaria: "Universitária",
};

interface TeamDetailPageProps {
  getTeamMatches: GetTeamMatches;
  getTeamMatchYears: GetTeamMatchYears;
  getTeamDetail: GetTeamDetail;
  getTeamAthletes: GetTeamAthletes;
  getTeamAthleteStats: GetTeamAthleteStats;
  addAthleteToTeam: AddAthleteToTeam;
  searchAthletes: SearchAthletes;
}

interface SeasonStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

function StatBadge({ label, value, bg, color }: { label: string; value: number; bg: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.2rem",
      background: bg,
      color,
      borderRadius: "12px",
      padding: "0.1rem 0.45rem",
      fontSize: "0.72rem",
      fontWeight: 700,
      lineHeight: 1.5,
      whiteSpace: "nowrap" as const,
    }}>
      {label} {value}
    </span>
  );
}

export function TeamDetailPage({ getTeamMatches, getTeamMatchYears, getTeamDetail, getTeamAthletes, getTeamAthleteStats, addAthleteToTeam, searchAthletes }: TeamDetailPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const id = slug?.slice(-36) ?? "";
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<TeamMatch[]>([]);
  const [matchYears, setMatchYears] = useState<number[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [athletes, setAthletes] = useState<AthleteTeamHistory[]>([]);
  const [statsMap, setStatsMap] = useState<Map<string, TeamAthleteStat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [yearModalOpen, setYearModalOpen] = useState(false);

  // Add athlete modal state
  const [addMode, setAddMode] = useState<null | "choice" | "existing">(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setMatchesLoading(true);
    setError(null);
    setMatches([]);
    setMatchYears([]);
    setSelectedSeason("");
    Promise.all([
      getTeamDetail.execute(id),
      getTeamAthletes.execute(id, true),
      getTeamMatchYears.execute(id),
    ]).then(async ([teamData, athleteData, years]) => {
      setTeam(teamData);
      setAthletes(athleteData);
      setMatchYears(years);
      const latestYear = years[0] ?? null;
      if (latestYear != null) setSelectedSeason(String(latestYear));
      setLoading(false);
      // Load stats (non-blocking)
      getTeamAthleteStats.execute(id).then((stats) => {
        const map = new Map<string, TeamAthleteStat>();
        for (const s of stats) map.set(s.athlete_id, s);
        setStatsMap(map);
      }).catch(() => { /* stats are optional */ });
      // Load matches for latest year
      if (latestYear != null) {
        try {
          const matchData = await getTeamMatches.execute(id, latestYear);
          setMatches(matchData);
        } finally {
          setMatchesLoading(false);
        }
      } else {
        setMatchesLoading(false);
      }
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setLoading(false);
      setMatchesLoading(false);
    });
  }, [id, getTeamMatches, getTeamMatchYears, getTeamDetail, getTeamAthletes, getTeamAthleteStats]);

  const handleYearSelect = async (year: string) => {
    setYearModalOpen(false);
    if (year === selectedSeason) return;
    setSelectedSeason(year);
    setMatches([]);
    setMatchesLoading(true);
    try {
      const matchData = await getTeamMatches.execute(id, parseInt(year, 10));
      setMatches(matchData);
    } finally {
      setMatchesLoading(false);
    }
  };
  return (
    <main style={styles.page}>
      <Link to="/clubes" style={styles.back}>← Clubes</Link>

      {loading && <PageLoader />}
      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={styles.titleRow}>
            {team?.club_logo_url && (
              <Shield url={team.club_logo_url} size={56} />
            )}
            <h1 style={styles.title}>{team?.name || "Time"}</h1>
          </div>

          {team && (
            <div style={styles.infoCard}>
              <InfoRow label="Cidade" value={team.city_name} />
              {team.venue_name && <InfoRow label="Estádio / Arena" value={team.venue_name} />}
              {team.president && <InfoRow label="Presidente" value={team.president} />}
              {team.founded_at && <InfoRow label="Fundação" value={formatDate(team.founded_at)} />}
              {team.category && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Categoria</span>
                  <span style={styles.infoValue}>{categoryLabel[team.category] ?? team.category}</span>
                </div>
              )}
              {team.club_id && team.club_name && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Clube</span>
                  <Link to={`/clubes/${toSlugPath(team.club_name, team.club_id)}`} style={styles.clubLink}>{team.club_name}</Link>
                </div>
              )}
            </div>
          )}

          {/* Elenco */}
          <section style={styles.rosterSection}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2 style={{ ...styles.seasonTitle, margin: 0 }}>Elenco ({athletes.length})</h2>
              {isAdmin && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Link
                    to={`/admin/times/${id}/inscricoes`}
                    style={{ background: "#1e66c8", color: "#ffffff", border: "1px solid #4a8ae8", borderRadius: 8, padding: "0.4rem 1rem", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", boxShadow: "0 2px 8px #1e66c844", letterSpacing: "0.02em" }}
                  >
                    📋 Inscrever em Campeonato
                  </Link>
                  <button
                    onClick={() => { setAddMode("choice"); setSearchQuery(""); setSearchResults([]); setSelectedAthleteId(""); setAddError(null); }}
                    style={{ background: "#1e3a2a", color: "#a6e3a1", border: "1px solid #2a5a3a", borderRadius: 8, padding: "0.35rem 0.85rem", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    + Adicionar atleta
                  </button>
                </div>
              )}
            </div>
            {athletes.length > 0 && (
              <table style={styles.rosterTable}>
                <thead>
                  <tr style={styles.rosterThead}>
                    <th style={{ ...styles.rosterTh, width: "2.5rem", textAlign: "center" }}>#</th>
                    <th style={styles.rosterTh}>Atleta</th>
                    <th style={{ ...styles.rosterTh, width: "7rem" }}>Posição</th>
                    <th style={{ ...styles.rosterTh, textAlign: "center" as const }}>Stats</th>
                    <th style={{ ...styles.rosterTh, width: "2.5rem" }} />
                  </tr>
                </thead>
                <tbody>
                  {[...athletes]
                    .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
                    .map((a) => {
                      const s = statsMap.get(a.athlete_id);
                      return (
                      <tr
                        key={a.id}
                        style={styles.rosterTr}
                        onClick={() => { window.location.href = `/atletas/${a.athlete_id}`; }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#252537"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                      >
                        <td style={{ ...styles.rosterTd, textAlign: "center", color: "#cba6f7", fontWeight: 700, fontSize: "0.8rem" }}>
                          {a.jersey_number != null ? `${a.jersey_number}` : "—"}
                        </td>
                        <td style={styles.rosterTd}>
                          <span style={{ fontSize: "0.88rem", color: "#cdd6f4", fontWeight: 600 }}>
                            {a.athlete_nickname ?? a.athlete_name ?? "—"}
                          </span>
                          {a.athlete_nickname && a.athlete_name && a.athlete_nickname !== a.athlete_name && (
                            <span style={{ fontSize: "0.74rem", color: "#ffffff", marginLeft: "0.4rem" }}>
                              {a.athlete_name}
                            </span>
                          )}
                        </td>
                        <td style={{ ...styles.rosterTd, fontSize: "0.78rem", color: "#ffffff" }}>
                          {a.athlete_position ?? "—"}
                        </td>
                        <td style={{ ...styles.rosterTd, textAlign: "center" as const }}>
                          <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center", flexWrap: "wrap" as const }}>
                            {s && s.goals > 0 && <StatBadge color="#a6e3a1" bg="#1a2e1a" label="⚽" value={s.goals} />}
                            {s && s.yellow_cards > 0 && <StatBadge color="#18265b" bg="#f9e2af" label="🟨" value={s.yellow_cards} />}
                            {s && s.red_cards > 0 && <StatBadge color="#fff" bg="#e04060" label="🟥" value={s.red_cards} />}
                          </div>
                        </td>
                        <td style={{ ...styles.rosterTd, textAlign: "center" }}>
                          <Link
                            to={`/atletas/${a.athlete_id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "#89b4fa", fontSize: "0.95rem", lineHeight: 1, textDecoration: "none", padding: "0.2rem 0.35rem", borderRadius: 5, display: "inline-block" }}
                            title="Ver atleta"
                          >
                            👁
                          </Link>
                        </td>
                      </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </section>

          {/* Add athlete modal */}
          {addMode !== null && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 14, padding: "1.5rem", width: "min(90vw, 420px)", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "#cdd6f4" }}>Adicionar atleta ao elenco</span>
                  <button onClick={() => setAddMode(null)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
                </div>

                {/* Step 1: choice */}
                {addMode === "choice" && (
                  <>
                    <p style={{ color: "#ffffff", fontSize: "0.875rem", margin: 0 }}>
                      Como deseja adicionar o atleta?
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <button
                        style={{ background: "#cba6f7", color: "#18265b", border: "none", borderRadius: 8, padding: "0.75rem 1rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}
                        onClick={() => setAddMode("existing")}
                      >
                        <span>Atleta existente</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 400, opacity: 0.85 }}>Buscar por nome, CPF ou e-mail</span>
                      </button>
                      <button
                        style={{ background: "#a6e3a1", color: "#18265b", border: "none", borderRadius: 8, padding: "0.75rem 1rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}
                        onClick={() => { setAddMode(null); navigate("/admin/atletas/novo", { state: { teamId: id, teamName: team?.name ?? "" } }); }}
                      >
                        <span>Criar novo atleta</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 400, opacity: 0.85 }}>Cadastrar atleta e já vincular a este time</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddMode(null)}
                      style={{ background: "none", border: "1px solid #45475a", borderRadius: 8, color: "#ffffff", padding: "0.4rem 0.85rem", fontSize: "0.82rem", cursor: "pointer", alignSelf: "flex-start" }}
                    >
                      Cancelar
                    </button>
                  </>
                )}

                {/* Step 2: search existing athlete */}
                {addMode === "existing" && (
                  <>
                    <input
                      type="text"
                      placeholder="Buscar atleta por nome..."
                      value={searchQuery}
                      autoFocus
                      onChange={(e) => {
                        const q = e.target.value;
                        setSearchQuery(q);
                        setSelectedAthleteId("");
                        if (searchTimer.current) clearTimeout(searchTimer.current);
                        if (q.length < 2) { setSearchResults([]); return; }
                        searchTimer.current = setTimeout(async () => {
                          try {
                            const results = await searchAthletes.execute(q);
                            setSearchResults(results.slice(0, 10));
                          } catch { setSearchResults([]); }
                        }, 300);
                      }}
                      style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 8, color: "#cdd6f4", padding: "0.5rem 0.8rem", fontSize: "0.9rem", outline: "none" }}
                    />

                    {searchResults.length > 0 && !selectedAthleteId && (
                      <div style={{ border: "1px solid #45475a", borderRadius: 8, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
                        {searchResults.map((a) => (
                          <div
                            key={a.id}
                            onClick={() => { setSelectedAthleteId(a.id); setSearchQuery(a.nickname ?? a.name); setSearchResults([]); }}
                            style={{ padding: "0.6rem 0.8rem", cursor: "pointer", borderBottom: "1px solid #313244", color: "#cdd6f4", fontSize: "0.88rem", background: "#18265b" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#313244")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#18265b")}
                          >
                            {a.nickname ? `${a.nickname} (${a.name})` : a.name}
                            {a.position && <span style={{ color: "#ffffff", marginLeft: "0.4rem", fontSize: "0.8rem" }}>{a.position}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem", color: "#ffffff" }}>
                      Data de início
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 8, color: "#cdd6f4", padding: "0.45rem 0.7rem", fontSize: "0.9rem", outline: "none" }}
                      />
                    </label>

                    {addError && <p style={{ color: "#f38ba8", fontSize: "0.82rem", margin: 0 }}>{addError}</p>}

                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setAddMode("choice")}
                        style={{ background: "none", border: "1px solid #45475a", borderRadius: 8, color: "#ffffff", padding: "0.4rem 0.85rem", fontSize: "0.82rem", cursor: "pointer" }}
                      >
                        ← Voltar
                      </button>
                      <button
                        disabled={!selectedAthleteId || !startDate || addLoading}
                        onClick={async () => {
                          if (!selectedAthleteId) return;
                          setAddLoading(true);
                          setAddError(null);
                          try {
                            const entry = await addAthleteToTeam.execute(selectedAthleteId, { team_id: id, start_date: startDate });
                            setAthletes((prev) => [...prev, entry]);
                            setAddMode(null);
                          } catch (e) {
                            setAddError(e instanceof Error ? e.message : "Erro ao adicionar atleta");
                          } finally {
                            setAddLoading(false);
                          }
                        }}
                        style={{ background: selectedAthleteId ? "#a6e3a1" : "#313244", color: selectedAthleteId ? "#18265b" : "#ffffff", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontWeight: 700, fontSize: "0.9rem", cursor: selectedAthleteId ? "pointer" : "not-allowed", opacity: addLoading ? 0.6 : 1 }}
                      >
                        {addLoading ? "Adicionando..." : "Adicionar"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!loading && !matchesLoading && matchYears.length === 0 && (
            <p style={styles.empty}>Nenhuma partida encontrada.</p>
          )}

          {/* ─── Season selector + matches ───────────────── */}
          {matchYears.length > 0 && (
            <section style={{ marginTop: "2rem" }}>

              {/* Year picker modal */}
              {yearModalOpen && (
                <div
                  onClick={() => setYearModalOpen(false)}
                  style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 16, padding: "1.5rem", minWidth: 220, maxWidth: 320, width: "100%", maxHeight: "80vh", overflowY: "auto" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 700, color: "#cdd6f4" }}>📅 Temporadas</span>
                      <button onClick={() => setYearModalOpen(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {matchYears.map((y) => {
                        const s = String(y);
                        const isCurrent = s === selectedSeason;
                        return (
                          <button
                            key={s}
                            onClick={() => handleYearSelect(s)}
                            style={{ background: isCurrent ? "#313244" : "transparent", border: isCurrent ? "1px solid #89b4fa" : "1px solid #313244", borderRadius: 8, padding: "0.6rem 0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}
                          >
                            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: isCurrent ? "#89b4fa" : "#cdd6f4" }}>{s}</span>
                            {isCurrent && <span style={{ fontSize: "0.65rem", color: "#89b4fa", fontWeight: 700, flexShrink: 0 }}>atual</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Section header: title + year badge */}
              <div style={styles.seasonHeader}>
                <span style={styles.seasonHeaderTitle}>Partidas</span>
                {matchYears.length > 1 ? (
                  <button
                    onClick={() => setYearModalOpen(true)}
                    style={{ background: "rgba(137,180,250,0.07)", border: "1.5px solid rgba(137,180,250,0.3)", borderRadius: 12, padding: "0.4rem 0.75rem", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}
                  >
                    <span style={{ fontSize: "2.5rem", fontWeight: 900, color: "#89b4fa", opacity: 0.85, lineHeight: 1, letterSpacing: "-0.03em", userSelect: "none" as const }}>{selectedSeason}</span>
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#89b4fa", letterSpacing: "0.1em", textTransform: "uppercase" as const, opacity: 0.65 }}>temporadas ▾</span>
                  </button>
                ) : (
                  <span style={{ fontSize: "2.5rem", fontWeight: 900, color: "#89b4fa", opacity: 0.7, lineHeight: 1, letterSpacing: "-0.03em" }}>{selectedSeason}</span>
                )}
              </div>

              {matchesLoading ? (
                <div style={{ marginTop: "1.5rem" }}><PageLoader /></div>
              ) : matches.length === 0 ? (
                <p style={styles.empty}>Nenhuma partida nesta temporada.</p>
              ) : (
                (() => {
                  const stats = computeStats(matches, id!);
                  return (
                    <>
                      {groupByChampionship(matches).map(([champName, champMatches]) => (
                        <div key={champName} style={styles.champBlock}>
                          <div style={styles.champHeader}>{champName}</div>
                          {champMatches.map((m) => (
                            <MatchRow key={m.match_id} match={m} teamId={id!} />
                          ))}
                        </div>
                      ))}
                      <SeasonSummary stats={stats} />
                    </>
                  );
                })()
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = iso.slice(0, 10).split("-");
  if (d.length === 3) return `${d[2]}/${d[1]}/${d[0]}`;
  return iso;
}

function MatchRow({ match: m, teamId }: { match: TeamMatch; teamId: string }) {
  const hasScore = m.home_score !== null && m.away_score !== null;
  const hasPenalty = hasScore && m.home_penalty_score !== null && m.away_penalty_score !== null;

  let outcome: "win" | "draw" | "loss" | null = null;
  if (hasScore) {
    const isHome = m.home_team_id === teamId;
    const myGoals = isHome ? m.home_score! : m.away_score!;
    const oppGoals = isHome ? m.away_score! : m.home_score!;
    if (hasPenalty) {
      const myPen = isHome ? m.home_penalty_score! : m.away_penalty_score!;
      const oppPen = isHome ? m.away_penalty_score! : m.home_penalty_score!;
      outcome = myPen > oppPen ? "win" : "loss";
    } else {
      outcome = myGoals > oppGoals ? "win" : myGoals === oppGoals ? "draw" : "loss";
    }
  }

  const datePart = m.match_date?.split("T")[0] ?? null;
  const dateLabel = datePart
    ? new Date(`${datePart}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;
  const timeLabel = (() => {
    const timePart = m.match_date?.includes("T") ? m.match_date.split("T")[1] : null;
    if (!timePart) return null;
    const [h, min] = timePart.split(":");
    return `${h}h${min}`;
  })();

  const outcomeColor = outcome === "win" ? "#a6e3a1" : outcome === "loss" ? "#f38ba8" : "#f9e2af";
  const outcomeLetter = outcome === "win" ? "V" : outcome === "loss" ? "D" : outcome === "draw" ? "E" : "–";

  return (
    <Link to={`/partidas/${m.match_id}`} style={styles.matchLink}>
      <div style={styles.matchCard}>
        <div style={styles.matchCardRow}>
          {/* Col 1 — data e hora */}
          <div style={styles.mDateCol}>
            {dateLabel && <span style={styles.mDateLabel}>{dateLabel}</span>}
            {timeLabel && <span style={styles.mTimeLabel}>{timeLabel}</span>}
          </div>

          {/* Col 2 — mandante / visitante + placar */}
          <div style={styles.mTeamsCol}>
            <div style={styles.mTeamRow}>
              <span style={styles.mScoreSlot}>
                {hasScore ? `${m.home_score}${hasPenalty ? ` (${m.home_penalty_score})` : ""}` : ""}
              </span>
              <Shield url={m.home_club_logo_url ?? null} size={16} />
              <span style={styles.mTeamName}>{m.home_team_name}</span>
            </div>
            <div style={styles.mTeamRow}>
              <span style={styles.mScoreSlot}>
                {hasScore ? `${m.away_score}${hasPenalty ? ` (${m.away_penalty_score})` : ""}` : ""}
              </span>
              <Shield url={m.away_club_logo_url ?? null} size={16} />
              <span style={styles.mTeamName}>{m.away_team_name}</span>
            </div>
          </div>

          {/* Col 3 — resultado + fase */}
          <div style={styles.mMetaCol}>
            {outcome !== null && (
              <span style={{ ...styles.outcomeBadge, backgroundColor: outcomeColor + "22", color: outcomeColor, borderColor: outcomeColor + "44" }}>
                {outcomeLetter}
              </span>
            )}
            <span style={styles.mPhaseLabel}>{m.phase_name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SeasonSummary({ stats }: { stats: SeasonStats }) {
  const gd = stats.goalsFor - stats.goalsAgainst;
  return (
    <div style={styles.summary}>
      <span style={styles.summaryTitle}>Resumo da temporada</span>
      <div style={styles.summaryStats}>
        <Stat label="J" value={stats.played} />
        <Stat label="V" value={stats.wins} color="#a6e3a1" />
        <Stat label="E" value={stats.draws} color="#f9e2af" />
        <Stat label="D" value={stats.losses} color="#f38ba8" />
        <Stat label="GM" value={stats.goalsFor} />
        <Stat label="GS" value={stats.goalsAgainst} />
        <Stat label="SG" value={gd >= 0 ? `+${gd}` : `${gd}`} color={gd >= 0 ? "#a6e3a1" : "#f38ba8"} />
        <Stat label="Pts" value={stats.wins * 3 + stats.draws} color="#89b4fa" bold />
      </div>
    </div>
  );
}

function Stat({ label, value, color, bold }: { label: string; value: string | number; color?: string; bold?: boolean }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, ...(color ? { color } : {}), ...(bold ? { fontWeight: 700 } : {}) }}>
        {value}
      </span>
    </div>
  );
}

function computeStats(matches: TeamMatch[], teamId: string): SeasonStats {
  let played = 0, wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    played++;
    const isHome = m.home_team_id === teamId;
    const myGoals = isHome ? m.home_score : m.away_score;
    const oppGoals = isHome ? m.away_score : m.home_score;
    goalsFor += myGoals;
    goalsAgainst += oppGoals;

    const hasPenalty = m.home_penalty_score !== null && m.away_penalty_score !== null;
    if (hasPenalty) {
      const myPen = isHome ? m.home_penalty_score! : m.away_penalty_score!;
      const oppPen = isHome ? m.away_penalty_score! : m.home_penalty_score!;
      if (myPen > oppPen) wins++;
      else losses++;
    } else {
      if (myGoals > oppGoals) wins++;
      else if (myGoals === oppGoals) draws++;
      else losses++;
    }
  }
  return { played, wins, draws, losses, goalsFor, goalsAgainst };
}

function groupByChampionship(matches: TeamMatch[]): [string, TeamMatch[]][] {
  const map = new Map<string, TeamMatch[]>();
  for (const m of matches) {
    if (!map.has(m.championship_name)) map.set(m.championship_name, []);
    map.get(m.championship_name)!.push(m);
  }
  return [...map.entries()];
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "860px",
    margin: "0 auto",
    padding: "3rem 1.5rem",
  },
  back: {
    display: "inline-block",
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.9rem",
    marginBottom: "2rem",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#cdd6f4",
    margin: 0,
  },
  infoCard: {
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    marginBottom: "2rem",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.75rem 2rem",
  },
  infoRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
  },
  infoLabel: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
  },
  infoValue: {
    fontSize: "0.9rem",
    color: "#cdd6f4",
  },
  clubLink: {
    fontSize: "0.9rem",
    color: "#89b4fa",
    textDecoration: "none",
    fontWeight: 600,
  },
  status: { color: "#cdd6f4" },
  error: { color: "#f38ba8" },
  empty: { color: "#cdd6f4", textAlign: "center", padding: "2rem 0" },
  season: {
    marginBottom: "3rem",
  },
  seasonTitle: {
    fontSize: "1.125rem",
    fontWeight: 700,
    color: "#f9e2af",
    marginBottom: "1rem",
    borderBottom: "1px solid #313244",
    paddingBottom: "0.5rem",
  },
  champBlock: {
    marginBottom: "1rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    overflow: "hidden",
  },
  champHeader: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#a6e3a1",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    padding: "0.5rem 1rem",
    backgroundColor: "#18265b",
    borderBottom: "1px solid #313244",
  },
  matchLink: {
    textDecoration: "none",
    color: "inherit",
    display: "block",
  },
  matchCard: {
    borderBottom: "1px solid #18265b",
    padding: "0.4rem 0",
  },
  matchCardRow: {
    display: "grid",
    gridTemplateColumns: "3rem 1fr auto",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0 1rem",
  },
  mDateCol: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.1rem",
    flexShrink: 0,
  },
  mDateLabel: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#cdd6f4",
  },
  mTimeLabel: {
    fontSize: "0.65rem",
    color: "#ffffff",
    fontWeight: 600,
  },
  mTeamsCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.15rem",
    minWidth: 0,
  },
  mTeamRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  seasonTabsRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.4rem",
    marginBottom: "1.25rem",
    borderBottom: "2px solid #313244",
    paddingBottom: "0.75rem",
  },
  seasonTab: {
    background: "transparent",
    border: "1px solid #45475a",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "0.35rem 0.9rem",
    cursor: "pointer",
    lineHeight: 1,
  },
  seasonTabActive: {
    background: "#1a3a6a",
    border: "1px solid #89b4fa",
    color: "#89b4fa",
  },
  seasonHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
    paddingBottom: "0.75rem",
    borderBottom: "2px solid #313244",
  },
  seasonHeaderTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#cdd6f4",
    letterSpacing: "0.02em",
  },  mScoreSlot: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#f5c2e7",
    width: "1.6rem",
    textAlign: "right" as const,
    flexShrink: 0,
  },
  mTeamName: {
    fontSize: "0.85rem",
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  mMetaCol: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-end",
    gap: "0.2rem",
    flexShrink: 0,
  },
  mPhaseLabel: {
    fontSize: "0.65rem",
    color: "#ffffff",
    whiteSpace: "nowrap" as const,
    textAlign: "right" as const,
  },
  outcomeBadge: {
    fontSize: "0.65rem",
    fontWeight: 700,
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    border: "1px solid transparent",
    textAlign: "center" as const,
  },
  summary: {
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    marginTop: "0.75rem",
  },
  summaryTitle: {
    display: "block",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "0.75rem",
  },
  summaryStats: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap" as const,
  },
  stat: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    minWidth: "32px",
  },
  statLabel: {
    fontSize: "0.65rem",
    color: "#cdd6f4",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  statValue: {
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#cdd6f4",
    marginTop: "2px",
  },
  rosterSection: {
    marginTop: "2rem",
  },
  rosterTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    marginTop: "0.75rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    overflow: "hidden",
  },
  rosterThead: {
    backgroundColor: "#18265b",
  },
  rosterTh: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    padding: "0.5rem 0.75rem",
    textAlign: "left" as const,
    borderBottom: "1px solid #313244",
  },
  rosterTr: {
    cursor: "pointer",
    transition: "background 0.12s",
    borderBottom: "1px solid #252537",
  },
  rosterTd: {
    padding: "0.45rem 0.75rem",
    verticalAlign: "middle" as const,
  },
};
