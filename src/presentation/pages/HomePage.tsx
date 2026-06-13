import React from "react";
import { Link } from "react-router-dom";
import type { GetUpcomingMatches } from "@application/use_cases/GetUpcomingMatches";
import type { GetRecentMatches } from "@application/use_cases/GetRecentMatches";
import type { ListChampionships } from "@application/use_cases/ListChampionships";
import type { ListPartners } from "@application/use_cases/ListPartners";
import type { ListNews } from "@application/use_cases/ListNews";
import { useUpcomingMatches } from "@presentation/hooks/useUpcomingMatches";
import { useRecentMatches } from "@presentation/hooks/useRecentMatches";
import { useChampionships } from "@presentation/hooks/useChampionships";
import { usePartners } from "@presentation/hooks/usePartners";
import { useNews } from "@presentation/hooks/useNews";
import { MatchesByDay } from "@presentation/components/MatchesByDay";
import { PageLoader } from "@presentation/components/PageLoader";
import { NewsCarousel } from "@presentation/components/NewsCarousel";
import type { Championship } from "@domain/entities/Championship";
import type { Partner } from "@domain/entities/Partner";
import { LEAGUE_ID } from "../../config";

interface HomePageProps {
  getUpcomingMatches: GetUpcomingMatches;
  getRecentMatches: GetRecentMatches;
  listChampionships: ListChampionships;
  listPartners: ListPartners;
  listNews: ListNews;
}

// ─── Championships ────────────────────────────────────────────────────────────

function ChampionshipsSection({
  championships, loading, error,
}: {
  championships: Championship[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <PageLoader />;
  if (error) return <p style={S.errText}>{error}</p>;
  const filtered = championships.filter((c) => !LEAGUE_ID || c.league_id === LEAGUE_ID);
  if (filtered.length === 0) return <p style={S.muted}>Nenhum campeonato encontrado.</p>;
  return (
    <div style={S.champGrid}>
      {filtered.map((c) => (
        <Link key={c.id} to={`/campeonatos/${c.id}`} style={S.champCard}>
          <div style={S.champCardAccent} />
          <div style={S.champBody}>
            <span style={S.champName}>{c.name}</span>
            <span style={S.champMeta}>{c.year} · {c.city_name}</span>
            {c.champion_team_name && (
              <span style={S.champChampion}>🏆 {c.champion_team_name}</span>
            )}
          </div>
          <span style={S.champArrow}>›</span>
        </Link>
      ))}
    </div>
  );
}

// ─── Partners ─────────────────────────────────────────────────────────────────

function PartnersSection({ partners, loading }: { partners: Partner[]; loading: boolean }) {
  if (loading) return null;
  const active = [...partners].filter((p) => p.is_active).sort((a, b) => a.priority - b.priority);
  if (active.length === 0) return null;
  return (
    <div style={S.apoioGrid}>
      {active.map((p) => {
        const inner = (
          <>
            {p.logo_url && <img src={p.logo_url} alt={p.name} style={S.apoioLogo} />}
            <span style={S.apoioName}>{p.name}</span>
          </>
        );
        return p.external_url
          ? <a key={p.id} href={p.external_url} target="_blank" rel="noopener noreferrer" style={S.apoioCard}>{inner}</a>
          : <div key={p.id} style={S.apoioCard}>{inner}</div>;
      })}
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export function HomePage({
  getUpcomingMatches,
  getRecentMatches,
  listChampionships,
  listPartners,
  listNews,
}: HomePageProps) {
  const upcoming = useUpcomingMatches(getUpcomingMatches, 14);
  const recent = useRecentMatches(getRecentMatches, 7);
  const { championships, loading: loadingChamp, error: errorChamp } = useChampionships(listChampionships);
  const { partners, loading: loadingPartners } = usePartners(listPartners, LEAGUE_ID || undefined);
  const { news } = useNews(listNews, LEAGUE_ID || undefined, 8);

  return (
    <main style={S.page}>

        {news.length > 0 && <NewsCarousel items={news} />}

        <section>
          <SectionDivider label="Campeonatos" accent="#cba6f7" cta={{ label: "ver todos →", href: "/campeonatos" }} />
          <ChampionshipsSection championships={championships} loading={loadingChamp} error={errorChamp} />
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

        {partners.length > 0 && (
          <section>
            <SectionDivider label="Parceiros & Apoiadores" accent="#f9e2af" />
            <PartnersSection partners={partners} loading={loadingPartners} />
          </section>
        )}

      </main>
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
      <span style={{ ...S.sectionLabel, color: "#18265b" }}>{label}</span>
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
  // ─── Page content ──────────────────────────────────────────
  page: {
    padding: "0 2rem 3rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.5rem",
  },
  muted: { color: "#6b7280", fontSize: "0.9rem", margin: 0 },
  errText: { color: "#dc2626", fontSize: "0.9rem", margin: 0 },

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
    color: "#6b7280",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap" as const,
  },
  sectionRule: {
    flex: 1,
    height: "1px",
    background: "linear-gradient(90deg, #d1d5db 0%, transparent 100%)",
    borderRadius: "1px",
  },
  sectionCta: {
    fontSize: "0.7rem",
    fontWeight: 700,
    textDecoration: "none",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
  },

  // ─── Championships ──────────────────────────────────────────
  champGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "0.75rem",
  },
  champCard: {
    display: "flex",
    alignItems: "center",
    borderRadius: "12px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #2a2a45",
    textDecoration: "none",
    overflow: "hidden",
    transition: "border-color 0.15s, background 0.15s",
  },
  champCardAccent: {
    width: "4px",
    alignSelf: "stretch",
    background: "linear-gradient(180deg, #cba6f7 0%, #89b4fa 100%)",
    flexShrink: 0,
  },
  champBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.15rem",
    padding: "0.85rem 0.9rem",
    minWidth: 0,
  },
  champName: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  champMeta: { fontSize: "0.72rem", color: "#ffffff", letterSpacing: "0.04em" },
  champChampion: { fontSize: "0.72rem", color: "#f9e2af", fontWeight: 600 },
  champArrow: {
    fontSize: "1.4rem",
    color: "#45475a",
    padding: "0 0.9rem",
    flexShrink: 0,
    lineHeight: 1,
  },

  // ─── Partners ──────────────────────────────────────────────
  apoioGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.75rem",
  },
  apoioCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.4rem",
    padding: "1rem 1.25rem",
    borderRadius: "12px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #2a2a45",
    textDecoration: "none",
    transition: "border-color 0.15s, background 0.15s",
    minWidth: "100px",
  },
  apoioLogo: {
    height: "48px",
    width: "auto",
    objectFit: "contain",
    filter: "brightness(1.1)",
  },
  apoioName: {
    fontSize: "0.72rem",
    color: "#ffffff",
    textAlign: "center" as const,
    fontWeight: 600,
  },
};
