import React, { useState, useEffect, useCallback } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toSlugPath } from "@utils/slug";
import type { GetMatchDetail } from "@application/use_cases/GetMatchDetail";
import type { GetHeadToHead } from "@application/use_cases/GetHeadToHead";
import type { GetTeamAthletes } from "@application/use_cases/AthleteTeam";
import type { GetTeamMatches } from "@application/use_cases/GetTeamMatches";
import type { AddMatchEvent, AnnulMatchEvent } from "@application/use_cases/MatchEvent";
import type { TeamMatch } from "@domain/entities/TeamMatch";
import type { MatchDetail } from "@domain/entities/MatchDetail";
import type { HeadToHeadMatch } from "@domain/entities/HeadToHeadMatch";
import type { AthleteTeamHistory } from "@domain/entities/Athlete";
import type { MatchEvent, MatchEventType, MatchEventPeriod, MatchEventPayload } from "@domain/entities/MatchEvent";
import { EVENT_ICONS, ALL_PERIODS, PERIOD_LABELS } from "@domain/entities/MatchEvent";
import type { MatchReferee } from "@domain/entities/MatchReferee";
import { ROLE_LABELS } from "@domain/entities/MatchReferee";
import { useAuth } from "@presentation/context/AuthContext";
import { MatchTimeline } from "@presentation/components/MatchTimeline";

const NO_SHIELD = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/clubs/no_club_shield.png";

function Shield({ url, size = 48 }: { url: string | null; size?: number }) {
  return (
    <img
      src={url ?? NO_SHIELD}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_SHIELD; }}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
      alt=""
    />
  );
}

interface MatchDetailPageProps {
  getMatchDetail: GetMatchDetail;
  getHeadToHead: GetHeadToHead;
  getTeamAthletes: GetTeamAthletes;
  getTeamMatches: GetTeamMatches;
  addMatchEvent: AddMatchEvent;
  annulMatchEvent: AnnulMatchEvent;
}

type FormResult = "V" | "E" | "D";

function computeForm(matches: TeamMatch[], teamId: string): FormResult[] {
  const finished = matches
    .filter((m) => m.home_score !== null && m.away_score !== null)
    .sort((a, b) => {
      if (!a.match_date && !b.match_date) return 0;
      if (!a.match_date) return 1;
      if (!b.match_date) return -1;
      return b.match_date.localeCompare(a.match_date);
    })
    .slice(0, 5);
  return finished.map((m) => {
    const isHome = m.home_team_id === teamId;
    const myScore = isHome ? m.home_score! : m.away_score!;
    const opScore = isHome ? m.away_score! : m.home_score!;
    if (myScore > opScore) return "V";
    if (myScore < opScore) return "D";
    return "E";
  });
}

