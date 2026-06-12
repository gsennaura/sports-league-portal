import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toSlugPath } from "@utils/slug";
import type { GetChampionshipDetail } from "@application/use_cases/GetChampionshipDetail";
import type { UpdateChampionshipPodium } from "@application/use_cases/UpdateChampionshipPodium";
import type { LoadPhaseGroups } from "@application/use_cases/LoadPhaseGroups";
import type { GetEditionTopScorers } from "@application/use_cases/GetEditionTopScorers";
import type { ChampionshipDetail, GroupDetail, MatchEntry, SiblingEdition, StandingEntry, TopScorerItem } from "@domain/entities/ChampionshipDetail";
import { useChampionshipDetail } from "@presentation/hooks/useChampionshipDetail";
import { PageLoader } from "@presentation/components/PageLoader";
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

function TopScorersTable({ scorers }: { scorers: TopScorerItem[] }) {
  if (scorers.length === 0) return null;
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#cdd6f4", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
        ⚽ Artilharia
      </h2>
      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #313244" }}>
            <th style={{ textAlign: "center" as const, padding: "0.35rem 0.5rem", color: "#ffffff", fontWeight: 600, width: "2rem" }}>#</th>
            <th style={{ textAlign: "left" as const, padding: "0.35rem 0.5rem", color: "#ffffff", fontWeight: 600 }}>Atleta</th>
            <th style={{ textAlign: "left" as const, padding: "0.35rem 0.5rem", color: "#ffffff", fontWeight: 600 }}>Time</th>
            <th style={{ textAlign: "center" as const, padding: "0.35rem 0.5rem", color: "#a6e3a1", fontWeight: 700, width: "3.5rem" }}>Gols</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s, i) => (
            <tr key={s.athlete_id} style={{ borderBottom: "1px solid #18265b", background: i % 2 === 0 ? "transparent" : "#1a1a2e" }}>
              <td style={{ textAlign: "center" as const, padding: "0.4rem 0.5rem", color: i === 0 ? "#f9e2af" : "#ffffff", fontWeight: i === 0 ? 900 : 500 }}>{i + 1}</td>
              <td style={{ padding: "0.4rem 0.5rem", color: "#cdd6f4", fontWeight: 600 }}>
                <Link to={`/atletas/${s.athlete_id}`} style={{ color: "inherit", textDecoration: "none" }}>{s.athlete_name}</Link>
              </td>
              <td style={{ padding: "0.4rem 0.5rem", color: "#ffffff" }}>{s.team_name}</td>
              <td style={{ textAlign: "center" as const, padding: "0.4rem 0.5rem", color: "#a6e3a1", fontWeight: 900, fontSize: "0.95rem" }}>{s.goals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChampionshipStats({ detail }: { detail: ChampionshipDetail }) {
  const teamMap = new Map<string, { name: string; logo: string | null; goals: number; against: number; points: number; matches: number }>();
  let totalMatchesPlayed = 0;
  let totalGoals = 0;

  for (const phase of detail.phases) {
    for (const group of phase.groups) {
      for (const s of group.standings) {
        const existing = teamMap.get(s.team_id);
        if (!existing) {
          teamMap.set(s.team_id, { name: s.team_name, logo: s.club_logo_url, goals: s.goals_for, against: s.goals_against, points: s.points, matches: s.matches_played });
        } else {
          existing.goals += s.goals_for;
          existing.against += s.goals_against;
          existing.points += s.points;
          existing.matches += s.matches_played;
        }
      }
      for (const m of group.matches) {
        if (m.home_score !== null && m.away_score !== null) {
          totalMatchesPlayed++;
          totalGoals += m.home_score + m.away_score;
        }
      }
    }
  }

  const totalTeams = teamMap.size;
  const avgGoals = totalMatchesPlayed > 0 ? (totalGoals / totalMatchesPlayed).toFixed(1) : "—";

  const teamsArr = [...teamMap.values()];
  const withGames = teamsArr.filter((t) => t.matches > 0);
  const aprov = (t: { points: number; matches: number }) => t.matches > 0 ? t.points / (t.matches * 3) : 0;

  const bestAttack = withGames.reduce<typeof teamsArr[number] | null>((best, t) => (!best || t.goals > best.goals) ? t : best, null);
  const bestDefense = withGames.reduce<typeof teamsArr[number] | null>((best, t) => (!best || t.against < best.against) ? t : best, null);
  const bestAprov = withGames.reduce<typeof teamsArr[number] | null>((best, t) => (!best || aprov(t) > aprov(best)) ? t : best, null);

  // Build full team lookup for resolving IDs to names/logos
  const allTeams = new Map<string, { name: string; logo: string | null }>();
  for (const phase of detail.phases) {
    for (const g of phase.groups) {
      for (const t of g.teams) allTeams.set(t.id, { name: t.name, logo: t.club_logo_url });
      for (const s of g.standings) allTeams.set(s.team_id, { name: s.team_name, logo: s.club_logo_url });
    }
  }

  const isOngoing = !detail.champion_team_id && (detail.phases.length === 0 || detail.phases.some((p) => p.status !== "finalizado"));
  const champion = detail.champion_team_id ? (allTeams.get(detail.champion_team_id) ?? null) : null;
  const runnerUp = detail.runner_up_team_id ? (allTeams.get(detail.runner_up_team_id) ?? null) : null;

  if (totalTeams === 0) return null;

  const numStats = [
    { label: "Times", value: totalTeams, color: "#89b4fa" },
    { label: "Fases", value: detail.phases.length, color: "#cba6f7" },
    { label: "Jogos", value: totalMatchesPlayed, color: "#74c7ec" },
    { label: "Gols", value: totalGoals, color: "#a6e3a1" },
    { label: "Média / jogo", value: avgGoals, sub: "gols", color: "#f9e2af" },
  ];

  return (
    <div style={{ marginBottom: "2rem" }}>
      {/* Row 1 — numeric stats */}
      <div style={statStyles.strip}>
        {numStats.map((s) => (
          <div key={s.label} style={statStyles.card}>
            <span style={{ ...statStyles.cardValue, color: s.color }}>{s.value}</span>
            {s.sub && <span style={statStyles.cardSub}>{s.sub}</span>}
            <span style={statStyles.cardLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Row 2 — highlight cards (responsive auto grid) */}
      <div style={statStyles.highlightRow}>
        {/* Campeão — sempre primeiro */}
        <div style={statStyles.highlightCard}>
          <span style={{ ...statStyles.highlightTag, color: "#f9e2af" }}>🏆 Campeão</span>
          {isOngoing ? (
            <span style={{ fontSize: "0.85rem", color: "#ffffff", fontStyle: "italic" }}>Em andamento</span>
          ) : champion ? (
            <div style={statStyles.highlightTeam}>
              <Shield url={champion.logo} size={28} />
              <span style={statStyles.highlightName}>{champion.name}</span>
            </div>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "#ffffff", fontStyle: "italic" }}>A confirmar</span>
          )}
        </div>

        {/* Vice-campeão */}
        {!isOngoing && (
          <div style={statStyles.highlightCard}>
            <span style={{ ...statStyles.highlightTag, color: "#cba6f7" }}>🥈 Vice-campeão</span>
            {runnerUp ? (
              <div style={statStyles.highlightTeam}>
                <Shield url={runnerUp.logo} size={28} />
                <span style={statStyles.highlightName}>{runnerUp.name}</span>
              </div>
            ) : (
              <span style={{ fontSize: "0.85rem", color: "#ffffff", fontStyle: "italic" }}>A confirmar</span>
            )}
          </div>
        )}

        {bestAttack && (
          <div style={statStyles.highlightCard}>
            <span style={{ ...statStyles.highlightTag, color: "#f38ba8" }}>⚽ Melhor ataque</span>
            <div style={statStyles.highlightTeam}>
              <Shield url={bestAttack.logo} size={28} />
              <span style={statStyles.highlightName}>{bestAttack.name}</span>
            </div>
            <span style={{ ...statStyles.highlightStat, color: "#f38ba8" }}>
              {bestAttack.goals} <span style={statStyles.highlightStatLabel}>gols</span>
            </span>
          </div>
        )}

        {bestDefense && (
          <div style={statStyles.highlightCard}>
            <span style={{ ...statStyles.highlightTag, color: "#a6e3a1" }}>🛡 Melhor defesa</span>
            <div style={statStyles.highlightTeam}>
              <Shield url={bestDefense.logo} size={28} />
              <span style={statStyles.highlightName}>{bestDefense.name}</span>
            </div>
            <span style={{ ...statStyles.highlightStat, color: "#a6e3a1" }}>
              {bestDefense.against} <span style={statStyles.highlightStatLabel}>sofridos</span>
            </span>
          </div>
        )}

        {bestAprov && (
          <div style={statStyles.highlightCard}>
            <span style={{ ...statStyles.highlightTag, color: "#89b4fa" }}>📈 Melhor aproveitamento</span>
            <div style={statStyles.highlightTeam}>
              <Shield url={bestAprov.logo} size={28} />
              <span style={statStyles.highlightName}>{bestAprov.name}</span>
            </div>
            <span style={{ ...statStyles.highlightStat, color: "#89b4fa" }}>
              {Math.round(aprov(bestAprov) * 100)}% <span style={statStyles.highlightStatLabel}>aprov.</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const statStyles: Record<string, React.CSSProperties> = {
  strip: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.4rem",
    marginBottom: "0.6rem",
  },
  card: {
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "0.35rem 0.75rem",
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "baseline",
    gap: "0.45rem",
  },
  cardLabel: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  cardValue: {
    fontSize: "1rem",
    fontWeight: 800,
    lineHeight: 1,
  },
  cardSub: {
    fontSize: "0.65rem",
    color: "#ffffff",
  },
  // Highlight row
  highlightRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
    gap: "0.5rem",
  },
  highlightCard: {
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "10px",
    padding: "0.45rem 0.65rem",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    gap: "0.25rem",
    minHeight: "4.5rem",
  },
  highlightTag: {
    fontSize: "0.6rem",
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#ffffff",
  },
  highlightTeam: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    flex: 1,
  },
  highlightName: {
    fontSize: "0.80rem",
    fontWeight: 700,
    color: "#cdd6f4",
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  highlightStat: {
    fontSize: "0.9rem",
    fontWeight: 800,
    lineHeight: 1,
    marginTop: "0.1rem",
  },
  highlightStatLabel: {
    fontSize: "0.65rem",
    fontWeight: 400,
    color: "#ffffff",
  },
};

interface ChampionshipDetailPageProps {
  getChampionshipDetail: GetChampionshipDetail;
  updateChampionshipPodium: UpdateChampionshipPodium;
  loadPhaseGroups: LoadPhaseGroups;
  getEditionTopScorers: GetEditionTopScorers;
}

export function ChampionshipDetailPage({ getChampionshipDetail, updateChampionshipPodium, loadPhaseGroups, getEditionTopScorers }: ChampionshipDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editionId = searchParams.get("edicao") ?? undefined;
  const fromLeague = (location.state as { fromLeague?: boolean } | null)?.fromLeague;
  const { detail: fetchedDetail, loading, error, refetch } = useChampionshipDetail(getChampionshipDetail, id!, editionId);
  const [detail, setDetail] = useState<ChampionshipDetail | null>(null);
  useEffect(() => { if (fetchedDetail) setDetail(fetchedDetail); }, [fetchedDetail]);
  const { isAdmin } = useAuth();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [scorers, setScorers] = useState<TopScorerItem[] | null>(null);
  const [scorersLoading, setScorersLoading] = useState(false);
  const [scorersOpen, setScorersOpen] = useState(false);
  const [podiumChampId, setPodiumChampId] = useState<string>("");
  const [podiumViceId, setPodiumViceId] = useState<string>("");
  const [podiumOpen, setPodiumOpen] = useState(false);
  const [podiumSaving, setPodiumSaving] = useState(false);
  const [podiumError, setPodiumError] = useState<string | null>(null);
  const [podiumSaved, setPodiumSaved] = useState(false);
  const [standingsOpen, setStandingsOpen] = useState(false);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [editionModalOpen, setEditionModalOpen] = useState(false);

  const siblings = detail?.sibling_editions ?? [];

  const sortedPhases = detail
    ? [...detail.phases].sort((a, b) => b.phase_order - a.phase_order)
    : [];

  // Reset scorers cache and modals when edition changes
  useEffect(() => {
    setScorers(null);
    setScorersOpen(false);
    setStandingsOpen(false);
  }, [editionId]);

  useEffect(() => {
    if (!detail || detail.phases.length === 0) return;
    const sorted = [...detail.phases].sort((a, b) => b.phase_order - a.phase_order);
    // Prefer highest-order em_andamento; else highest-order finalizado; else index 0
    const ongoingIdx = sorted.findIndex((p) => p.status === "em_andamento");
    if (ongoingIdx >= 0) { setPhaseIdx(ongoingIdx); return; }
    const finalIdx = sorted.findIndex((p) => p.status === "finalizado");
    setPhaseIdx(finalIdx >= 0 ? finalIdx : 0);
  }, [detail?.id, editionId]);

  const handleLoadScorers = async () => {
    if (scorers !== null) { if (scorers.length > 0) setScorersOpen(true); return; }
    const resolvedEdId = editionId ?? detail?.sibling_editions.find((s) => s.year === detail.year)?.edition_id ?? null;
    if (!id || !resolvedEdId) return;
    setScorersLoading(true);
    setScorersOpen(true);
    try {
      const data = await getEditionTopScorers.execute(id, resolvedEdId);
      setScorers(data);
    } finally { setScorersLoading(false); }
  };

  const handlePhaseChange = async (newIdx: number) => {
    setPhaseIdx(newIdx);
    const phase = [...(detail?.phases ?? [])].sort((a, b) => b.phase_order - a.phase_order)[newIdx];
    if (!phase || phase.groups_loaded) return;
    setPhaseLoading(true);
    try {
      const groups = await loadPhaseGroups.execute(phase.id);
      setDetail((prev) => {
        if (!prev) return prev;
        // Collect logos from newly loaded groups and enrich overall standings
        const logoMap = new Map<string, string>();
        for (const g of groups) {
          for (const t of g.teams) {
            if (t.club_logo_url) logoMap.set(t.id, t.club_logo_url);
          }
        }
        const overall_standings = prev.overall_standings.map((s) =>
          s.club_logo_url ? s : { ...s, club_logo_url: logoMap.get(s.team_id) ?? null }
        );
        return {
          ...prev,
          phases: prev.phases.map((p) => p.id === phase.id ? { ...p, groups, groups_loaded: true } : p),
          overall_standings,
        };
      });
    } finally { setPhaseLoading(false); }
  };

  const handleOpenStandings = async () => {
    if (!detail) return;
    const unloaded = detail.phases.filter((p) => !p.groups_loaded);
    if (unloaded.length === 0) { setStandingsOpen(true); return; }
    setStandingsLoading(true);
    try {
      const results = await Promise.all(unloaded.map((p) => loadPhaseGroups.execute(p.id)));
      setDetail((prev) => {
        if (!prev) return prev;
        // Collect logos from already-loaded phases
        const logoMap = new Map<string, string>();
        for (const phase of prev.phases) {
          for (const g of phase.groups) {
            for (const t of g.teams) {
              if (t.club_logo_url) logoMap.set(t.id, t.club_logo_url);
            }
          }
        }
        // Merge newly loaded groups + collect their logos
        let updatedPhases = [...prev.phases];
        for (let i = 0; i < unloaded.length; i++) {
          const groups = results[i];
          for (const g of groups) {
            for (const t of g.teams) {
              if (t.club_logo_url) logoMap.set(t.id, t.club_logo_url);
            }
          }
          updatedPhases = updatedPhases.map((p) =>
            p.id === unloaded[i].id ? { ...p, groups, groups_loaded: true } : p
          );
        }
        const overall_standings = prev.overall_standings.map((s) => ({
          ...s,
          club_logo_url: logoMap.get(s.team_id) ?? s.club_logo_url ?? null,
        }));
        return { ...prev, phases: updatedPhases, overall_standings };
      });
    } finally {
      setStandingsLoading(false);
      setStandingsOpen(true);
    }
  };

  // Pre-fill podium selects when detail loads
  useEffect(() => {
    if (!detail) return;
    setPodiumChampId(detail.champion_team_id ?? "");
    setPodiumViceId(detail.runner_up_team_id ?? "");
    setPodiumSaved(false);
  }, [detail?.id]);

  const currentPhase = sortedPhases[phaseIdx] ?? null;
  const canPrev = phaseIdx > 0;
  const canNext = phaseIdx < sortedPhases.length - 1;

  const backLink = fromLeague && detail?.league_id
    ? `/ligas/${detail.league_id}`
    : "/campeonatos";
  const backLabel = fromLeague && detail?.league_id ? "← Liga" : "← Campeonatos";

  const levelLabel: Record<string, string> = {
    amador: "Amador",
    universitario: "Universitário",
    profissional: "Profissional",
  };
  const levelColor: Record<string, React.CSSProperties> = {
    amador: { color: "#a6e3a1", backgroundColor: "#1a2e1f", border: "1px solid #2a4a2f" },
    universitario: { color: "#89b4fa", backgroundColor: "#1a1f3a", border: "1px solid #2a3a6a" },
    profissional: { color: "#f9e2af", backgroundColor: "#2e2a1a", border: "1px solid #4a3a2a" },
  };

  return (
    <main style={styles.page}>
      <Link to={backLink} style={styles.back}>{backLabel}</Link>

      {loading && <PageLoader />}
      {error && <p style={styles.error}>{error}</p>}

      {detail && (
        <>
          {/* ─── Edition modal ─────────────────────────────────────── */}
          {editionModalOpen && (
            <div
              onClick={() => setEditionModalOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 16, padding: "1.5rem", minWidth: 280, maxWidth: 420, width: "100%", maxHeight: "80vh", overflowY: "auto" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#cdd6f4" }}>📅 Edições do campeonato</span>
                  <button onClick={() => setEditionModalOpen(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {[...siblings].reverse().map((s) => {
                    const isCurrent = s.year === detail.year;
                    return (
                      <button
                        key={s.edition_id}
                        onClick={() => { setEditionModalOpen(false); navigate(`/campeonatos/${detail.id}?edicao=${s.edition_id}`); }}
                        style={{ background: isCurrent ? "#313244" : "transparent", border: isCurrent ? "1px solid #89b4fa" : "1px solid #313244", borderRadius: 8, padding: "0.6rem 0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", textAlign: "left" }}
                      >
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: isCurrent ? "#89b4fa" : "#cdd6f4", flexShrink: 0 }}>{s.year}</span>
                        <span style={{ fontSize: "0.8rem", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.champion_team_name ? `🏆 ${s.champion_team_name}` : "—"}
                        </span>
                        {isCurrent && <span style={{ fontSize: "0.65rem", color: "#89b4fa", fontWeight: 700, flexShrink: 0 }}>atual</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div style={styles.champHeader}>
            <div style={styles.champTitleBlock}>
              <h1 style={styles.title}>
                {detail.nickname ?? detail.name}
              </h1>
              {detail.nickname && (
                <p style={styles.champFullName}>{detail.name}</p>
              )}
              <div style={styles.champBadges}>
                {detail.level && (
                  <span style={{ ...styles.badge, ...levelColor[detail.level] }}>
                    {levelLabel[detail.level] ?? detail.level}
                  </span>
                )}
                {detail.division && (
                  <span style={{ ...styles.badge, color: "#cba6f7", backgroundColor: "#201a2a", border: "1px solid #4a2a6a" }}>
                    {detail.division}
                  </span>
                )}
                <span style={styles.scopeBadge}>{detail.scope}</span>
                {isAdmin && (
                  <Link
                    to={`/admin/campeonatos/${detail.id}/gerenciar`}
                    style={{ background: "#313244", color: "#cdd6f4", border: "1px solid #45475a", borderRadius: 8, padding: "0.3rem 0.8rem", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                  >
                    ✏️ Gerenciar
                  </Link>
                )}
              </div>
            </div>
            <div style={styles.champYearBlock}>
              {siblings.length > 1 ? (
                <button
                  onClick={() => setEditionModalOpen(true)}
                  style={{ background: "rgba(137,180,250,0.07)", border: "1.5px solid rgba(137,180,250,0.3)", borderRadius: 14, padding: "0.5rem 0.9rem", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}
                >
                  <span style={{ fontSize: "3.5rem", fontWeight: 900, color: "#89b4fa", opacity: 0.85, lineHeight: 1, letterSpacing: "-0.03em", userSelect: "none" }}>{detail.year}</span>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#89b4fa", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.65 }}>edições ▾</span>
                </button>
              ) : (
                <span style={styles.yearLarge}>{detail.year}</span>
              )}
            </div>
          </div>

          <ChampionshipStats detail={detail} />

          {/* ─── Classificação Geral — botão + modal ────────────────── */}
          {detail.overall_standings.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <button
                onClick={handleOpenStandings}
                disabled={standingsLoading}
                style={{ background: "#1a1f3a", border: "1px solid #2a3a6a", borderRadius: 8, color: standingsLoading ? "#ffffff" : "#89b4fa", fontWeight: 600, fontSize: "0.85rem", padding: "0.45rem 1rem", cursor: standingsLoading ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                {standingsLoading ? "⏳ Carregando..." : "📊 Ver classificação geral"}
              </button>
            </div>
          )}

          {/* Standings modal */}
          {standingsOpen && (
            <div
              onClick={() => setStandingsOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3rem 1rem 1rem", overflowY: "auto" }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 820 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#cdd6f4" }}>📊 Classificação Geral</span>
                  <button onClick={() => setStandingsOpen(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <OverallStandings standings={detail.overall_standings} phases={detail.phases} />
              </div>
            </div>
          )}

          {/* Artilharia — botão + modal */}
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              onClick={handleLoadScorers}
              style={{ background: "#1a1f3a", border: "1px solid #2a3a6a", borderRadius: 8, color: "#cba6f7", fontWeight: 600, fontSize: "0.85rem", padding: "0.45rem 1rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              ⚽ Ver artilharia
            </button>
          </div>

          {/* Scorers modal */}
          {scorersOpen && (
            <div
              onClick={() => setScorersOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3rem 1rem 1rem", overflowY: "auto" }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 820 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#cdd6f4" }}>⚽ Artilharia</span>
                  <button onClick={() => setScorersOpen(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                {scorersLoading
                  ? <PageLoader />
                  : scorers && scorers.length === 0
                    ? <p style={{ color: "#ffffff", fontSize: "0.9rem", textAlign: "center", padding: "1rem 0" }}>Sem dados de artilharia</p>
                    : <TopScorersTable scorers={scorers ?? []} />}
              </div>
            </div>
          )}

          {/* Admin podium panel */}
          {isAdmin && (() => {
            const isFinished = detail.phases.length > 0 && detail.phases.every((p) => p.status === "finalizado");
            if (!isFinished) return null;

            const teamsForPodium = new Map<string, { name: string }>();
            for (const phase of detail.phases) {
              for (const g of phase.groups) {
                for (const t of g.teams) teamsForPodium.set(t.id, { name: t.name });
                for (const s of g.standings) teamsForPodium.set(s.team_id, { name: s.team_name });
              }
            }
            const teamOptions = [...teamsForPodium.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

            const handleSave = async () => {
              setPodiumSaving(true);
              setPodiumError(null);
              setPodiumSaved(false);
              try {
                await updateChampionshipPodium.execute(
                  detail.id,
                  podiumChampId || null,
                  podiumViceId || null,
                );
                setPodiumSaved(true);
                setPodiumOpen(false);
                refetch();
              } catch (e) {
                setPodiumError(e instanceof Error ? e.message : "Erro ao salvar pódio");
              } finally {
                setPodiumSaving(false);
              }
            };

            return (
              <div style={{ marginBottom: "1rem" }}>
                <button
                  onClick={() => setPodiumOpen((o) => !o)}
                  style={{ background: "#2a2510", color: "#f9e2af", border: "1px solid #4a3a2a", borderRadius: 8, padding: "0.45rem 1rem", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  🏆 {podiumOpen ? "Fechar pódio" : "Definir campeão e vice"}
                </button>

                {podiumOpen && (
                  <div style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 12, padding: "1rem 1.2rem", marginTop: "0.6rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem", color: "#cdd6f4" }}>
                        <span>🥇 Campeão</span>
                        <select
                          value={podiumChampId}
                          onChange={(e) => setPodiumChampId(e.target.value)}
                          style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 6, color: "#cdd6f4", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                        >
                          <option value="">— Selecionar —</option>
                          {teamOptions.map(([tid, t]) => <option key={tid} value={tid}>{t.name}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem", color: "#cdd6f4" }}>
                        <span>🥈 Vice-campeão</span>
                        <select
                          value={podiumViceId}
                          onChange={(e) => setPodiumViceId(e.target.value)}
                          style={{ background: "#18265b", border: "1px solid #45475a", borderRadius: 6, color: "#cdd6f4", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                        >
                          <option value="">— Selecionar —</option>
                          {teamOptions.map(([tid, t]) => <option key={tid} value={tid}>{t.name}</option>)}
                        </select>
                      </label>
                    </div>
                    {podiumError && <p style={{ color: "#f38ba8", fontSize: "0.8rem", margin: "0 0 0.5rem" }}>{podiumError}</p>}
                    {podiumSaved && <p style={{ color: "#a6e3a1", fontSize: "0.8rem", margin: "0 0 0.5rem" }}>✓ Pódio salvo com sucesso!</p>}
                    <button
                      onClick={handleSave}
                      disabled={podiumSaving}
                      style={{ background: "#f9e2af", color: "#18265b", border: "none", borderRadius: 8, padding: "0.5rem 1.2rem", fontWeight: 700, fontSize: "0.85rem", cursor: podiumSaving ? "not-allowed" : "pointer", opacity: podiumSaving ? 0.6 : 1 }}
                    >
                      {podiumSaving ? "Salvando..." : "Salvar pódio"}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {sortedPhases.length > 0 && currentPhase && (
            <>
              <div style={styles.phaseNav}>
                <button
                  style={{ ...styles.navBtn, ...(canPrev ? {} : styles.navBtnDisabled) }}
                  onClick={() => canPrev && handlePhaseChange(phaseIdx - 1)}
                  disabled={!canPrev}
                  aria-label="Fase anterior"
                >←</button>
                <div style={styles.phaseNavCenter}>
                  <div style={styles.phaseNavTitleRow}>
                    <span style={styles.phaseNavName}>{currentPhase.name}</span>
                    {sortedPhases.length > 1 && (
                      <span style={styles.phaseNavCounter}>{phaseIdx + 1}/{sortedPhases.length}</span>
                    )}
                    <span style={currentPhase.status === "finalizado" ? styles.statusFinalizado : styles.statusEmAndamento}>
                      {currentPhase.status === "finalizado" ? "Finalizado" : "Em andamento"}
                    </span>
                  </div>
                </div>
                <button
                  style={{ ...styles.navBtn, ...(canNext ? {} : styles.navBtnDisabled) }}
                  onClick={() => canNext && handlePhaseChange(phaseIdx + 1)}
                  disabled={!canNext}
                  aria-label="Próxima fase"
                >→</button>
              </div>

              <div style={styles.groupsGrid}>
                {phaseLoading
                  ? <PageLoader />
                  : currentPhase.phase_type === "knockout"
                    ? currentPhase.groups.map((group) => (
                        <KnockoutGroupCard key={group.id} group={group} />
                      ))
                    : currentPhase.groups.map((group) => (
                        <GroupCard key={group.id} group={group} />
                      ))}
              </div>
            </>
          )}

          {/* ─── Histórico ──────────────────────────────────────────── */}
          <Palmares siblings={siblings} currentYear={detail.year} />
        </>
      )}
    </main>
  );
}

function Palmares({ siblings, currentYear }: { siblings: SiblingEdition[]; currentYear: number }) {
  const withChamp = siblings.filter((s) => s.champion_team_name);
  if (withChamp.length === 0) return null;

  return (
    <section style={edStyles.palmSection}>
      <div style={edStyles.palmHeader}>
        <span style={edStyles.palmTitle}>🏆 Histórico</span>
        <div style={edStyles.palmDivider} />
      </div>
      <div style={edStyles.palmList}>
        {withChamp.map((s) => {
          const isCurrent = s.year === currentYear;
          return (
            <div key={s.edition_id} style={{ ...edStyles.palmRow, ...(isCurrent ? edStyles.palmRowCurrent : {}) }}>
              <span style={edStyles.palmYear}>{s.year}</span>
              <div style={edStyles.palmTeams}>
                <div style={edStyles.palmChamp}>
                  <span style={edStyles.palmGold}>🥇</span>
                  <span style={edStyles.palmTeamName}>{s.champion_team_name}</span>
                </div>
                {s.runner_up_team_name && (
                  <div style={edStyles.palmVice}>
                    <span style={edStyles.palmSilver}>🥈</span>
                    <span style={{ ...edStyles.palmTeamName, color: "#ffffff", opacity: 0.8 }}>{s.runner_up_team_name}</span>
                  </div>
                )}
              </div>
              {isCurrent && <span style={edStyles.palmCurrentBadge}>Esta edição</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function KnockoutGroupCard({ group }: { group: GroupDetail }) {
  return (
    <div style={styles.groupCard}>
      <div style={styles.groupHeader}>
        <h3 style={styles.groupTitle}>{group.name}</h3>
        <span style={styles.knockoutBadge}>Mata-a-mata</span>
      </div>
      <MatchRoundList matches={group.matches} teams={group.teams} knockout />
    </div>
  );
}

function GroupCard({ group }: { group: GroupDetail }) {
  return (
    <div style={styles.groupCard}>
      <div style={styles.groupHeader}>
        <h3 style={styles.groupTitle}>{group.name}</h3>
      </div>
      <MatchRoundList matches={group.matches} teams={group.teams} />
      {group.standings.length > 0 && (
        <>
          <div style={styles.standingsDivider} />
          <StandingsTable standings={group.standings} teams={group.teams} />
        </>
      )}
    </div>
  );
}

function MatchRoundList({
  matches,
  teams,
  knockout = false,
}: {
  matches: MatchEntry[];
  teams: GroupDetail["teams"];
  knockout?: boolean;
}) {
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  const rounds = new Map<number, MatchEntry[]>();
  for (const m of [...matches].sort((a, b) => a.round_number - b.round_number)) {
    if (!rounds.has(m.round_number)) rounds.set(m.round_number, []);
    rounds.get(m.round_number)!.push(m);
  }

  if (rounds.size === 0) {
    return <p style={styles.noMatches}>Nenhuma partida registrada.</p>;
  }

  const legLabel = (round: number) =>
    knockout ? (round === 1 ? "Jogo de ida" : round === 2 ? "Jogo de volta" : `Jogo ${round}`) : `Rodada ${round}`;

  return (
    <div style={styles.rounds}>
      {[...rounds.entries()].map(([round, roundMatches]) => {
        return (
        <div key={round} style={styles.round}>
          <div style={styles.roundHeader}>{legLabel(round)}</div>
          {roundMatches.map((m) => {
            const home = teamMap.get(m.home_team_id) ?? m.home_team_id.slice(0, 8);
            const away = teamMap.get(m.away_team_id) ?? m.away_team_id.slice(0, 8);
            const hasScore = m.home_score !== null && m.away_score !== null;
            const hasPenalty = hasScore && m.home_penalty_score !== null && m.away_penalty_score !== null;
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
            return (
              <Link key={m.id} to={`/partidas/${m.id}`} style={styles.matchLink}>
                <div style={styles.matchCard}>
                  <div style={styles.matchCardRow}>
                    {/* Col 1 — data e hora */}
                    <div style={styles.mDateCol}>
                      {dateLabel && <span style={styles.mDateLabel}>{dateLabel}</span>}
                      {timeLabel && <span style={styles.mTimeLabel}>{timeLabel}</span>}
                    </div>

                    {/* Col 2 — times + placar */}
                    <div style={styles.mTeamsCol}>
                      <div style={styles.mTeamRow}>
                        <span style={styles.mScoreSlot}>
                          {hasScore ? `${m.home_score}${hasPenalty ? ` (${m.home_penalty_score})` : ""}` : ""}
                        </span>
                        <Shield url={m.home_club_logo_url} />
                        <span style={styles.mTeamName}>{home}</span>
                      </div>
                      <div style={styles.mTeamRow}>
                        <span style={styles.mScoreSlot}>
                          {hasScore ? `${m.away_score}${hasPenalty ? ` (${m.away_penalty_score})` : ""}` : ""}
                        </span>
                        <Shield url={m.away_club_logo_url} />
                        <span style={styles.mTeamName}>{away}</span>
                      </div>
                    </div>

                    {/* Col 3 — estádio */}
                    {m.venue_name && (
                      <div style={styles.mVenueCol}>
                        <span style={styles.mVenueLabel}>{m.venue_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        );
      })}
    </div>
  );
}

function StandingsTable({ standings, teams, showAprov = false, eliminatedTeamIds }: { standings: StandingEntry[]; teams: GroupDetail["teams"]; showAprov?: boolean; eliminatedTeamIds?: Set<string> }) {
  const aprovPct = (s: StandingEntry) =>
    s.matches_played > 0 ? Math.round((s.points / (s.matches_played * 3)) * 100) : 0;

  const rows: StandingEntry[] = standings.length > 0
    ? standings
    : teams.map((t) => ({
        team_id: t.id,
        team_name: t.name,
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
        club_logo_url: t.club_logo_url,
      }));

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, color: "#ffffff" }}>#</th>
            <th style={{ ...styles.th, textAlign: "left" }}>Time</th>
            <th style={{ ...styles.th, color: "#89b4fa" }} title="Pontos">Pts</th>
            <th style={styles.th} title="Vitórias">V</th>
            <th style={styles.th} title="Empates">E</th>
            <th style={styles.th} title="Derrotas">D</th>
            <th style={styles.th} title="Gols Marcados">GM</th>
            <th style={styles.th} title="Gols Sofridos">GS</th>
            {showAprov && <th style={{ ...styles.th, color: "#a6e3a1" }} title="Saldo de Gols">SG</th>}
            <th style={styles.th} title="Partidas">J</th>
            {showAprov && <th style={{ ...styles.th, color: "#f9e2af" }} title="Aproveitamento">Aprov.</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.team_id} style={{ ...(i % 2 === 0 ? styles.rowEven : styles.rowOdd), ...(eliminatedTeamIds?.has(s.team_id) ? { backgroundColor: "rgba(243, 139, 168, 0.10)" } : {}) }}>
              <td style={{ ...styles.td, color: "#ffffff" }}>{i + 1}</td>
              <td style={{ ...styles.td, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Shield url={s.club_logo_url} size={16} />
                  <Link to={`/times/${toSlugPath(s.team_name, s.team_id)}`} style={styles.teamLink}>{s.team_name}</Link>
                </div>
              </td>
              <td style={{ ...styles.td, fontWeight: 700, color: "#89b4fa" }}>{s.points}</td>
              <td style={styles.td}>{s.wins}</td>
              <td style={styles.td}>{s.draws}</td>
              <td style={styles.td}>{s.losses}</td>
              <td style={styles.td}>{s.goals_for}</td>
              <td style={styles.td}>{s.goals_against}</td>
              {showAprov && <td style={{ ...styles.td, color: s.goal_difference >= 0 ? "#a6e3a1" : "#f38ba8" }}>{s.goal_difference > 0 ? "+" : ""}{s.goal_difference}</td>}
              <td style={styles.td}>{s.matches_played}</td>
              {showAprov && <td style={{ ...styles.td, fontWeight: 700, color: "#f9e2af" }}>{aprovPct(s)}%</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverallStandings({ standings, phases }: { standings: StandingEntry[]; phases: ChampionshipDetail["phases"] }) {
  if (standings.length === 0) return null;

  const aprov = (s: StandingEntry) =>
    s.matches_played > 0 ? s.points / (s.matches_played * 3) : 0;

  const rows = [...standings].sort(
    (a, b) => aprov(b) - aprov(a) || b.points - a.points || b.goal_difference - a.goal_difference || b.goals_for - a.goals_for
  );

  // Determine eliminated teams: those not in the last loaded phase
  const lastLoadedPhase = phases
    .filter((p) => p.groups_loaded && p.groups.length > 0)
    .reduce<ChampionshipDetail["phases"][number] | null>((best, p) => !best || p.phase_order > best.phase_order ? p : best, null);
  const activeTeamIds = new Set<string>();
  if (lastLoadedPhase) {
    for (const group of lastLoadedPhase.groups) {
      for (const t of group.teams) activeTeamIds.add(t.id);
      for (const s of group.standings) activeTeamIds.add(s.team_id);
    }
  }
  const eliminatedTeamIds = lastLoadedPhase
    ? new Set(rows.map((r) => r.team_id).filter((id) => !activeTeamIds.has(id)))
    : new Set<string>();
  const hasEliminated = eliminatedTeamIds.size > 0;

  return (
    <section style={{ ...styles.phase, marginTop: "3rem" }}>
      <div style={styles.overallHeader}>
        <span style={styles.overallTitle}>Classificação Geral</span>
      </div>
      <div style={styles.groupCard}>
        <StandingsTable standings={rows} teams={[]} showAprov eliminatedTeamIds={eliminatedTeamIds} />
      </div>
      {hasEliminated && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "#ffffff" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "rgba(243, 139, 168, 0.35)", border: "1px solid rgba(243, 139, 168, 0.5)", borderRadius: "2px", flexShrink: 0 }} />
          <span>Time eliminado — não está na última fase do campeonato</span>
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "900px",
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
  title: {
    fontSize: "2.4rem",
    fontWeight: 900,
    color: "#cdd6f4",
    margin: "0 0 0.2rem 0",
    lineHeight: 1.1,
  },
  status: { color: "#cdd6f4" },
  error: { color: "#f38ba8" },
  champHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "2rem",
    paddingBottom: "1.5rem",
    borderBottom: "2px solid #313244",
  },
  champTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  champYearBlock: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    paddingTop: "0.25rem",
  },
  yearLarge: {
    fontSize: "4rem",
    fontWeight: 900,
    color: "#89b4fa",
    opacity: 0.3,
    lineHeight: 1,
    letterSpacing: "-0.03em",
    userSelect: "none" as const,
  },
  champFullName: {
    fontSize: "0.85rem",
    color: "#ffffff",
    margin: "0.15rem 0 0 0",
  },
  champBadges: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.4rem",
    marginTop: "0.5rem",
  },
  badge: {
    fontSize: "0.7rem",
    fontWeight: 700,
    borderRadius: "4px",
    padding: "0.2rem 0.6rem",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
  },
  yearBadge: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#cdd6f4",
    backgroundColor: "#313244",
    borderRadius: "4px",
    padding: "0.2rem 0.6rem",
    whiteSpace: "nowrap" as const,
  },
  scopeBadge: {
    fontSize: "0.7rem",
    color: "#cdd6f4",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "4px",
    padding: "0.2rem 0.6rem",
    whiteSpace: "nowrap" as const,
  },
  // Phase navigator
  phaseNav: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  navBtn: {
    background: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "8px",
    color: "#89b4fa",
    fontSize: "1.4rem",
    padding: "0.5rem 1.1rem",
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
    fontWeight: 700,
  },
  navBtnDisabled: {
    color: "#313244",
    cursor: "default",
    borderColor: "#18265b",
    background: "transparent",
  },
  phaseNavCenter: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
  },
  phaseNavTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    flexWrap: "wrap" as const,
  },
  phaseNavName: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#cdd6f4",
  },
  phaseNavCounter: {
    fontSize: "0.7rem",
    color: "#ffffff",
  },
  // Overall standings header
  overallHeader: {
    display: "flex",
    alignItems: "baseline",
    marginBottom: "1rem",
    borderBottom: "2px solid #f9e2af",
    paddingBottom: "0.5rem",
  },
  overallTitle: {
    fontSize: "1.05rem",
    fontWeight: 800,
    color: "#f9e2af",
    letterSpacing: "0.01em",
    textTransform: "uppercase" as const,
  },
  phase: {
    marginBottom: "2.5rem",
  },
  phaseTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    marginBottom: "1rem",
    borderBottom: "1px solid #313244",
    paddingBottom: "0.5rem",
  },
  phaseTitle: {
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#a6e3a1",
    margin: 0,
  },
  statusEmAndamento: {
    backgroundColor: "#1a2e1f",
    border: "1px solid #2a4a2f",
    borderRadius: "4px",
    color: "#a6e3a1",
    fontSize: "0.72rem",
    fontWeight: 600,
    padding: "0.15rem 0.5rem",
    whiteSpace: "nowrap" as const,
  },
  statusFinalizado: {
    backgroundColor: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "4px",
    color: "#cdd6f4",
    fontSize: "0.72rem",
    fontWeight: 600,
    padding: "0.15rem 0.5rem",
    whiteSpace: "nowrap" as const,
  },
  groupsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  groupCard: {
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "1.25rem 1.5rem",
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1rem",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
  },
  groupTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#89b4fa",
    margin: 0,
  },
  standingsDivider: {
    height: "1px",
    backgroundColor: "#313244",
    margin: "1rem 0",
  },
  matchLink: {
    textDecoration: "none",
    color: "inherit",
    display: "block",
  },
  rounds: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
  },
  round: {},
  roundHeader: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "0.375rem",
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
    color: "#cdd6f4",
    fontWeight: 600,
  },
  mTeamsCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
    minWidth: 0,
  },
  mTeamRow: {
    display: "grid",
    gridTemplateColumns: "3rem 18px 1fr",
    alignItems: "center",
    gap: "0.4rem",
  },
  mScoreSlot: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "#a6e3a1",
    textAlign: "right" as const,
  },
  mTeamName: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  mVenueCol: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    maxWidth: "7rem",
  },
  mVenueLabel: {
    fontSize: "0.68rem",
    color: "#cdd6f4",
    textAlign: "right" as const,
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  teamLink: {
    textDecoration: "none",
    color: "inherit",
    transition: "color 0.15s",
    fontSize: "0.875rem",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  noMatches: {
    color: "#cdd6f4",
    fontSize: "0.875rem",
    textAlign: "center" as const,
    padding: "1rem 0",
    margin: 0,
  },
  knockoutBadge: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#fab387",
    backgroundColor: "#2a1f1a",
    border: "1px solid #45352a",
    borderRadius: "4px",
    padding: "0.15rem 0.5rem",
    whiteSpace: "nowrap" as const,
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  th: {
    padding: "0.5rem 0.75rem",
    textAlign: "center",
    color: "#cdd6f4",
    fontWeight: 600,
    borderBottom: "1px solid #313244",
    whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "0.5rem 0.75rem",
    textAlign: "center",
    color: "#cdd6f4",
  },
  rowEven: {
    backgroundColor: "transparent",
  },
  rowOdd: {
    backgroundColor: "#18265b",
  },
};

// ─── Edition navigator + histórico styles ──────────────────────────────────────
const edStyles: Record<string, React.CSSProperties> = {
  // Edition navigator
  edNav: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1.5rem",
    padding: "0.6rem 0.75rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "12px",
    overflow: "hidden",
  },
  edNavLabel: {
    fontSize: "0.63rem",
    fontWeight: 800,
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    flexShrink: 0,
  },
  edArrow: {
    flexShrink: 0,
    background: "#313244",
    border: "1px solid #45475a",
    borderRadius: "50%",
    color: "#89b4fa",
    fontSize: "1.2rem",
    width: "28px",
    height: "28px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    padding: 0,
    fontWeight: 700,
  },
  edPills: {
    display: "flex",
    flexWrap: "nowrap" as const,
    overflowX: "auto" as const,
    gap: "0.4rem",
    flex: 1,
    scrollBehavior: "smooth" as const,
    scrollbarWidth: "none" as const,
  },
  edPill: {
    background: "transparent",
    border: "1px solid #45475a",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.85rem",
    fontWeight: 700,
    padding: "0.4rem 1rem",
    cursor: "pointer",
    lineHeight: 1,
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  edPillActive: {
    background: "#1a3a6a",
    border: "2px solid #89b4fa",
    borderRadius: "6px",
    color: "#89b4fa",
    fontSize: "0.85rem",
    fontWeight: 800,
    padding: "0.4rem 1rem",
    cursor: "default",
    lineHeight: 1,
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    boxShadow: "0 0 8px rgba(137,180,250,0.25)",
  },

  // Histórico
  palmSection: {
    marginTop: "3rem",
  },
  palmHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  palmTitle: {
    fontSize: "1.05rem",
    fontWeight: 800,
    color: "#f9e2af",
    letterSpacing: "0.01em",
    textTransform: "uppercase" as const,
    flexShrink: 0,
  },
  palmDivider: {
    flex: 1,
    height: "2px",
    background: "linear-gradient(90deg, #f9e2af44 0%, transparent 100%)",
    borderRadius: "1px",
  },
  palmList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.35rem",
  },
  palmRow: {
    display: "grid",
    gridTemplateColumns: "3.5rem 1fr auto",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.65rem 1rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "10px",
  },
  palmRowCurrent: {
    backgroundColor: "#1a2238",
    border: "1px solid #2a3a6a",
    boxShadow: "0 0 0 1px #89b4fa33",
  },
  palmYear: {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#89b4fa",
    textAlign: "center" as const,
  },
  palmTeams: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
  },
  palmChamp: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
  },
  palmVice: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
  },
  palmGold: { fontSize: "0.9rem", flexShrink: 0 },
  palmSilver: { fontSize: "0.9rem", flexShrink: 0 },
  palmTeamName: {
    fontSize: "0.88rem",
    fontWeight: 700,
    color: "#f9e2af",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  palmCurrentBadge: {
    fontSize: "0.6rem",
    fontWeight: 700,
    color: "#89b4fa",
    backgroundColor: "#1a1f3a",
    border: "1px solid #2a3a6a",
    borderRadius: "20px",
    padding: "0.2rem 0.6rem",
    whiteSpace: "nowrap" as const,
    letterSpacing: "0.04em",
  },
};
