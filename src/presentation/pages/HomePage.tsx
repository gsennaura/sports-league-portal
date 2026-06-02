import { Link } from "react-router-dom";
import type { GetUpcomingMatches } from "@application/use_cases/GetUpcomingMatches";
import type { GetRecentMatches } from "@application/use_cases/GetRecentMatches";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import { useUpcomingMatches } from "@presentation/hooks/useUpcomingMatches";
import { useRecentMatches } from "@presentation/hooks/useRecentMatches";
import { useLeagues } from "@presentation/hooks/useLeagues";
import { MatchesByDay } from "@presentation/components/MatchesByDay";
import { PageLoader } from "@presentation/components/PageLoader";
import type { League } from "@domain/entities/League";
import bgSports from "../../images/bg_sports.png";
import minhaLigaLogo from "../../images/minha_liga.png";

const _RAW_BASE = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main";
const NO_LEAGUE_PHOTO = `${_RAW_BASE}/leagues/no_league_photo.png`;

interface HomePageProps {
  getUpcomingMatches: GetUpcomingMatches;
  getRecentMatches: GetRecentMatches;
  listLeagues: ListLeagues;
}



// ─── Ligas ───────────────────────────────────────────────────────────────────

function LeaguesSection({ leagues, loading }: { leagues: League[]; loading: boolean }) {
  if (loading) return <PageLoader />;
  if (leagues.length === 0) return <p style={S.muted}>Nenhuma liga cadastrada.</p>;

  const sorted = [...leagues].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div style={S.leagueGrid}>
      {sorted.map((l) => (
        <Link key={l.id} to={`/ligas/${l.id}`} style={S.leagueCard}>
          <div style={S.leagueCardAccent} />
          <div style={S.leagueCardBody}>
            <div style={S.leagueNameRow}>
              <img
                src={l.logo_url ?? NO_LEAGUE_PHOTO}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_LEAGUE_PHOTO; }}
                alt=""
                style={S.leagueLogo}
              />
              <span style={S.leagueName}>{l.name}</span>
            </div>
            {l.city_name && (
              <span style={S.leagueCity}>
                <span style={S.cityDot}>●</span> {l.city_name}
              </span>
            )}
          </div>
          <span style={S.leagueArrow}>›</span>
        </Link>
      ))}
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export function HomePage({
  getUpcomingMatches,
  getRecentMatches,
  listLeagues,
}: HomePageProps) {
  const upcoming = useUpcomingMatches(getUpcomingMatches, 14);
  const recent = useRecentMatches(getRecentMatches, 7);
  const { leagues, loading: loadingLeagues } = useLeagues(listLeagues);

  return (
    <div style={S.bgWrapper}>
      <div style={S.bgOverlay} />

      {/* ─── Content ──────────────────────────────────────────── */}
      <main style={S.page}>

        {/* ─── Hero ─── */}
        <div style={S.hero}>
          <img src={minhaLigaLogo} alt="Minha Liga" style={S.heroLogo} />
          <p style={S.heroTagline}>Seus campeonatos em um só lugar</p>
          <div style={S.heroRule} />
        </div>

        <section>
          <SectionDivider label="Ligas" cta={{ label: "ver todas →", href: "/ligas" }} />
          <LeaguesSection leagues={leagues} loading={loadingLeagues} />
        </section>

        <section>
          <SectionDivider label="Próximas Partidas" sub="14 dias" accent="#a6e3a1" />
          <MatchesByDay
            matches={upcoming.matches}
            loading={upcoming.loading}
            error={upcoming.error}
            emptyMessage="Nenhuma partida agendada para os próximos 14 dias."
            dateOrder="asc"
            accent="#a6e3a1"
          />
        </section>

        <section>
          <SectionDivider label="Últimas Partidas" sub="7 dias" />
          <MatchesByDay
            matches={recent.matches}
            loading={recent.loading}
            error={recent.error}
            emptyMessage="Nenhuma partida nos últimos 7 dias."
            dateOrder="desc"
          />
        </section>
      </main>
    </div>
  );
}

// ─── Section divider ─────────────────────────────────────────────────────────

