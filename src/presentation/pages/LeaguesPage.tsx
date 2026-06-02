import React from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link } from "react-router-dom";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import type { ListChampionships } from "@application/use_cases/ListChampionships";
import type { GetRecentMatches } from "@application/use_cases/GetRecentMatches";
import { LeagueCard } from "@presentation/components/LeagueCard";
import { useLeagues } from "@presentation/hooks/useLeagues";
import { useChampionships } from "@presentation/hooks/useChampionships";
import { useRecentMatches } from "@presentation/hooks/useRecentMatches";
import { MatchesByDay, SectionHeader } from "@presentation/components/MatchesByDay";
import type { Championship } from "@domain/entities/Championship";

interface LeaguesPageProps {
  listLeagues: ListLeagues;
  listChampionships: ListChampionships;
  getRecentMatches: GetRecentMatches;
}

export function LeaguesPage({ listLeagues, listChampionships, getRecentMatches }: LeaguesPageProps) {
  const { leagues, loading, error } = useLeagues(listLeagues);
  const { championships } = useChampionships(listChampionships);
  const recent = useRecentMatches(getRecentMatches, 14);

  // Group championships by league_id, keeping 4 most recent
  const champsByLeague = new Map<string, Championship[]>();
  for (const c of championships) {
    if (!c.league_id) continue;
    if (!champsByLeague.has(c.league_id)) champsByLeague.set(c.league_id, []);
    champsByLeague.get(c.league_id)!.push(c);
  }
  for (const [key, list] of champsByLeague) {
    champsByLeague.set(key, [...list].sort((a, b) => b.year - a.year).slice(0, 4));
  }

  return (
    <>
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <header style={styles.hero}>
        <div style={styles.heroAccentBar} />
        <div style={styles.heroInner}>
          <Link to="/" style={styles.heroBack}>← Página Principal</Link>
          <h1 style={styles.heroTitle}>Ligas</h1>
        </div>
      </header>

      {/* ─── Content ───────────────────────────────────────────── */}
      <main style={styles.page}>
        {loading && <PageLoader />}
        {error && <p style={styles.error}>{error}</p>}

        {!loading && !error && (
          leagues.length === 0 ? (
            <p style={styles.status}>Nenhuma liga encontrada.</p>
          ) : (
            <div style={styles.list}>
              {leagues.map((lg) => (
                <LeagueCard
                  key={lg.id}
                  league={lg}
                  recentChampionships={champsByLeague.get(lg.id) ?? []}
                />
              ))}
            </div>
          )
        )}

        <section style={styles.section}>
          <SectionHeader title="Últimas Partidas" subtitle="14 dias" />
          <MatchesByDay
            matches={recent.matches}
            loading={recent.loading}
            error={recent.error}
            emptyMessage="Nenhuma partida nos últimos 14 dias."
            dateOrder="desc"
          />
        </section>
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // ─── Hero ──────────────────────────────────────────────────
  hero: {
    background: "linear-gradient(160deg, #1e1e2e 0%, #181825 60%, #11111b 100%)",
    borderBottom: "1px solid #313244",
    paddingBottom: "1.75rem",
    overflow: "hidden",
  },
  heroAccentBar: {
    height: "4px",
    background: "linear-gradient(90deg, #89b4fa 0%, #cba6f7 50%, #a6e3a1 100%)",
  },
  heroInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "1.5rem 2rem 0",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
  },
  heroBack: {
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.85rem",
    alignSelf: "flex-start" as const,
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
    fontWeight: 800,
    color: "#cdd6f4",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
  },

  // ─── Page content ──────────────────────────────────────────
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "0.75rem",
  },
  section: {
    marginTop: "2.5rem",
  },
  status: { color: "#cdd6f4" },
  error: { color: "#f38ba8" },
};