export function MatchDetailPage({ getMatchDetail, getHeadToHead, getTeamAthletes, getTeamMatches, addMatchEvent, annulMatchEvent }: MatchDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [liveEvents, setLiveEvents] = useState<MatchEvent[]>([]);
  const [h2h, setH2h] = useState<HeadToHeadMatch[]>([]);
  const [homeAthletes, setHomeAthletes] = useState<AthleteTeamHistory[]>([]);
  const [awayAthletes, setAwayAthletes] = useState<AthleteTeamHistory[]>([]);
  const [homeForm, setHomeForm] = useState<FormResult[]>([]);
  const [awayForm, setAwayForm] = useState<FormResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleEventAdded = useCallback((event: MatchEvent) => {
    setLiveEvents((prev) => [...prev, event]);
  }, []);

  const handleEventAnnulled = useCallback((eventId: string) => {
    setLiveEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, is_annulled: true } : e));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getMatchDetail.execute(id),
      getHeadToHead.execute(id),
    ]).then(([matchData, h2hData]) => {
      setMatch(matchData);
      setLiveEvents(matchData.events ?? []);
      setH2h(h2hData);
      setLoading(false);
      // fetch rosters and form after we know the team IDs
      Promise.all([
        getTeamAthletes.execute(matchData.home_team_id),
        getTeamAthletes.execute(matchData.away_team_id),
        getTeamMatches.execute(matchData.home_team_id),
        getTeamMatches.execute(matchData.away_team_id),
      ]).then(([homeData, awayData, homeMatches, awayMatches]) => {
        setHomeAthletes(homeData);
        setAwayAthletes(awayData);
        setHomeForm(computeForm(homeMatches, matchData.home_team_id));
        setAwayForm(computeForm(awayMatches, matchData.away_team_id));
      }).catch(() => { /* rosters/form are optional, ignore errors */ });
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setLoading(false);
    });
  }, [id, getMatchDetail, getHeadToHead, getTeamAthletes, getTeamMatches]);

  const h2hGroups = groupH2H(h2h);

  return (
    <>
      {/* ─── Header ─────────────────────────────────────────────────────────────────── */}
      <header className="match-header">
        <div className="match-header__nav">
          <button onClick={() => navigate(-1)} className="back-link">← Voltar</button>
          {isAdmin && id && (
            <Link to={`/admin/partidas/${id}/editar`} className="btn-edit">
              ✏️ Editar partida
            </Link>
          )}
        </div>
        {match && (
          <div className="match-header__context">
            <span className="match-header__champ">
              {match.championship_name} · {match.championship_year}
              {match.division_name ? ` · ${match.division_name}` : ""}
            </span>
            <span className="match-header__phase">
              {[match.phase_name, `Rodada ${match.round_number}`].join(" · ")}
            </span>
          </div>
        )}
      </header>

      {/* ─── Content ────────────────────────────────────────────────────── */}
      <main className="page-container">
        {loading && <PageLoader />}
        {error && <p className="error-text">{error}</p>}

        {!loading && match && (
          <>
            {match.match_date && (
              <p className="match-meta">{formatDateTime(match.match_date)}</p>
            )}

            <div className="score-card">
              <div className="score-grid">
                {/* Home team */}
                <div className="score-team">
                  <Shield url={match.home_club_logo_url} size={48} />
                  <Link to={`/times/${toSlugPath(match.home_team_name, match.home_team_id)}`} className="row-link">{match.home_team_name}</Link>
                  {homeForm.length > 0 && <FormRow form={homeForm} />}
                </div>

                {/* Score */}
                <div className="score-center">
                  {match.home_score !== null && match.away_score !== null ? (
                    <>
                      <span className="score-big">
                        {match.home_score} × {match.away_score}
                      </span>
                      {match.home_penalty_score !== null && match.away_penalty_score !== null && (
                        <span className="muted">
                          pên: {match.home_penalty_score} × {match.away_penalty_score}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="score-sep">vs</span>
                  )}
                </div>

                {/* Away team */}
                <div className="score-team score-team--away">
                  <Shield url={match.away_club_logo_url} size={48} />
                  <Link to={`/times/${toSlugPath(match.away_team_name, match.away_team_id)}`} className="row-link">{match.away_team_name}</Link>
                  {awayForm.length > 0 && <FormRow form={awayForm} />}
                </div>
              </div>
            </div>

            {/* ─── Meta info ──────────────────────────────────────────── */}
            {(match.venue_name || match.city_name) && (
              <p className="muted">
                📍{" "}
                {match.venue_id
                  ? <Link to={`/locais/${toSlugPath(match.venue_name!, match.venue_id!)}`} className="row-link">{match.venue_name}</Link>
                  : match.venue_name
                }
                {match.venue_name && match.city_name && " — "}
                {match.city_name}
              </p>
            )}

            <Section title="Linha do Tempo">
              <MatchTimeline
                events={liveEvents}
                homeTeamId={match.home_team_id}
                homeTeamName={match.home_team_name}
                awayTeamId={match.away_team_id}
                awayTeamName={match.away_team_name}
                homeAthletes={homeAthletes}
                awayAthletes={awayAthletes}
                matchId={match.id}
                isAdmin={isAdmin}
                addMatchEvent={addMatchEvent}
                annulMatchEvent={annulMatchEvent}
                onEventAdded={handleEventAdded}
                onEventAnnulled={handleEventAnnulled}
              />
            </Section>

            {/* ─── Rosters ────────────────────────────────────────────── */}
            {(homeAthletes.length > 0 || awayAthletes.length > 0) && (
              <RosterSection
                homeTeamName={match.home_team_name}
                awayTeamName={match.away_team_name}
                homeAthletes={homeAthletes}
                awayAthletes={awayAthletes}
                matchId={match.id}
                homeTeamId={match.home_team_id}
                awayTeamId={match.away_team_id}
                isAdmin={isAdmin}
                addMatchEvent={addMatchEvent}
                onEventAdded={handleEventAdded}
              />
            )}

            {/* ─── Equipe de Arbitragem ────────────────────────────── */}
            <Section title="Equipe de Arbitragem">
              {!match.referees || match.referees.length === 0 ? (
                <p className="muted">Equipe de arbitragem não informada.</p>
              ) : (
                <RefereesSection referees={match.referees} />
              )}
            </Section>

            {/* ─── Head to head ───────────────────────────────────────── */}
            <Section title="Histórico Entre os Times">
              {h2hGroups.length === 0 ? (
                <p className="muted">Nenhum confronto anterior encontrado.</p>
              ) : (
                <>
                  <H2HStats
                    matches={h2h}
                    homeName={match.home_team_name}
                    awayName={match.away_team_name}
                    homeId={match.home_team_id}
                  />
                  {h2hGroups.map(([key, group]) => (
                    <div key={key} className="h2h-group">
                      <div className="h2h-group__header">
                        {group[0].championship_name} · {group[0].championship_year}
                      </div>
                      {group.map((m) => (
                        <H2HMatchRow key={m.id} match={m} />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </Section>
          </>
        )}
      </main>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const NO_ATHLETE_PHOTO = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/athletes/no_athlete_photo.png";
const NO_REFEREE_PHOTO = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/referees/no_referee_photo.png";

// ── RefereesSection ───────────────────────────────────────────────────────────
function RefereesSection({ referees }: { referees: MatchReferee[] }) {
  const ROLE_CLASS: Record<string, string> = {
    main_referee: "referee-card__role--main",
    assistant:    "referee-card__role--assistant",
    delegate:     "referee-card__role--delegate",
  };

  return (
    <div className="referees-grid">
      {referees.map((ref) => (
        <Link key={ref.id} to={`/arbitros/${ref.referee_id}`} className="referee-card">
          <img
            src={ref.referee_photo_url ?? NO_REFEREE_PHOTO}
            alt={ref.referee_name ?? ""}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_REFEREE_PHOTO; }}
            className="referee-card__photo"
          />
          <div className="referee-card__info">
            <span className="referee-card__name">
              {ref.referee_nickname ?? ref.referee_name ?? "Árbitro"}
            </span>
            <span className={`referee-card__role ${ROLE_CLASS[ref.role] ?? "referee-card__role--default"}`}>
              {ROLE_LABELS[ref.role]}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function useIsMobile(breakpoint = 600): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── RosterSection: two-column on desktop, tabs on mobile ─────────────────────
function RosterSection({
  homeTeamName, awayTeamName,
  homeAthletes, awayAthletes,
  matchId, homeTeamId, awayTeamId,
  isAdmin, addMatchEvent, onEventAdded,
}: {
  homeTeamName: string;
  awayTeamName: string;
  homeAthletes: AthleteTeamHistory[];
  awayAthletes: AthleteTeamHistory[];
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  isAdmin: boolean;
  addMatchEvent: AddMatchEvent;
  onEventAdded: (event: MatchEvent) => void;
}) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"home" | "away">("home");

  if (!isMobile) {
    return (
      <Section title="Elencos">
        <div className="roster-grid">
          <RosterColumn
            teamName={homeTeamName}
            athletes={homeAthletes}
            align="left"
            isAdmin={isAdmin}
            matchId={matchId}
            teamId={homeTeamId}
            addMatchEvent={addMatchEvent}
            onEventAdded={onEventAdded}
          />
          <RosterColumn
            teamName={awayTeamName}
            athletes={awayAthletes}
            align="right"
            isAdmin={isAdmin}
            matchId={matchId}
            teamId={awayTeamId}
            addMatchEvent={addMatchEvent}
            onEventAdded={onEventAdded}
          />
        </div>
      </Section>
    );
  }

  // Mobile: tab layout
  return (
    <Section title="Elencos">
      {/* Tab bar */}
      <div className="tab-bar">
        <button
          className={`tab-bar__btn${activeTab === "home" ? " tab-bar__btn--active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          {homeTeamName}
        </button>
        <button
          className={`tab-bar__btn${activeTab === "away" ? " tab-bar__btn--active" : ""}`}
          onClick={() => setActiveTab("away")}
        >
          {awayTeamName}
        </button>
      </div>

      {/* Active roster */}
      {activeTab === "home" ? (
        <RosterColumn
          teamName={homeTeamName}
          athletes={homeAthletes}
          align="left"
          isAdmin={isAdmin}
          matchId={matchId}
          teamId={homeTeamId}
          addMatchEvent={addMatchEvent}
          onEventAdded={onEventAdded}
          hideName
        />
      ) : (
        <RosterColumn
          teamName={awayTeamName}
          athletes={awayAthletes}
          align="left"
          isAdmin={isAdmin}
          matchId={matchId}
          teamId={awayTeamId}
          addMatchEvent={addMatchEvent}
          onEventAdded={onEventAdded}
          hideName
        />
      )}
    </Section>
  );
}

// Tab styles migrated to CSS classes (.tab-bar__btn, .tab-bar__btn--active)

const FORM_COLORS: Record<FormResult, string> = {
  V: "#a6e3a1",
  E: "#f9e2af",
  D: "#f38ba8",
};

function FormRow({ form }: { form: FormResult[] }) {
  return (
    <div style={{ display: "flex", gap: "0.2rem", marginTop: "0.25rem" }}>
      {form.map((r, i) => (
        <span
          key={i}
          style={{
            width: 20,
            height: 20,
            borderRadius: "4px",
            backgroundColor: FORM_COLORS[r],
            color: "var(--c-brand)",
            fontSize: "0.65rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

// Quick-action event types shown on roster rows
const QUICK_ACTIONS: { type: MatchEventType; icon: string }[] = [
  { type: "goal", icon: "⚽" },
  { type: "yellow_card", icon: "🟨" },
  { type: "red_card", icon: "🟥" },
];

function RosterColumn({
  teamName,
  athletes,
  align,
  isAdmin = false,
  matchId,
  teamId,
  addMatchEvent,
  onEventAdded,
  hideName = false,
}: {
  teamName: string;
  athletes: AthleteTeamHistory[];
  align: "left" | "right";
  isAdmin?: boolean;
  matchId?: string;
  teamId?: string;
  addMatchEvent?: AddMatchEvent;
  onEventAdded?: (event: MatchEvent) => void;
  hideName?: boolean;
}) {
  const sorted = [...athletes].sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99));

  // popover state: which athlete + which event type
  const [popover, setPopover] = useState<{ athleteId: string; eventType: MatchEventType } | null>(null);
  const [period, setPeriod] = useState<MatchEventPeriod>("first_half");
  const [minute, setMinute] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openPopover = (athleteId: string, eventType: MatchEventType) => {
    setPopover({ athleteId, eventType });
    setPeriod("first_half");
    setMinute("");
    setSaveError(null);
  };
  const closePopover = () => { setPopover(null); setSaveError(null); };

  const handleQuickSave = async () => {
    if (!popover || !matchId || !teamId || !addMatchEvent || !onEventAdded) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: MatchEventPayload = {
        team_id: teamId,
        event_type: popover.eventType,
        period,
        athlete_id: popover.athleteId,
        minute: minute ? parseInt(minute) : null,
        extra_time: null,
        notes: null,
      };
      const saved = await addMatchEvent.execute(matchId, payload);
      onEventAdded(saved);
      closePopover();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`roster-col${align === "right" ? " roster-col--right" : ""}`}>
      {!hideName && <span className="muted">{teamName}</span>}
      {sorted.length === 0 ? (
        <span className="muted">Sem elenco cadastrado</span>
      ) : (
        sorted.map((a) => {
          const isOpen = popover?.athleteId === a.athlete_id;
          return (
            <div key={a.id} style={{ width: "100%" }}>
              <div className={`roster-row${align === "right" ? " roster-row--right" : ""}`}>
                <Link
                  to={`/atletas/${a.athlete_id}`}
                  style={{ display: "flex", flexDirection: align === "right" ? "row-reverse" : "row", alignItems: "center", gap: "0.5rem", textDecoration: "none", flex: 1 }}
                >
                  <img
                    src={a.athlete_photo_url || NO_ATHLETE_PHOTO}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_ATHLETE_PHOTO; }}
                    alt={a.athlete_name ?? "Atleta"}
                    className="avatar"
                  />
                  <div className={`roster-info${align === "right" ? " roster-info--right" : ""}`}>
                    <span className="team-name">{a.athlete_nickname ?? a.athlete_name ?? "—"}</span>
                    <div className="muted">
                      {a.jersey_number != null && (
                        <span className="muted">#{a.jersey_number}</span>
                      )}
                      {a.athlete_position && (
                        <span className="muted">{a.athlete_position}</span>
                      )}
                    </div>
                  </div>
                </Link>

                {isAdmin && (
                  <div style={{ display: "flex", gap: "0.15rem", flexShrink: 0 }}>
                    {QUICK_ACTIONS.map((qa) => (
                      <button
                        key={qa.type}
                        title={qa.type.replace(/_/g, " ")}
                        style={QS.qaBtn}
                        onClick={() => isOpen && popover?.eventType === qa.type ? closePopover() : openPopover(a.athlete_id, qa.type)}
                      >
                        {qa.icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline popover */}
              {isOpen && (
                <div style={{ ...QS.popover, alignItems: align === "right" ? "flex-end" : "flex-start" }}>
                  <div style={QS.popoverInner}>
                    <span style={QS.popoverTitle}>
                      {EVENT_ICONS[popover!.eventType]} {(a.athlete_nickname ?? a.athlete_name ?? "—")}
                    </span>
                    <div style={QS.row}>
                      <div style={{ flex: 1 }}>
                        <label style={QS.label}>Período</label>
                        <select style={QS.select} value={period} onChange={(e) => setPeriod(e.target.value as MatchEventPeriod)}>
                          {ALL_PERIODS.map((p) => (
                            <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ width: 72 }}>
                        <label style={QS.label}>Minuto</label>
                        <input
                          style={QS.input}
                          type="number"
                          min={0}
                          max={200}
                          placeholder="—"
                          value={minute}
                          onChange={(e) => setMinute(e.target.value)}
                        />
                      </div>
                    </div>
                    {saveError && <p style={QS.error}>{saveError}</p>}
                    <div style={QS.actions}>
                      <button style={QS.cancelBtn} onClick={closePopover} disabled={saving}>Cancelar</button>
                      <button style={QS.saveBtn} onClick={handleQuickSave} disabled={saving}>
                        {saving ? "..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function H2HStats({
  matches, homeName, awayName, homeId,
}: {
  matches: HeadToHeadMatch[];
  homeName: string;
  awayName: string;
  homeId: string;
}) {
  const played = matches.filter((m) => m.home_score !== null && m.away_score !== null);
  let homeWins = 0, draws = 0, awayWins = 0;
  let homeGoals = 0, awayGoals = 0;

  for (const m of played) {
    const hs = m.home_score!;
    const as_ = m.away_score!;
    // Normalise perspective: "home" = homeId team
    const homeIsHome = m.home_team_id === homeId;
    const hScore = homeIsHome ? hs : as_;
    const aScore = homeIsHome ? as_ : hs;
    homeGoals += hScore;
    awayGoals += aScore;
    if (hScore > aScore) homeWins++;
    else if (hScore < aScore) awayWins++;
    else draws++;
  }

  const total = played.length;
  if (total === 0) return null;

  const homePct = Math.round((homeWins / total) * 100);
  const drawPct = Math.round((draws / total) * 100);
  const awayPct = 100 - homePct - drawPct;

  return (
    <div className="stats-block">
      {/* Win bar */}
      <div className="stats-row">
        <span className="muted">{homeName}</span>
        <span className="muted" />
        <span style={{ ...S.statsTeamLabel, textAlign: "right" as const }}>{awayName}</span>
      </div>
      <div className="stats-row">
        <span className="stats-count">{homeWins}V</span>
        <span className="stats-count">{draws}E</span>
        <span style={{ ...S.statsCount, textAlign: "right" as const }}>{awayWins}V</span>
      </div>
      <div className="win-bar">
        {homePct > 0 && <div className="win-bar__home" style={{ width: `${homePct}%` }} />}
        {drawPct > 0 && <div className="win-bar__draw" style={{ width: `${drawPct}%` }} />}
        {awayPct > 0 && <div className="win-bar__away" style={{ width: `${awayPct}%` }} />}
      </div>
      <div className="stats-row">
        <span className="muted">{homePct}%</span>
        <span style={{ ...S.statsPct, textAlign: "center" as const }}>{drawPct}%</span>
        <span style={{ ...S.statsPct, textAlign: "right" as const }}>{awayPct}%</span>
      </div>

      <div  />

      {/* Goals */}
      <StatBar label="Gols marcados" homeVal={homeGoals} awayVal={awayGoals} />
      <StatBar label="Média de gols" homeVal={+(homeGoals / total).toFixed(1)} awayVal={+(awayGoals / total).toFixed(1)} />

      <div className="muted">{total} jogo{total !== 1 ? "s" : ""} no histórico</div>
    </div>
  );
}

function StatBar({ label, homeVal, awayVal }: { label: string; homeVal: number; awayVal: number }) {
  const total = homeVal + awayVal || 1;
  const homePct = Math.round((homeVal / total) * 100);
  const awayPct = 100 - homePct;
  return (
    <div className="stat-bar">
      <div className="stat-bar__header">
        <span className="muted">{homeVal}</span>
        <span className="muted">{label}</span>
        <span className="muted" style={{ textAlign: "right" }}>{awayVal}</span>
      </div>
      <div className="stat-bar__track">
        {homePct > 0 && <div className="stat-bar__home" style={{ width: `${homePct}%` }} />}
        {awayPct > 0 && <div className="stat-bar__away" style={{ width: `${awayPct}%` }} />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="match-section">
      <h2 className="match-section__title">{title}</h2>
      <div className="match-section__body">{children}</div>
    </section>
  );
}

function H2HMatchRow({ match: m }: { match: HeadToHeadMatch }) {
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
    <Link to={`/partidas/${m.id}`} className="match-entry">
      <div className="match-entry__row">
        <div className="match-entry__date-col">
          {dateLabel && <span className="match-entry__date-label">{dateLabel}</span>}
          {timeLabel && <span className="match-entry__time-label">{timeLabel}</span>}
        </div>
        <div className="match-entry__teams-col">
          <div className="match-entry__team-row">
            <span className="match-entry__score">
              {hasScore ? `${m.home_score}${hasPenalty ? ` (${m.home_penalty_score})` : ""}` : ""}
            </span>
            <Shield url={m.home_club_logo_url ?? null} size={16} />
            <span className="match-entry__team-name">{m.home_team_name}</span>
          </div>
          <div className="match-entry__team-row">
            <span className="match-entry__score">
              {hasScore ? `${m.away_score}${hasPenalty ? ` (${m.away_penalty_score})` : ""}` : ""}
            </span>
            <Shield url={m.away_club_logo_url ?? null} size={16} />
            <span className="match-entry__team-name">{m.away_team_name}</span>
          </div>
        </div>
        {m.phase_name && (
          <div className="match-entry__venue-col">
            <span className="match-entry__venue-label">{m.phase_name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  // iso may be "2026-04-12T10:00:00" or "2026-04-12"
  const [datePart, timePart] = iso.includes("T") ? iso.split("T") : [iso, null];
  const d = new Date(`${datePart}T12:00:00`);
  const dateStr = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  if (!timePart) return dateStr;
  const [h, m] = timePart.split(":");
  return `${dateStr} · ${h}h${m}`;
}

function groupH2H(matches: HeadToHeadMatch[]): [string, HeadToHeadMatch[]][] {
  const map = new Map<string, HeadToHeadMatch[]>();
  for (const m of matches) {
    const key = `${m.championship_id}|${m.championship_year}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return [...map.entries()];
}

// ─── Styles ────────────────────────────────────────────────────────────────────

// Quick-action popover styles
const QS: Record<string, React.CSSProperties> = {
  qaBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    padding: "0.1rem 0.15rem",
    lineHeight: 1,
    opacity: 0.7,
    transition: "opacity 0.1s",
  },
  popover: {
    display: "flex",
    flexDirection: "column",
    padding: "0 0 0.4rem 0",
  },
  popoverInner: {
    background: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "8px",
    padding: "0.6rem 0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    maxWidth: "340px",
  },
  popoverTitle: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#cdd6f4",
  },
  row: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "flex-end",
  },
  label: {
    display: "block",
    fontSize: "0.7rem",
    color: "#ffffff",
    marginBottom: "0.2rem",
  },
  select: {
    width: "100%",
    background: "#313244",
    border: "1px solid #45475a",
    borderRadius: "5px",
    color: "#cdd6f4",
    fontSize: "0.78rem",
    padding: "0.2rem 0.35rem",
  },
  input: {
    width: "100%",
    background: "#313244",
    border: "1px solid #45475a",
    borderRadius: "5px",
    color: "#cdd6f4",
    fontSize: "0.78rem",
    padding: "0.2rem 0.35rem",
  },
  actions: {
    display: "flex",
    gap: "0.4rem",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    background: "none",
    border: "1px solid #45475a",
    borderRadius: "5px",
    color: "#ffffff",
    fontSize: "0.75rem",
    padding: "0.25rem 0.6rem",
    cursor: "pointer",
  },
  saveBtn: {
    background: "#89b4fa",
    border: "none",
    borderRadius: "5px",
    color: "#18265b",
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "0.25rem 0.75rem",
    cursor: "pointer",
  },
  error: {
    color: "#f38ba8",
    fontSize: "0.72rem",
    margin: 0,
  },
};

const S: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: "#18265b",
    borderBottom: "1px solid #313244",
    padding: "1rem 1.5rem",
  },
  headerInner: {
    maxWidth: "860px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  back: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#89b4fa",
    fontSize: "0.9rem",
    padding: 0,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  headerTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editBtn: {
    background: "#313244",
    border: "1px solid #45475a",
    borderRadius: "6px",
    padding: "0.3rem 0.75rem",
    color: "#cdd6f4",
    fontSize: "0.8rem",
    fontWeight: 500,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  context: {
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
  },
  contextChamp: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#cba6f7",
  },
  contextPhase: {
    fontSize: "0.8rem",
    color: "#cdd6f4",
  },
  page: {
    maxWidth: "860px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
  },
  status: { color: "#cdd6f4" },
  errorText: { color: "#f38ba8" },

  // ── Score card ──
  scoreCard: {
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "10px",
    padding: "1.5rem 1.5rem",
    marginBottom: "0.5rem",
  },
  scoreGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    alignItems: "center",
    gap: "0.75rem",
  },
  teamBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  teamNameLink: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textDecoration: "none",
    display: "block",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  } as React.CSSProperties,
  teamCategory: {
    fontSize: "0.7rem",
    color: "#cdd6f4",
    fontStyle: "italic",
  },
  scoreCenterBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.3rem",
  },
  bigScore: {
    fontSize: "2rem",
    fontWeight: 900,
    color: "#a6e3a1",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  },
  penaltyScore: {
    fontSize: "0.75rem",
    color: "#fab387",
  },
  vsText: {
    fontSize: "1.25rem",
    color: "#cdd6f4",
    fontWeight: 500,
  },
  dateTimeLine: {
    fontSize: "0.88rem",
    color: "#89b4fa",
    textAlign: "center" as const,
    marginBottom: "0.75rem",
    fontWeight: 600,
    textTransform: "capitalize" as const,
  },
  venueLine: {
    fontSize: "0.8rem",
    color: "#cdd6f4",
    textAlign: "center" as const,
    marginBottom: "2rem",
    marginTop: "0.4rem",
  },
  venueLink: {
    color: "#89b4fa",
    textDecoration: "none",
    fontWeight: 600,
  },
  metaLine: {
    fontSize: "0.8rem",
    color: "#cdd6f4",
    textAlign: "center",
    marginBottom: "2rem",
    padding: "0.25rem 0",
  },

  // ── Sections ──
  section: {
    marginBottom: "2rem",
  },
  sectionTitle: {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#cdd6f4",
    marginBottom: "0.5rem",
  },
  sectionBody: {
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    overflow: "hidden",
  },
  placeholder: {
    color: "#cdd6f4",
    fontSize: "0.875rem",
    padding: "1.25rem 1rem",
    margin: 0,
  },

  // ── Head to head ──
  // ── H2H Stats ──
  statsBlock: {
    padding: "1.25rem 1rem 0.75rem",
    borderBottom: "1px solid #313244",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "0.5rem",
    marginBottom: "0.2rem",
  },
  statsTeamLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  statsCount: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#cdd6f4",
  },
  statsCountCenter: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textAlign: "center" as const,
  },
  winBar: {
    display: "flex",
    height: "8px",
    borderRadius: "4px",
    overflow: "hidden",
    margin: "0.3rem 0",
    backgroundColor: "#313244",
  },
  winBarHome: {
    backgroundColor: "#89b4fa",
    height: "100%",
    transition: "width 0.3s",
  },
  winBarDraw: {
    backgroundColor: "#ffffff",
    height: "100%",
  },
  winBarAway: {
    backgroundColor: "#f38ba8",
    height: "100%",
  },
  statsPct: {
    fontSize: "0.68rem",
    color: "#cdd6f4",
  },
  statsDivider: {
    height: "1px",
    backgroundColor: "#313244",
    margin: "0.75rem 0",
  },
  statBarBlock: {
    marginBottom: "0.6rem",
  },
  statBarHeader: {
    display: "grid",
    gridTemplateColumns: "2rem 1fr 2rem",
    gap: "0.5rem",
    marginBottom: "0.2rem",
    alignItems: "center",
  },
  statBarVal: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#cdd6f4",
  },
  statBarLabel: {
    fontSize: "0.7rem",
    color: "#cdd6f4",
    textAlign: "center" as const,
  },
  statBarTrack: {
    display: "flex",
    height: "5px",
    borderRadius: "3px",
    overflow: "hidden",
    backgroundColor: "#313244",
  },
  statBarFillHome: {
    backgroundColor: "#89b4fa",
    height: "100%",
  },
  statBarFillAway: {
    backgroundColor: "#f38ba8",
    height: "100%",
  },
  statsFootnote: {
    fontSize: "0.65rem",
    color: "#cdd6f4",
    textAlign: "center" as const,
    marginTop: "0.5rem",
  },

  h2hGroup: {},
  h2hGroupHeader: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#89b4fa",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "0.5rem 1rem",
    backgroundColor: "#18265b",
    borderBottom: "1px solid #313244",
  },
  h2hMatchLink: {
    textDecoration: "none",
    color: "inherit",
    display: "block",
  },
  h2hCardRow: {
    display: "grid",
    gridTemplateColumns: "3rem 1fr auto",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.45rem 1rem",
    borderBottom: "1px solid #18265b",
  },
  h2hDateCol: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.1rem",
    flexShrink: 0,
  },
  h2hDateLabel: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#cdd6f4",
  },
  h2hTimeLabel: {
    fontSize: "0.65rem",
    color: "#cdd6f4",
    fontWeight: 600,
  },
  h2hTeamsCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
    minWidth: 0,
  },
  h2hTeamRow: {
    display: "grid",
    gridTemplateColumns: "3rem 18px 1fr",
    alignItems: "center",
    gap: "0.4rem",
  },
  h2hScoreSlot: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "#a6e3a1",
    textAlign: "right" as const,
  },
  h2hTeamName: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  h2hPhaseCol: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    maxWidth: "7rem",
  },
  h2hPhaseLabel: {
    fontSize: "0.68rem",
    color: "#cdd6f4",
    textAlign: "right" as const,
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },

  // ── Rosters ──
  rosterColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 0,
  },
  rosterCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.1rem",
    padding: "0.75rem 0.75rem 1rem",
  },
  rosterColTitle: {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#89b4fa",
    marginBottom: "0.4rem",
  },
  rosterEmpty: {
    fontSize: "0.75rem",
    color: "#ffffff",
    fontStyle: "italic" as const,
  },
  rosterRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textDecoration: "none",
    color: "inherit",
    padding: "0.3rem 0.25rem",
    borderRadius: "4px",
  },
  rosterThumb: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    objectFit: "cover" as const,
    flexShrink: 0,
    backgroundColor: "#313244",
  },
  rosterInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.1rem",
    minWidth: 0,
  },
  rosterPlayerName: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  rosterMeta: {
    display: "flex",
    gap: "0.3rem",
    alignItems: "center",
  },
  jerseyNum: {
    fontSize: "0.65rem",
    color: "#a6e3a1",
    fontWeight: 700,
  },
  rosterPos: {
    fontSize: "0.65rem",
    color: "#cdd6f4",
  },
};