function SectionDivider({
  label,
  sub,
  accent = "#89b4fa",
  cta,
}: {
  label: string;
  sub?: string;
  accent?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div style={{ ...S.sectionDivider, borderColor: accent + "55" }}>
      <div style={{ ...S.sectionAccentBar, background: accent }} />
      <span style={{ ...S.sectionLabel, color: "#cdd6f4" }}>{label}</span>
      {sub && <span style={S.sectionSub}>{sub}</span>}
      <div style={S.sectionRule} />
      {cta && (
        <Link to={cta.href} style={{ ...S.sectionCta, color: accent }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  // ─── Background ────────────────────────────────────────────
  bgWrapper: {
    minHeight: "100vh",
    backgroundImage: `url(${bgSports})`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundAttachment: "fixed",
    position: "relative",
  },
  bgOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 17, 27, 0.87)",
    zIndex: 0,
    pointerEvents: "none",
  },
  // ─── Hero ──────────────────────────────────────────────────
  hero: {
    position: "relative",
    zIndex: 1,
    textAlign: "center",
    padding: "3.5rem 1.5rem 2rem",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.9rem",
  },
  heroLogo: {
    height: "clamp(90px, 14vw, 140px)",
    width: "auto",
    objectFit: "contain",
    filter: "drop-shadow(0 4px 28px rgba(137,180,250,0.5))",
  },
  heroTagline: {
    color: "#a6adc8",
    fontSize: "clamp(0.85rem, 2vw, 1rem)",
    fontWeight: 500,
    margin: 0,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    textShadow: "0 1px 6px rgba(0,0,0,0.6)",
  },
  heroRule: {
    width: "clamp(60px, 20vw, 120px)",
    height: "2px",
    background: "linear-gradient(90deg, transparent, #89b4fa, transparent)",
    borderRadius: "1px",
    marginTop: "0.25rem",
  },
  // ─── Page content ──────────────────────────────────────────
  page: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 1.5rem 5rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "3rem",
  },
  muted: { color: "#6c7086", fontSize: "0.9rem", margin: 0 },
  errText: { color: "#f38ba8", fontSize: "0.9rem", margin: 0 },

  // ─── Section divider ───────────────────────────────────────
  sectionDivider: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    marginBottom: "1.25rem",
    borderBottom: "1px solid",
    paddingBottom: "0.6rem",
  },
  sectionAccentBar: {
    flexShrink: 0,
    width: "4px",
    height: "1.1rem",
    borderRadius: "2px",
  },
  sectionLabel: {
    fontSize: "0.78rem",
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    whiteSpace: "nowrap" as const,
  },
  sectionSub: {
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "#6c7086",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap" as const,
  },
  sectionRule: {
    flex: 1,
    height: "1px",
    background: "linear-gradient(90deg, #313244 0%, transparent 100%)",
    borderRadius: "1px",
  },
  sectionCta: {
    fontSize: "0.7rem",
    fontWeight: 700,
    textDecoration: "none",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
  },

  // ─── League grid ───────────────────────────────────────────
  leagueGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "0.75rem",
  },
  leagueCard: {
    display: "flex",
    alignItems: "center",
    gap: "0",
    borderRadius: "12px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #2a2a45",
    textDecoration: "none",
    overflow: "hidden",
    transition: "border-color 0.15s, background 0.15s",
  },
  leagueCardAccent: {
    width: "4px",
    alignSelf: "stretch",
    background: "linear-gradient(180deg, #89b4fa 0%, #cba6f7 100%)",
    flexShrink: 0,
  },
  leagueCardBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
    padding: "0.85rem 0.9rem",
    minWidth: 0,
  },
  leagueNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    minWidth: 0,
  },
  leagueLogo: {
    width: "36px",
    height: "36px",
    objectFit: "contain" as const,
    borderRadius: "6px",
    background: "#1e1e2e",
    flexShrink: 0,
  },
  leagueName: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  leagueCity: {
    fontSize: "0.7rem",
    color: "#6c7086",
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
  },
  cityDot: {
    fontSize: "0.4rem",
    color: "#89b4fa",
  },
  leagueArrow: {
    fontSize: "1.4rem",
    color: "#45475a",
    padding: "0 0.9rem",
    flexShrink: 0,
    lineHeight: 1,
  },
};
