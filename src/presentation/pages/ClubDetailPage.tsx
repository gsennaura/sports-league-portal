import React, { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { toSlugPath } from "@utils/slug";
import type { GetClub } from "@application/use_cases/GetClub";
import type { GetClubMatches } from "@application/use_cases/GetClubMatches";
import type { GetClubTitles } from "@application/use_cases/GetClubTitles";
import { PageLoader } from "@presentation/components/PageLoader";
import type { GetClubTeams } from "@application/use_cases/GetClubTeams";
import type { Club } from "@domain/entities/Club";
import type { Team } from "@domain/entities/Team";
import type { ClubMatch } from "@domain/entities/ClubMatch";
import type { ClubTitle } from "@domain/entities/ClubTitle";
import type { ClubRepository } from "@domain/repositories/ClubRepository";
import { useAuth } from "@presentation/context/AuthContext";

interface ClubDetailPageProps {
  getClub: GetClub;
  getClubMatches: GetClubMatches;
  getClubTitles: GetClubTitles;
  getClubTeams: GetClubTeams;
  clubRepository?: ClubRepository;
}

const categoryLabel: Record<string, string> = {
  amador: "Amador",
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

// ─── Match status helpers ───────────────────────────────────────────────────

function getMatchStatus(match: ClubMatch, teamIds: Set<string>): "V" | "D" | "E" | "A" {
  if (match.home_score === null || match.away_score === null) return "A";
  const isHome = teamIds.has(match.home_team_id);
  const hs = match.home_score;
  const as_ = match.away_score;
  if (hs === as_) return "E";
  if (isHome ? hs > as_ : as_ > hs) return "V";
  return "D";
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  V: { bg: "#1a3a1a", color: "#a6e3a1", border: "#2d5a2d" },
  D: { bg: "#3a1a1a", color: "#f38ba8", border: "#5a2d2d" },
  E: { bg: "#3a3a1a", color: "#f9e2af", border: "#5a5a2d" },
  A: { bg: "#18265b", color: "#45475a", border: "#313244" },
};

function StatusBadge({ status }: { status: "V" | "D" | "E" | "A" }) {
  const s = STATUS_STYLES[status];
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 22, height: 22, borderRadius: 4, flexShrink: 0,
      border: `1px solid ${s.border}`,
      backgroundColor: s.bg, color: s.color,
      fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.02em",
    }}>
      {status}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NO_SHIELD = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/clubs/no_club_shield.png";

function Shield({ url }: { url: string | null }) {
  return (
    <img
      src={url ?? NO_SHIELD}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_SHIELD; }}
      style={{ width: 18, height: 18, objectFit: "contain", flexShrink: 0 }}
      alt=""
    />
  );
}

// ─── Match card (slim) ───────────────────────────────────────────────────────

