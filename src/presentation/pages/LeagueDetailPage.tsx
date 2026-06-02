import { useEffect, useRef, useState } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link, useParams } from "react-router-dom";
import type { GetLeague } from "@application/use_cases/ListLeagues";
import type { ListChampionships } from "@application/use_cases/ListChampionships";
import type { GetUpcomingMatches } from "@application/use_cases/GetUpcomingMatches";
import type { GetRecentMatches } from "@application/use_cases/GetRecentMatches";
import { useUpcomingMatches } from "@presentation/hooks/useUpcomingMatches";
import { useRecentMatches } from "@presentation/hooks/useRecentMatches";
import { MatchesByDay, SectionHeader } from "@presentation/components/MatchesByDay";
import type { League } from "@domain/entities/League";
import type { Championship } from "@domain/entities/Championship";
import type { LeagueRepository } from "@domain/repositories/LeagueRepository";
import { useAuth } from "@presentation/context/AuthContext";
import { API_BASE } from "@infrastructure/apiBase";

const _RAW_BASE = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main";
const NO_LEAGUE_PHOTO = `${_RAW_BASE}/leagues/no_league_photo.png`;

interface ClubInLeague {
  id: string;
  club_id: string;
  club_name: string | null;
  club_nickname: string | null;
  registered_at: string | null;
  is_active: boolean;
}

interface LeagueDetailPageProps {
  getLeague: GetLeague;
  listChampionships: ListChampionships;
  getUpcomingMatches: GetUpcomingMatches;
  getRecentMatches: GetRecentMatches;
  leagueRepository?: LeagueRepository;
}

// ─── Championship series helpers ───────────────────────────────────────────────

type ChampSeries = {
  key: string;
  displayName: string;
  name: string;
  nickname: string | null;
  level: string | null;
  division: string | null;
  editions: Championship[]; // sorted year desc
};

const levelDefs: Record<string, { label: string; color: string; bg: string; border: string }> = {
  amador:       { label: "Amador",       color: "#a6e3a1", bg: "#1a2e1f", border: "#2a4a2f" },
  universitario:{ label: "Universitário",color: "#89b4fa", bg: "#1a1f3a", border: "#2a3a6a" },
  profissional: { label: "Profissional", color: "#f9e2af", bg: "#2e2a1a", border: "#4a3a2a" },
};

