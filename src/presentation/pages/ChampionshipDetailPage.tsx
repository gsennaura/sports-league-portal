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
      <h2 className="section-heading" style={{ marginBottom: "0.75rem" }}>⚽ Artilharia</h2>
      <table className="scorer-table">
        <thead>
          <tr>
            <th style={{ textAlign: "center", width: "2rem" }}>#</th>
            <th className="text-left">Atleta</th>
            <th className="text-left">Time</th>
            <th style={{ textAlign: "center", color: "var(--c-positive)", width: "3.5rem" }}>Gols</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s, i) => (
            <tr key={s.athlete_id} className={i % 2 !== 0 ? "row-alt" : ""}>
              <td style={{ color: i === 0 ? "var(--c-warning)" : undefined, fontWeight: i === 0 ? 900 : 500 }}>{i + 1}</td>
              <td style={{ fontWeight: 600 }}>
                <Link to={`/atletas/${s.athlete_id}`} style={{ color: "inherit", textDecoration: "none" }}>{s.athlete_name}</Link>
              </td>
              <td>{s.team_name}</td>
              <td style={{ color: "var(--c-positive)", fontWeight: 900, fontSize: "0.95rem" }}>{s.goals}</td>
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
      <div className="stat-strip">
        {numStats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__value" style={{ color: s.color }}>{s.value}</span>
            {s.sub && <span className="stat-card__sub">{s.sub}</span>}
            <span className="stat-card__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Row 2 — highlight cards */}
      <div className="stat-highlight-row">
        <div className="stat-highlight-card">
          <span className="stat-highlight-tag" style={{ color: "var(--c-warning)" }}>🏆 Campeão</span>
          {isOngoing ? (
            <span style={{ fontSize: "0.85rem", color: "var(--c-text-muted)", fontStyle: "italic" }}>Em andamento</span>
          ) : champion ? (
            <div className="stat-highlight-team">
              <Shield url={champion.logo} size={28} />
              <span className="stat-highlight-name">{champion.name}</span>
            </div>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "var(--c-text-muted)", fontStyle: "italic" }}>A confirmar</span>
          )}
        </div>

        {!isOngoing && (
          <div className="stat-highlight-card">
            <span className="stat-highlight-tag" style={{ color: "var(--c-action)" }}>🥈 Vice-campeão</span>
            {runnerUp ? (
              <div className="stat-highlight-team">
                <Shield url={runnerUp.logo} size={28} />
                <span className="stat-highlight-name">{runnerUp.name}</span>
              </div>
            ) : (
              <span style={{ fontSize: "0.85rem", color: "var(--c-text-muted)", fontStyle: "italic" }}>A confirmar</span>
            )}
          </div>
        )}

        {bestAttack && (
          <div className="stat-highlight-card">
            <span className="stat-highlight-tag" style={{ color: "var(--c-negative)" }}>⚽ Melhor ataque</span>
            <div className="stat-highlight-team">
              <Shield url={bestAttack.logo} size={28} />
              <span className="stat-highlight-name">{bestAttack.name}</span>
            </div>
            <span className="stat-highlight-stat" style={{ color: "var(--c-negative)" }}>
              {bestAttack.goals} <span className="stat-highlight-stat__label">gols</span>
            </span>
          </div>
        )}

        {bestDefense && (
          <div className="stat-highlight-card">
            <span className="stat-highlight-tag" style={{ color: "var(--c-positive)" }}>🛡 Melhor defesa</span>
            <div className="stat-highlight-team">
              <Shield url={bestDefense.logo} size={28} />
              <span className="stat-highlight-name">{bestDefense.name}</span>
            </div>
            <span className="stat-highlight-stat" style={{ color: "var(--c-positive)" }}>
              {bestDefense.against} <span className="stat-highlight-stat__label">sofridos</span>
            </span>
          </div>
        )}

        {bestAprov && (
          <div className="stat-highlight-card">
            <span className="stat-highlight-tag" style={{ color: "var(--c-link)" }}>📈 Melhor aproveitamento</span>
            <div className="stat-highlight-team">
              <Shield url={bestAprov.logo} size={28} />
              <span className="stat-highlight-name">{bestAprov.name}</span>
            </div>
            <span className="stat-highlight-stat" style={{ color: "var(--c-link)" }}>
              {Math.round(aprov(bestAprov) * 100)}% <span className="stat-highlight-stat__label">aprov.</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

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
    <main className="page-container">
      <Link to={backLink} className="back-link">{backLabel}</Link>

      {loading && <PageLoader />}
      {error && <p className="error-text">{error}</p>}

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
                style={{ background: "var(--c-brand)", border: "1px solid #45475a", borderRadius: 16, padding: "1.5rem", minWidth: 280, maxWidth: 420, width: "100%", maxHeight: "80vh", overflowY: "auto" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-text)" }}>📅 Edições do campeonato</span>
                  <button onClick={() => setEditionModalOpen(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {[...siblings].reverse().map((s) => {
                    const isCurrent = s.year === detail.year;
                    return (
                      <button
                        key={s.edition_id}
                        onClick={() => { setEditionModalOpen(false); navigate(`/campeonatos/${detail.id}?edicao=${s.edition_id}`); }}
                        style={{ background: isCurrent ? "var(--c-border)" : "transparent", border: isCurrent ? "1px solid #89b4fa" : "1px solid #313244", borderRadius: 8, padding: "0.6rem 0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", textAlign: "left" }}
                      >
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: isCurrent ? "var(--c-link)" : "var(--c-text)", flexShrink: 0 }}>{s.year}</span>
                        <span style={{ fontSize: "0.8rem", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.champion_team_name ? `🏆 ${s.champion_team_name}` : "—"}
                        </span>
                        {isCurrent && <span style={{ fontSize: "0.65rem", color: "var(--c-link)", fontWeight: 700, flexShrink: 0 }}>atual</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="champ-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="page-title">
                {detail.nickname ?? detail.name}
              </h1>
              {detail.nickname && (
                <p className="champ-full-name">{detail.name}</p>
              )}
              <div className="champ-badges">
                {detail.level && (
                  <span className={`champ-badge champ-badge--${detail.level in levelColor ? detail.level : "default"}`}>
                    {levelLabel[detail.level] ?? detail.level}
                  </span>
                )}
                {detail.division && (
                  <span className="champ-badge champ-badge--division">
                    {detail.division}
                  </span>
                )}
                <span className="champ-badge champ-badge--scope">{detail.scope}</span>
                {isAdmin && (
                  <Link
                    to={`/admin/campeonatos/${detail.id}/gerenciar`}
                    className="champ-badge champ-badge--default"
                    style={{ textDecoration: "none" }}
                  >
                    ✏️ Gerenciar
                  </Link>
                )}
              </div>
            </div>
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", paddingTop: "0.25rem" }}>
              {siblings.length > 1 ? (
                <button
                  onClick={() => setEditionModalOpen(true)}
                  style={{ background: "rgba(137,180,250,0.07)", border: "1.5px solid rgba(137,180,250,0.3)", borderRadius: 14, padding: "0.5rem 0.9rem", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}
                >
                  <span style={{ fontSize: "3.5rem", fontWeight: 900, color: "var(--c-link)", opacity: 0.85, lineHeight: 1, letterSpacing: "-0.03em", userSelect: "none" }}>{detail.year}</span>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--c-link)", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.65 }}>edições ▾</span>
                </button>
              ) : (
                <span className="champ-year">{detail.year}</span>
              )}
            </div>
          </div>

          <ChampionshipStats detail={detail} />

          {/* ─── Classificação Geral — botão + modal ────────────────── */}
          {detail.overall_standings.length > 0 && (
            <div className="champ-action-row">
              <button
                onClick={handleOpenStandings}
                disabled={standingsLoading}
                className="champ-action-btn"
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
                style={{ background: "var(--c-brand)", border: "1px solid #45475a", borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 820 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-text)" }}>📊 Classificação Geral</span>
                  <button onClick={() => setStandingsOpen(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <OverallStandings standings={detail.overall_standings} phases={detail.phases} />
              </div>
            </div>
          )}

          {/* Artilharia — botão + modal */}
          <div className="champ-action-row">
            <button
              onClick={handleLoadScorers}
              className="champ-action-btn champ-action-btn--action"
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
                style={{ background: "var(--c-brand)", border: "1px solid #45475a", borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 820 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-text)" }}>⚽ Artilharia</span>
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
                  style={{ background: "#2a2510", color: "var(--c-warning)", border: "1px solid #4a3a2a", borderRadius: 8, padding: "0.45rem 1rem", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  🏆 {podiumOpen ? "Fechar pódio" : "Definir campeão e vice"}
                </button>

                {podiumOpen && (
                  <div style={{ background: "var(--c-brand)", border: "1px solid #45475a", borderRadius: 12, padding: "1rem 1.2rem", marginTop: "0.6rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem", color: "var(--c-text)" }}>
                        <span>🥇 Campeão</span>
                        <select
                          value={podiumChampId}
                          onChange={(e) => setPodiumChampId(e.target.value)}
                          style={{ background: "var(--c-brand)", border: "1px solid #45475a", borderRadius: 6, color: "var(--c-text)", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                        >
                          <option value="">— Selecionar —</option>
                          {teamOptions.map(([tid, t]) => <option key={tid} value={tid}>{t.name}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem", color: "var(--c-text)" }}>
                        <span>🥈 Vice-campeão</span>
                        <select
                          value={podiumViceId}
                          onChange={(e) => setPodiumViceId(e.target.value)}
                          style={{ background: "var(--c-brand)", border: "1px solid #45475a", borderRadius: 6, color: "var(--c-text)", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                        >
                          <option value="">— Selecionar —</option>
                          {teamOptions.map(([tid, t]) => <option key={tid} value={tid}>{t.name}</option>)}
                        </select>
                      </label>
                    </div>
                    {podiumError && <p style={{ color: "var(--c-negative)", fontSize: "0.8rem", margin: "0 0 0.5rem" }}>{podiumError}</p>}
                    {podiumSaved && <p style={{ color: "var(--c-positive)", fontSize: "0.8rem", margin: "0 0 0.5rem" }}>✓ Pódio salvo com sucesso!</p>}
                    <button
                      onClick={handleSave}
                      disabled={podiumSaving}
                      style={{ background: "var(--c-warning)", color: "var(--c-brand)", border: "none", borderRadius: 8, padding: "0.5rem 1.2rem", fontWeight: 700, fontSize: "0.85rem", cursor: podiumSaving ? "not-allowed" : "pointer", opacity: podiumSaving ? 0.6 : 1 }}
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
              <div className="phase-nav">
                <button
                  className="phase-nav__btn"
                  onClick={() => canPrev && handlePhaseChange(phaseIdx - 1)}
                  disabled={!canPrev}
                  aria-label="Fase anterior"
                >←</button>
                <div className="phase-nav__center">
                  <div className="phase-nav__title-row">
                    <span className="phase-nav__name">{currentPhase.name}</span>
                    {sortedPhases.length > 1 && (
                      <span className="phase-nav__counter">{phaseIdx + 1}/{sortedPhases.length}</span>
                    )}
                    <span className={currentPhase.status === "finalizado" ? "phase-status phase-status--done" : "phase-status phase-status--ongoing"}>
                      {currentPhase.status === "finalizado" ? "Finalizado" : "Em andamento"}
                    </span>
                  </div>
                </div>
                <button
                  className="phase-nav__btn"
                  onClick={() => canNext && handlePhaseChange(phaseIdx + 1)}
                  disabled={!canNext}
                  aria-label="Próxima fase"
                >→</button>
              </div>

              <div className="groups-grid">
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
    <section className="palmares">
      <div className="palmares__header">
        <span className="palmares__title">🏆 Histórico</span>
        <div className="palmares__divider" />
      </div>
      <div className="palmares__list">
        {withChamp.map((s) => {
          const isCurrent = s.year === currentYear;
          return (
            <div key={s.edition_id} className={`palmares__row${isCurrent ? " palmares__row--current" : ""}`}>
              <span className="palmares__year">{s.year}</span>
              <div className="palmares__teams">
                <div className="palmares__team-row">
                  <span>🥇</span>
                  <span className="palmares__team-name">{s.champion_team_name}</span>
                </div>
                {s.runner_up_team_name && (
                  <div className="palmares__team-row">
                    <span>🥈</span>
                    <span className="palmares__team-name palmares__team-name--vice">{s.runner_up_team_name}</span>
                  </div>
                )}
              </div>
              {isCurrent && <span className="palmares__badge">Esta edição</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function KnockoutGroupCard({ group }: { group: GroupDetail }) {
  return (
    <div className="group-card">
      <div className="group-card__header">
        <h3 className="group-card__title">{group.name}</h3>
        <span className="knockout-badge">Mata-a-mata</span>
      </div>
      <MatchRoundList matches={group.matches} teams={group.teams} knockout />
    </div>
  );
}

function GroupCard({ group }: { group: GroupDetail }) {
  return (
    <div className="group-card">
      <div className="group-card__header">
        <h3 className="group-card__title">{group.name}</h3>
      </div>
      <MatchRoundList matches={group.matches} teams={group.teams} />
      {group.standings.length > 0 && (
        <>
          <div className="group-card__divider" />
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
    return <p className="empty-notice">Nenhuma partida registrada.</p>;
  }

  const legLabel = (round: number) =>
    knockout ? (round === 1 ? "Jogo de ida" : round === 2 ? "Jogo de volta" : `Jogo ${round}`) : `Rodada ${round}`;

  return (
    <div className="rounds">
      {[...rounds.entries()].map(([round, roundMatches]) => (
        <div key={round}>
          <div className="round__header">{legLabel(round)}</div>
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
              <Link key={m.id} to={`/partidas/${m.id}`} className="match-entry">
                <div className="match-entry__row">
                  {/* Col 1 — data e hora */}
                  <div className="match-entry__date-col">
                    {dateLabel && <span className="match-entry__date-label">{dateLabel}</span>}
                    {timeLabel && <span className="match-entry__time-label">{timeLabel}</span>}
                  </div>

                  {/* Col 2 — times + placar */}
                  <div className="match-entry__teams-col">
                    <div className="match-entry__team-row">
                      <span className="match-entry__score">
                        {hasScore ? `${m.home_score}${hasPenalty ? ` (${m.home_penalty_score})` : ""}` : ""}
                      </span>
                      <Shield url={m.home_club_logo_url} />
                      <span className="match-entry__team-name">{home}</span>
                    </div>
                    <div className="match-entry__team-row">
                      <span className="match-entry__score">
                        {hasScore ? `${m.away_score}${hasPenalty ? ` (${m.away_penalty_score})` : ""}` : ""}
                      </span>
                      <Shield url={m.away_club_logo_url} />
                      <span className="match-entry__team-name">{away}</span>
                    </div>
                  </div>

                  {/* Col 3 — estádio */}
                  {m.venue_name && (
                    <div className="match-entry__venue-col">
                      <span className="match-entry__venue-label">{m.venue_name}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ))}
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
    <div className="champ-standings">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th style={{ textAlign: "left" }}>Time</th>
            <th style={{ color: "var(--c-link)" }} title="Pontos">Pts</th>
            <th title="Vitórias">V</th>
            <th title="Empates">E</th>
            <th title="Derrotas">D</th>
            <th title="Gols Marcados">GM</th>
            <th title="Gols Sofridos">GS</th>
            {showAprov && <th style={{ color: "var(--c-positive)" }} title="Saldo de Gols">SG</th>}
            <th title="Partidas">J</th>
            {showAprov && <th style={{ color: "var(--c-warning)" }} title="Aproveitamento">Aprov.</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr
              key={s.team_id}
              className={i % 2 !== 0 ? "row-odd" : ""}
              style={eliminatedTeamIds?.has(s.team_id) ? { backgroundColor: "rgba(243, 139, 168, 0.10)" } : undefined}
            >
              <td>{i + 1}</td>
              <td style={{ textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Shield url={s.club_logo_url} size={16} />
                  <Link to={`/times/${toSlugPath(s.team_name, s.team_id)}`} className="team-link">{s.team_name}</Link>
                </div>
              </td>
              <td style={{ fontWeight: 700, color: "var(--c-link)" }}>{s.points}</td>
              <td>{s.wins}</td>
              <td>{s.draws}</td>
              <td>{s.losses}</td>
              <td>{s.goals_for}</td>
              <td>{s.goals_against}</td>
              {showAprov && <td style={{ color: s.goal_difference >= 0 ? "var(--c-positive)" : "var(--c-negative)" }}>{s.goal_difference > 0 ? "+" : ""}{s.goal_difference}</td>}
              <td>{s.matches_played}</td>
              {showAprov && <td style={{ fontWeight: 700, color: "var(--c-warning)" }}>{aprovPct(s)}%</td>}
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
    <section className="overall-section">
      <div className="overall-section__header">
        <span className="overall-section__title">Classificação Geral</span>
      </div>
      <div className="group-card">
        <StandingsTable standings={rows} teams={[]} showAprov eliminatedTeamIds={eliminatedTeamIds} />
      </div>
      {hasEliminated && (
        <div className="eliminated-legend">
          <span className="eliminated-legend__dot" />
          <span>Time eliminado — não está na última fase do campeonato</span>
        </div>
      )}
    </section>
  );
}