function MatchRow({ match, teamIds }: { match: ClubMatch; teamIds: Set<string> }) {
  const hasScore = match.home_score !== null && match.away_score !== null;
  const hasPenalty = hasScore && match.home_penalty_score !== null && match.away_penalty_score !== null;
  const status = getMatchStatus(match, teamIds);

  const datePart = match.match_date?.split("T")[0] ?? null;
  const dateLabel = datePart
    ? new Date(`${datePart}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;
  const timeLabel = (() => {
    const timePart = match.match_date?.includes("T") ? match.match_date.split("T")[1] : null;
    if (!timePart) return null;
    const [h, min] = timePart.split(":");
    return `${h}h${min}`;
  })();

  return (
    <Link to={`/partidas/${match.match_id}`} className="row-link">
      <div className="card">
        <div className="match-team-row">
          {/* Col 1 — status badge */}
          <div >
            <StatusBadge status={status} />
          </div>

          {/* Col 2 — data e hora */}
          <div >
            {dateLabel && <span className="muted">{dateLabel}</span>}
            {timeLabel && <span className="muted">{timeLabel}</span>}
          </div>

          {/* Col 3 — times + placar */}
          <div >
            <div className="match-team-row">
              <span className="score-slot">
                {hasScore ? `${match.home_score}${hasPenalty ? ` (${match.home_penalty_score})` : ""}` : ""}
              </span>
              <Shield url={match.home_club_logo_url} />
              <span className="team-name">{match.home_team_name}</span>
            </div>
            <div className="match-team-row">
              <span className="score-slot">
                {hasScore ? `${match.away_score}${hasPenalty ? ` (${match.away_penalty_score})` : ""}` : ""}
              </span>
              <Shield url={match.away_club_logo_url} />
              <span className="team-name">{match.away_team_name}</span>
            </div>
          </div>

          {/* Col 4 — estádio */}
          {match.venue_name && (
            <div >
              <span className="muted">{match.venue_name}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ClubDetailPage({ getClub, getClubMatches, getClubTitles, getClubTeams, clubRepository }: ClubDetailPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const id = slug?.slice(-36) ?? "";
  const { isAdmin } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<ClubMatch[]>([]);
  const [titles, setTitles] = useState<ClubTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [titlesLoaded, setTitlesLoaded] = useState(false);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"times" | "titulos" | "partidas">("times");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setMatchesLoaded(false);
    setTitlesLoaded(false);
    setActiveTab("times");
    Promise.all([
      getClub.execute(id),
      getClubTeams.execute(id),
    ]).then(([clubData, clubTeams]) => {
      setClub(clubData);
      setTeams(clubTeams);
      setLoading(false);
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setLoading(false);
    });
  }, [id, getClub, getClubTeams]);

  const handleLoadMatches = async () => {
    if (matchesLoaded || matchesLoading) return;
    setMatchesLoading(true);
    try {
      const clubMatches = await getClubMatches.execute(id);
      const sorted = [...clubMatches].sort((a, b) => {
        if (!a.match_date) return 1;
        if (!b.match_date) return -1;
        return b.match_date.localeCompare(a.match_date);
      });
      setMatches(sorted.slice(0, 15));
      setMatchesLoaded(true);
    } finally { setMatchesLoading(false); }
  };

  const handleLoadTitles = async () => {
    if (titlesLoaded || titlesLoading) return;
    setTitlesLoading(true);
    try {
      const clubTitles = await getClubTitles.execute(id);
      setTitles(clubTitles);
      setTitlesLoaded(true);
    } finally { setTitlesLoading(false); }
  };

  const handleTabChange = (tab: "times" | "titulos" | "partidas") => {
    setActiveTab(tab);
    if (tab === "titulos") handleLoadTitles();
    if (tab === "partidas") handleLoadMatches();
  };

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || !clubRepository) return;
    setLogoUploading(true);
    try {
      const result = await clubRepository.uploadLogo(id, file);
      setCurrentLogoUrl(result.logo_url);
    } catch { /* ignore */ }
    finally { setLogoUploading(false); }
  }

  const teamIds = new Set(teams.map((t) => t.id));

  // Group matches by category (sport category of the club's team in each match)
  const byCategoryMap = new Map<string, ClubMatch[]>();
  for (const m of matches) {
    const isHome = teamIds.has(m.home_team_id);
    const category = (isHome ? m.home_team_category : m.away_team_category) ?? "sem-categoria";
    if (!byCategoryMap.has(category)) byCategoryMap.set(category, []);
    byCategoryMap.get(category)!.push(m);
  }
  const categoryGroups = [...byCategoryMap.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));

  return (
    <>
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <header className="hero">
        <div className="hero__bar" />
        <div className="hero__inner">
          <Link to="/clubes" className="back-link">← Clubes</Link>
          {loading && !club && <PageLoader />}
          {club && (
            <>
              <div className="hero__row">
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={currentLogoUrl ?? club.logo_url ?? NO_SHIELD}
                    alt={`Escudo ${club.nickname ?? club.name}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_SHIELD; }}
                    
                  />
                  {isAdmin && clubRepository && (
                    <>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: "none" }}
                        onChange={handleLogoChange}
                      />
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        title="Alterar escudo do clube"
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          right: "4px",
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          backgroundColor: logoUploading ? "#45475a" : "#cba6f7",
                          border: "2px solid #18265b",
                          cursor: logoUploading ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.72rem",
                          lineHeight: 1,
                          padding: 0,
                        }}
                      >
                        {logoUploading ? "…" : "✏"}
                      </button>
                    </>
                  )}
                </div>
                <div>
                  <h1 className="hero__title">{club.name}</h1>
                  {(club.nickname || club.acronym) && (
                    <p className="muted">
                      {club.nickname && <span>{club.nickname}</span>}
                      {club.acronym && <span className="badge">{club.acronym}</span>}
                    </p>
                  )}
                </div>
              </div>
              <p className="hero__sub">
                {[
                  club.city_name && `📍 ${club.city_name}`,
                  club.founded_at && `🗓 Fundado em ${club.founded_at.slice(0, 4)}`,
                  club.venue_name && `🏟 ${club.venue_name}`,
                ].filter(Boolean).join("  ·  ")}
              </p>
              {club.president && (
                <p className="muted">👤 {club.president}</p>
              )}
              {club.linked_institution && (
                <p className="muted">🎓 {club.linked_institution}</p>
              )}
            </>
          )}
        </div>
      </header>

      {/* ─── Content ───────────────────────────────────────────── */}
      <main className="page-container">
        {error && <p className="error-text">{error}</p>}

        {!loading && club && (
          <div>
            {/* ─── Tab bar ─────────────────────────────────────── */}
            <nav className="tab-bar">
              <button
                style={activeTab === "times" ? S.tabActive : S.tab}
                onClick={() => handleTabChange("times")}
              >
                Times
                {teams.length > 0 && <span className="badge">{teams.length}</span>}
              </button>
              <button
                style={activeTab === "titulos" ? S.tabActive : S.tab}
                onClick={() => handleTabChange("titulos")}
              >
                Títulos
                {titlesLoaded && titles.length > 0 && (
                  <span className="badge">{titles.length}</span>
                )}
              </button>
              <button
                style={activeTab === "partidas" ? S.tabActive : S.tab}
                onClick={() => handleTabChange("partidas")}
              >
                Últimas Partidas
                {matchesLoaded && matches.length > 0 && (
                  <span className="badge">{matches.length}</span>
                )}
              </button>
            </nav>

            {/* ─── Tab: Times ──────────────────────────────────── */}
            {activeTab === "times" && (
              <div>
                {teams.length === 0 ? (
                  <p className="muted">Nenhum time cadastrado.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {teams.map((t) => {
                      const sport = t.sport_name ?? "Esporte";
                      const cat = t.category ? (categoryLabel[t.category] ?? t.category) : null;
                      return (
                        <Link key={t.id} to={`/times/${toSlugPath(t.name, t.id)}`} style={S.teamCard}>
                          <div style={S.teamCardLogo}>
                            <img
                              src={currentLogoUrl ?? club?.logo_url ?? NO_SHIELD}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_SHIELD; }}
                              style={{ width: 40, height: 40, objectFit: "contain" as const }}
                              alt=""
                            />
                          </div>
                          <div style={S.teamCardBody}>
                            <span style={S.teamCardName}>{t.name}</span>
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" as const, marginTop: "0.2rem" }}>
                              <span className="badge">{sport}</span>
                              {cat && <span className="badge badge-info">{cat}</span>}
                            </div>
                          </div>
                          <span style={S.teamCardArrow}>›</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── Tab: Títulos ────────────────────────────────── */}
            {activeTab === "titulos" && (
              <div>
                {!titlesLoaded ? (
                  <PageLoader />
                ) : titles.length === 0 ? (
                  <p className="muted">Nenhum título registrado.</p>
                ) : (
                  <div className="data-table">
                    {titles.map((t) => (
                      <div key={t.edition_id} className="match-team-row">
                        <span className="muted">{t.year}</span>
                        <span style={t.result === "champion" ? S.titleMedalChamp : S.titleMedalVice}>
                          {t.result === "champion" ? "🏆" : "🥈"}
                        </span>
                        <div className="muted">
                          <span className="team-name">
                            {t.championship_nickname ?? t.championship_name}
                          </span>
                          {t.team_category && (
                            <span className="muted">
                              {categoryLabel[t.team_category] ?? t.team_category}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Tab: Últimas Partidas ───────────────────────── */}
            {activeTab === "partidas" && (
              <div>
                {!matchesLoaded ? (
                  <PageLoader />
                ) : matches.length === 0 ? (
                  <p className="muted">Nenhuma partida encontrada.</p>
                ) : categoryGroups.length === 0 ? (
                  <div className="page-section">
                    {matches.map((m) => <MatchRow key={m.match_id} match={m} teamIds={teamIds} />)}
                  </div>
                ) : (
                  categoryGroups.map(([catKey, catMatches]) => {
                    const catLabel = catKey === "sem-categoria"
                      ? "Sem categoria"
                      : (categoryLabel[catKey] ?? catKey);
                    return (
                      <div key={catKey} className="page-section">
                        <div className="toolbar">
                          <span className="row-link">{catLabel}</span>
                        </div>
                        {catMatches.map((m) => <MatchRow key={m.match_id} match={m} teamIds={teamIds} />)}
                      </div>
                    );
                  })
                )}
                {matchesLoaded && matches.length > 0 && (
                  <p style={{ fontSize: "0.72rem", color: "#ffffff", marginTop: "0.5rem", textAlign: "right" as const }}>
                    <span style={{ fontWeight: 600, color: "var(--c-positive)" }}>V</span>
                    {" / "}
                    <span style={{ fontWeight: 600, color: "var(--c-negative)" }}>D</span>
                    {" / "}
                    <span style={{ fontWeight: 600, color: "var(--c-warning)" }}>E</span>
                    {" / "}
                    <span style={{ color: "#45475a" }}>A</span>
                    {" · por categoria"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  // Hero
  hero: {
    background: "linear-gradient(160deg, #18265b 0%, #18265b 60%, #11111b 100%)",
    borderBottom: "1px solid #313244",
    paddingBottom: "2.5rem",
    overflow: "hidden",
  },
  heroAccentBar: {
    height: "4px",
    background: "linear-gradient(90deg, #89b4fa 0%, #cba6f7 50%, #a6e3a1 100%)",
  },
  heroInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2rem 2rem 0",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
  },
  heroBack: {
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.85rem",
    marginBottom: "0.4rem",
    alignSelf: "flex-start" as const,
  },
  heroTopRow: {
    display: "flex",
    alignItems: "center",
    gap: "1.2rem",
  },
  heroShield: {
    width: 72,
    height: 72,
    objectFit: "contain" as const,
    flexShrink: 0,
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
    fontWeight: 800,
    color: "#cdd6f4",
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
  },
  heroNickname: {
    margin: "0.3rem 0 0",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
    fontSize: "0.95rem",
    color: "#cdd6f4",
  },
  heroBadge: {
    backgroundColor: "#313244",
    borderRadius: "4px",
    color: "#89b4fa",
    fontSize: "0.78rem",
    fontWeight: 700,
    padding: "0.15rem 0.5rem",
    letterSpacing: "0.03em",
  },
  heroSub: {
    margin: 0,
    fontSize: "1rem",
    color: "#cdd6f4",
    lineHeight: 1.6,
  },
  heroMeta: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#cdd6f4",
  },

  // Page
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "2.5rem",
  },
  section: {},
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "0.75rem",
    paddingBottom: "0.4rem",
    borderBottom: "1px solid #313244",
  },
  sectionTitle: {
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "#cdd6f4",
  },
  sectionSub: {
    fontSize: "0.65rem",
    color: "#cdd6f4",
  },

  // Teams grid
  teamsGrid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  teamCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    backgroundColor: "var(--c-brand)",
    border: "1px solid var(--c-border)",
    borderRadius: "8px",
    padding: "0.65rem 0.85rem",
    textDecoration: "none",
    transition: "border-color 0.15s",
  },
  teamCardLogo: {
    width: 52,
    height: 52,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--c-border)",
    padding: "4px",
    overflow: "hidden" as const,
  },
  teamCardBody: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
  },
  teamCardName: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--c-text)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  teamCardArrow: {
    fontSize: "1.4rem",
    color: "var(--c-text-muted)",
    flexShrink: 0,
  },
  teamCardSport: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#cdd6f4",
  },
  teamCardCat: {
    fontSize: "0.72rem",
    color: "#89b4fa",
    fontWeight: 500,
  },

  // Match groups
  champBlock: {
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
  },
  champHeader: {
    paddingBottom: "0.3rem",
    marginBottom: "0.15rem",
    borderBottom: "1px solid #313244",
  },
  champTeamLink: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#cba6f7",
    textDecoration: "none",
    letterSpacing: "0.01em",
  },

  // Match row
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
    gridTemplateColumns: "1.8rem 3rem 1fr auto",
    alignItems: "center",
    gap: "0.75rem",
  },
  mStatusCol: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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

  // Teams concept banner
  teamsConceptBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    backgroundColor: "#1a1a2e",
    border: "1px solid #313244",
    borderLeft: "4px solid #cba6f7",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    marginBottom: "1rem",
  },
  teamsConceptIcon: {
    fontSize: "1.8rem",
    lineHeight: 1,
    flexShrink: 0,
    marginTop: "0.1rem",
  },
  teamsConceptTitle: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#cba6f7",
    marginBottom: "0.35rem",
    letterSpacing: "0.01em",
  },
  teamsConceptText: {
    fontSize: "0.85rem",
    color: "#ffffff",
    lineHeight: 1.6,
  },

  error: { color: "#f38ba8" },
  empty: { color: "#cdd6f4", fontSize: "0.9rem" },

  // Tabs
  tabBar: {
    display: "flex",
    borderBottom: "2px solid #313244",
    gap: 0,
    marginBottom: "2rem",
  },
  tab: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "0.65rem 1.25rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    marginBottom: "-2px",
    letterSpacing: "0.01em",
  },
  tabActive: {
    background: "none",
    border: "none",
    borderBottom: "2px solid #89b4fa",
    padding: "0.65rem 1.25rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#cdd6f4",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    marginBottom: "-2px",
    letterSpacing: "0.01em",
  },
  tabBadge: {
    backgroundColor: "#313244",
    borderRadius: "10px",
    color: "#89b4fa",
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.1rem 0.45rem",
    lineHeight: 1.4,
  },

  // Titles table
  titlesTable: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0",
  },
  titleRow: {
    display: "grid",
    gridTemplateColumns: "3rem 1.8rem 1fr",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.45rem 0",
    borderBottom: "1px solid #18265b",
  },
  titleYear: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textAlign: "center" as const,
  },
  titleMedalChamp: {
    fontSize: "1.1rem",
    textAlign: "center" as const,
  },
  titleMedalVice: {
    fontSize: "1.1rem",
    textAlign: "center" as const,
    opacity: 0.7,
  },
  titleInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
    minWidth: 0,
  },
  titleChamp: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#cdd6f4",
  },
  titleCat: {
    fontSize: "0.72rem",
    color: "#89b4fa",
    fontWeight: 500,
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "4px",
    padding: "0.1rem 0.4rem",
  },
};