function buildSeries(championships: Championship[]): ChampSeries[] {
  const map = new Map<string, Championship[]>();
  for (const c of championships) {
    const key = `${c.name}||${c.division ?? ""}||${c.level ?? ""}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return [...map.values()]
    .map((editions) => {
      const sorted = [...editions].sort((a, b) => b.year - a.year);
      const latest = sorted[0];
      return {
        key: `${latest.name}||${latest.division ?? ""}||${latest.level ?? ""}`,
        displayName: latest.nickname ?? latest.name,
        name: latest.name,
        nickname: latest.nickname,
        level: latest.level,
        division: latest.division,
        editions: sorted,
      };
    })
    .sort((a, b) => b.editions[0].year - a.editions[0].year);
}

function SeriesCard({ series }: { series: ChampSeries }) {
  const latest = series.editions[0];
  const yearsAsc = [...series.editions].reverse().map((e) => e.year);
  const levelDef = levelDefs[series.level ?? ""];
  const lastChamp = latest.champion_team_name;
  const lastVice = latest.runner_up_team_name;

  return (
    <Link to={`/campeonatos/${latest.id}`} style={cardStyles.card}>
      {/* Top row: badges + edition count */}
      <div style={cardStyles.topRow}>
        <div style={cardStyles.badges}>
          {levelDef && (
            <span style={{ ...cardStyles.badge, color: levelDef.color, backgroundColor: levelDef.bg, border: `1px solid ${levelDef.border}` }}>
              {levelDef.label}
            </span>
          )}
          {series.division && (
            <span style={{ ...cardStyles.badge, color: "#cba6f7", backgroundColor: "#201a2a", border: "1px solid #4a2a6a" }}>
              {series.division}
            </span>
          )}
        </div>
        <span style={cardStyles.editionCount}>
          {series.editions.length} {series.editions.length === 1 ? "edição" : "edições"}
        </span>
      </div>

      {/* Title */}
      <h3 style={cardStyles.title}>{series.displayName}</h3>
      {series.nickname && (
        <p style={cardStyles.subtitle}>{series.name}</p>
      )}

      {/* Year pills */}
      <div style={cardStyles.years}>
        {yearsAsc.slice(-6).map((y) => (
          <span key={y} style={cardStyles.yearPill}>{y}</span>
        ))}
        {yearsAsc.length > 6 && (
          <span style={cardStyles.yearMore}>+{yearsAsc.length - 6}</span>
        )}
      </div>

      {/* Last champion / vice */}
      {(lastChamp || lastVice) && (
        <div style={cardStyles.podiumBox}>
          {lastChamp && (
            <div style={cardStyles.podiumRow}>
              <span style={cardStyles.podiumGold}>🏆</span>
              <span style={cardStyles.podiumName}>{lastChamp}</span>
              <span style={cardStyles.podiumYear}>{latest.year}</span>
            </div>
          )}
          {lastVice && (
            <div style={cardStyles.podiumRow}>
              <span style={cardStyles.podiumSilver}>🥈</span>
              <span style={{ ...cardStyles.podiumName, color: "#cdd6f4", opacity: 0.75 }}>{lastVice}</span>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div style={cardStyles.cta}>
        <span style={cardStyles.ctaText}>Ver campeonato</span>
        <span style={cardStyles.ctaArrow}>›</span>
      </div>
    </Link>
  );
}

export function LeagueDetailPage({ getLeague, listChampionships, getUpcomingMatches, getRecentMatches, leagueRepository }: LeagueDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [clubs, setClubs] = useState<ClubInLeague[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const allUpcoming = useUpcomingMatches(getUpcomingMatches, 30);
  const allRecent = useRecentMatches(getRecentMatches, 14);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setClubsLoading(true);
    Promise.all([
      getLeague.execute(id),
      listChampionships.execute(),
      fetch(`${API_BASE}/leagues/${id}/clubs`).then((r) => r.json() as Promise<ClubInLeague[]>),
    ])
      .then(([lg, champs, clbs]) => {
        setLeague(lg);
        setCurrentLogoUrl(lg.logo_url);
        setChampionships(champs.filter((c) => c.league_id === id));
        setClubs(Array.isArray(clbs) ? clbs : []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      })
      .finally(() => { setLoading(false); setClubsLoading(false); });
  }, [id]);

  const series = buildSeries(championships);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || !leagueRepository) return;
    setLogoUploading(true);
    try {
      const result = await leagueRepository.uploadPhoto(id, file);
      setCurrentLogoUrl(result.logo_url);
    } catch (err) {
      console.error(err);
    } finally {
      setLogoUploading(false);
    }
  }

  // Filter matches to only this league's championships
  const leagueChampIds = new Set(championships.map((c) => c.id));
  const upcomingFiltered = allUpcoming.matches.filter((m) => leagueChampIds.has(m.championship_id));
  const recentFiltered = allRecent.matches.filter((m) => leagueChampIds.has(m.championship_id));

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <header style={styles.hero}>
        <div style={styles.heroAccentBar} />
        <div style={styles.heroInner}>
          <Link to="/ligas" style={styles.heroBack}>← Ligas</Link>
          {loading && !league && <PageLoader />}
          {league && (
            <>
              <div style={styles.heroMain}>
                {/* League photo */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={currentLogoUrl ?? NO_LEAGUE_PHOTO}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_LEAGUE_PHOTO; }}
                    alt={`Logo ${league.name}`}
                    style={{ width: 108, height: 108, objectFit: "contain", borderRadius: 12, background: "#1e1e2e" }}
                  />
                  {isAdmin && leagueRepository && (
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
                        title="Alterar foto da liga"
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          right: "4px",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: logoUploading ? "#45475a" : "#cba6f7",
                          border: "2px solid #1e1e2e",
                          cursor: logoUploading ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.68rem",
                          padding: 0,
                        }}
                      >
                        ✏️
                      </button>
                    </>
                  )}
                </div>
                {/* Text column */}
                <div style={styles.heroTextCol}>
                  <h1 style={styles.heroTitle}>{league.name}</h1>
                  {(league.short_name || league.is_federated) && (
                    <div style={styles.heroBadgesRow}>
                      {league.short_name && (
                        <span style={styles.heroShortName}>{league.short_name}</span>
                      )}
                      {league.is_federated && (
                        <span style={styles.heroFedBadge}>Federada</span>
                      )}
                    </div>
                  )}
                  {(league.city_name || league.founded_year) && (
                    <p style={styles.heroSub}>
                      {[
                        league.city_name && `📍 ${league.city_name}`,
                        league.founded_year && `🗓 Fundada em ${league.founded_year}`,
                      ].filter(Boolean).join("  ·  ")}
                    </p>
                  )}
                  {(league.president || league.website) && (
                    <div style={styles.heroMeta}>
                      {league.president && (
                        <span style={styles.heroMetaItem}>👤 {league.president}</span>
                      )}
                      {league.website && (
                        <a href={league.website} target="_blank" rel="noopener noreferrer" style={styles.heroMetaLink}>
                          🌐 Site oficial
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ─── Content ──────────────────────────────────────────── */}
      <main style={styles.page}>
        {error && <p style={styles.error}>{error}</p>}

        {league && (
          <>
            {/* Campeonatos */}
            <section style={styles.section}>
              <div style={styles.champsHeader}>
                <span style={styles.champsTitle}>Campeonatos</span>
              </div>
              {championships.length === 0 && !loading ? (
                <p style={styles.status}>Nenhum campeonato cadastrado para esta liga.</p>
              ) : (
                <div style={styles.seriesGrid}>
                  {series.map((s) => (
                    <SeriesCard key={s.key} series={s} />
                  ))}
                </div>
              )}
            </section>

            {/* Últimas Partidas */}
            <section style={styles.section}>
              <SectionHeader title="Últimas Partidas" subtitle="14 dias" />
              <MatchesByDay
                matches={recentFiltered}
                loading={allRecent.loading || loading}
                error={allRecent.error}
                emptyMessage="Nenhuma partida nos últimos 14 dias para esta liga."
                dateOrder="desc"
              />
            </section>

            {/* Clubes Filiados */}
            <section style={styles.section}>
              <div style={styles.champsHeader}>
                <span style={styles.champsTitle}>Clubes Filiados</span>
                <span style={{ fontSize: "0.8rem", color: "#6c7086" }}>
                  {clubs.filter((c) => c.is_active).length} ativo{clubs.filter((c) => c.is_active).length !== 1 ? "s" : ""}
                </span>
              </div>
              {clubsLoading && <p style={styles.status}>Carregando clubes…</p>}
              {!clubsLoading && clubs.length === 0 && (
                <p style={styles.status}>Nenhum clube filiado a esta liga.</p>
              )}
              {clubs.length > 0 && (
                <div style={styles.clubsList}>
                  {clubs.map((c) => (
                    <div key={c.id} style={{ ...styles.clubRow, opacity: c.is_active ? 1 : 0.45 }}>
                      <div style={styles.clubInfo}>
                        {c.club_nickname && (
                          <span style={styles.clubNickname}>{c.club_nickname}</span>
                        )}
                        <span style={styles.clubName}>{c.club_name ?? c.club_id}</span>
                      </div>
                      {!c.is_active && (
                        <span style={styles.clubInactive}>Inativo</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Próximas Partidas */}
            <section style={styles.section}>
              <SectionHeader title="Próximas Partidas" subtitle="30 dias" />
              <MatchesByDay
                matches={upcomingFiltered}
                loading={allUpcoming.loading || loading}
                error={allUpcoming.error}
                emptyMessage="Nenhuma partida agendada nos próximos 30 dias para esta liga."
                dateOrder="asc"
              />
            </section>
          </>
        )}
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // ─── Hero ──────────────────────────────────────────────────
  hero: {
    background: "linear-gradient(160deg, #1e1e2e 0%, #181825 60%, #11111b 100%)",
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
    gap: "0.5rem",
  },
  heroBack: {
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.85rem",
    marginBottom: "0.5rem",
    alignSelf: "flex-start" as const,
  },
  heroTopRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  heroMain: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    flexWrap: "wrap" as const,
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
  },
  heroBadgesRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    flexWrap: "wrap" as const,
  },
  heroShortName: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#89b4fa",
    backgroundColor: "#1a1f3a",
    border: "1px solid #2a3a6a",
    borderRadius: "4px",
    padding: "0.1rem 0.45rem",
    letterSpacing: "0.04em",
  },
  heroFedBadge: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#a6e3a1",
    backgroundColor: "#1a2e1f",
    border: "1px solid #2a4a2f",
    borderRadius: "4px",
    padding: "0.1rem 0.45rem",
    letterSpacing: "0.04em",
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
    fontWeight: 800,
    color: "#cdd6f4",
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
  },
  heroSub: {
    margin: 0,
    marginTop: "0.15rem",
    fontSize: "1rem",
    color: "#cdd6f4",
    lineHeight: 1.6,
  },
  heroMeta: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem 1.25rem",
    marginTop: "0.25rem",
  },
  heroMetaItem: {
    fontSize: "0.85rem",
    color: "#cdd6f4",
  },
  heroMetaLink: {
    fontSize: "0.85rem",
    color: "#89b4fa",
    textDecoration: "none",
  },

  // ─── Campeonatos header ────────────────────────────────────
  champsHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "1.25rem",
    borderBottom: "2px solid #89b4fa",
    paddingBottom: "0.5rem",
  },
  champsTitle: {
    fontSize: "1.15rem",
    fontWeight: 800,
    color: "#cdd6f4",
    letterSpacing: "0.01em",
    textTransform: "uppercase" as const,
  },

  // ─── Series grid ────────────────────────────────────────────
  seriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1rem",
  },

  // ─── Page content ──────────────────────────────────────────
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
  },
  section: {
    marginBottom: "2.5rem",
  },
  status: { color: "#cdd6f4" },
  error: { color: "#f38ba8" },
  clubsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
  },
  clubRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.55rem 0.85rem",
    backgroundColor: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: "8px",
  },
  clubInfo: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.6rem",
  },
  clubNickname: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#89b4fa",
    backgroundColor: "#1a1f3a",
    border: "1px solid #2a3a6a",
    borderRadius: "4px",
    padding: "0.1rem 0.45rem",
    letterSpacing: "0.04em",
  },
  clubName: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#cdd6f4",
  },
  clubInactive: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#f38ba8",
    backgroundColor: "#2e1a1a",
    border: "1px solid #4a2a2a",
    borderRadius: "4px",
    padding: "0.1rem 0.45rem",
    letterSpacing: "0.04em",
  },
};

// ─── Series card styles ────────────────────────────────────────────────────────
const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    padding: "1.1rem 1.2rem 0.9rem",
    backgroundColor: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: "14px",
    textDecoration: "none",
    color: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
    cursor: "pointer",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  badges: {
    display: "flex",
    gap: "0.35rem",
    flexWrap: "wrap" as const,
  },
  badge: {
    fontSize: "0.62rem",
    fontWeight: 700,
    borderRadius: "4px",
    padding: "0.15rem 0.5rem",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
  },
  editionCount: {
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "#6c7086",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: 800,
    color: "#cdd6f4",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#6c7086",
  },
  years: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.3rem",
  },
  yearPill: {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#89b4fa",
    backgroundColor: "#1a1f3a",
    border: "1px solid #2a3a6a",
    borderRadius: "20px",
    padding: "0.15rem 0.55rem",
    letterSpacing: "0.02em",
  },
  yearMore: {
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "#6c7086",
    padding: "0.15rem 0.3rem",
    alignSelf: "center",
  },
  podiumBox: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    backgroundColor: "#181825",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "0.5rem 0.75rem",
  },
  podiumRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  podiumGold: {
    fontSize: "0.9rem",
    flexShrink: 0,
  },
  podiumSilver: {
    fontSize: "0.9rem",
    flexShrink: 0,
  },
  podiumName: {
    flex: 1,
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#f9e2af",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  podiumYear: {
    fontSize: "0.65rem",
    color: "#6c7086",
    flexShrink: 0,
  },
  cta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "0.25rem",
    marginTop: "0.2rem",
  },
  ctaText: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#89b4fa",
    letterSpacing: "0.02em",
  },
  ctaArrow: {
    fontSize: "1rem",
    color: "#89b4fa",
    lineHeight: 1,
  },
};
