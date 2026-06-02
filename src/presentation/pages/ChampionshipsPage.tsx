import { useState } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link } from "react-router-dom";
import type { ListChampionships } from "@application/use_cases/ListChampionships";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import { useChampionships } from "@presentation/hooks/useChampionships";
import { useLeagues } from "@presentation/hooks/useLeagues";
import type { Championship } from "@domain/entities/Championship";

interface ChampionshipsPageProps {
  listChampionships: ListChampionships;
  listLeagues: ListLeagues;
}

const LEVEL_COLOR: Record<string, React.CSSProperties> = {
  amador:        { color: "#a6e3a1", background: "#1a2e1f", border: "1px solid #2a4a2f" },
  universitario: { color: "#89b4fa", background: "#1a1f3a", border: "1px solid #2a3a6a" },
  profissional:  { color: "#f9e2af", background: "#2e2a1a", border: "1px solid #4a3a2a" },
};

const LEVEL_LABEL: Record<string, string> = {
  amador: "Amador",
  junior: "Júnior",
  juvenil: "Juvenil",
  infantil: "Infantil",
  mirim: "Mirim",
  "pre-mirim": "Pré-Mirim",
  universitario: "Universitário",
  profissional: "Profissional",
  master: "Master",
  clube_social: "Clube Social",
  rural: "Rural",
  "inter-municipal": "Inter-municipal",
};

export function ChampionshipsPage({ listChampionships, listLeagues }: ChampionshipsPageProps) {
  const { championships, loading, error } = useChampionships(listChampionships);
  const { leagues } = useLeagues(listLeagues);
  const [search, setSearch] = useState("");

  const leagueMap = new Map(leagues.map((l) => [l.id, l]));

  const query = search.trim().toLowerCase();
  const filtered = query
    ? championships.filter((c) => {
        const leagueName = c.league_id ? (leagueMap.get(c.league_id)?.name ?? "") : "";
        return (
          (c.nickname ?? c.name).toLowerCase().includes(query) ||
          leagueName.toLowerCase().includes(query)
        );
      })
    : championships;

  // Group by league, then collapse to unique championship series (name + division)
  const byLeague = new Map<string, Championship[]>();
  for (const c of filtered) {
    const lk = c.league_id ?? "__none__";
    if (!byLeague.has(lk)) byLeague.set(lk, []);
    byLeague.get(lk)!.push(c);
  }

  const leagueKeys = [...byLeague.keys()].sort((a, b) => {
    if (a === "__none__") return 1;
    if (b === "__none__") return -1;
    return (leagueMap.get(a)?.name ?? "").localeCompare(leagueMap.get(b)?.name ?? "", "pt-BR");
  });

  // For each league, deduplicate by series key → keep most recent edition
  function toSeries(champs: Championship[]): { rep: Championship; count: number }[] {
    const map = new Map<string, Championship[]>();
    for (const c of champs) {
      const key = `${c.name}||${c.division ?? ""}||${c.level ?? ""}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.values()].map((arr) => {
      const sorted = [...arr].sort((a, b) => b.year - a.year);
      return { rep: sorted[0], count: sorted.length };
    }).sort((a, b) => (a.rep.nickname ?? a.rep.name).localeCompare(b.rep.nickname ?? b.rep.name, "pt-BR"));
  }

  // Count distinct series across full (unfiltered) data for hero
  const totalSeries = (() => {
    const seen = new Set<string>();
    for (const c of championships) seen.add(`${c.name}||${c.division ?? ""}||${c.level ?? ""}`);
    return seen.size;
  })();

  return (
    <main style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <span style={S.heroTrophy}>🏆</span>
        <div style={S.heroText}>
          <h1 style={S.title}>Campeonatos</h1>
          {!loading && !error && (
            <span style={S.count}>{totalSeries} competiç{totalSeries !== 1 ? "ões" : "ão"}</span>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={S.searchWrap}>
        <input
          style={S.search}
          type="search"
          placeholder="🔍  Buscar por nome ou liga…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {query && (
          <span style={S.searchHint}>
            {toSeries(filtered).length} resultado{toSeries(filtered).length !== 1 ? "s" : ""} para "{search}"
          </span>
        )}
      </div>

      {loading && <PageLoader />}
      {error && <p style={S.errText}>{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p style={S.muted}>Nenhum campeonato encontrado.</p>
      )}

      {!loading && !error && leagueKeys.map((lk) => {
        const league = lk !== "__none__" ? leagueMap.get(lk) : undefined;
        const leagueLabel = league ? (league.name) : "Outros";
        const leagueLink = lk !== "__none__" ? `/ligas/${lk}` : null;
        const series = toSeries(byLeague.get(lk)!);

        return (
          <section key={lk} style={S.leagueSection}>
            {/* League header */}
            <div style={S.leagueHeader}>
              <div style={S.leagueAccent} />
              <div style={S.leagueTitleWrap}>
                {leagueLink ? (
                  <Link to={leagueLink} style={S.leagueName}>{leagueLabel}</Link>
                ) : (
                  <span style={S.leagueName}>{leagueLabel}</span>
                )}
                <span style={S.leagueCount}>{series.length} competiç{series.length !== 1 ? "ões" : "ão"}</span>
              </div>
            </div>

            {/* Championship cards grid */}
            <div style={S.championshipGrid}>
              {series.map(({ rep: c, count }) => (
                <Link
                  key={c.id}
                  to={`/campeonatos/${c.id}${c.edition_id ? `?edicao=${c.edition_id}` : ""}`}
                  style={S.champCard}
                >
                  <div style={S.champCardAccent} />
                  <div style={S.champCardBody}>
                    <span style={S.champName}>{c.nickname ?? c.name}</span>
                    {c.nickname && <span style={S.champFullName}>{c.name}</span>}
                    <div style={S.champBadges}>
                      {c.level && (
                        <span style={{ ...S.badge, ...(LEVEL_COLOR[c.level] ?? {}) }}>
                          {LEVEL_LABEL[c.level] ?? c.level}
                        </span>
                      )}
                      {c.division && (
                        <span style={{ ...S.badge, color: "#cba6f7", background: "#201a2a", border: "1px solid #4a2a6a" }}>
                          {c.division}
                        </span>
                      )}
                      {count > 1 && (
                        <span style={S.editionCount}>{count} edições</span>
                      )}
                    </div>
                  </div>
                  <span style={S.champArrow}>›</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "3rem 2rem 6rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0",
  },

  // Hero
  hero: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    marginBottom: "2.5rem",
    paddingBottom: "1.5rem",
    borderBottom: "2px solid #313244",
  },
  heroTrophy: {
    fontSize: "3rem",
    lineHeight: 1,
    filter: "drop-shadow(0 2px 12px rgba(249,226,175,0.4))",
    userSelect: "none",
  } as React.CSSProperties,
  heroText: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
  },
  title: {
    margin: 0,
    fontSize: "2.2rem",
    fontWeight: 900,
    color: "#cdd6f4",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
  },
  count: {
    fontSize: "0.82rem",
    color: "#6c7086",
  },

  // Search
  searchWrap: {
    marginBottom: "2.5rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap" as const,
  },
  search: {
    flex: "1 1 300px",
    maxWidth: "520px",
    padding: "0.7rem 1.1rem",
    background: "#1e1e2e",
    border: "1px solid #45475a",
    borderRadius: "12px",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  searchHint: {
    fontSize: "0.78rem",
    color: "#6c7086",
  },

  muted: { color: "#6c7086", fontSize: "0.9rem", margin: 0 },
  errText: { color: "#f38ba8", fontSize: "0.9rem", margin: 0 },

  // League section
  leagueSection: {
    marginBottom: "2.5rem",
  },
  leagueHeader: {
    display: "flex",
    alignItems: "stretch",
    marginBottom: "1rem",
  },
  leagueAccent: {
    width: "4px",
    borderRadius: "2px",
    background: "linear-gradient(180deg, #89b4fa 0%, #cba6f7 100%)",
    flexShrink: 0,
    marginRight: "0.75rem",
  },
  leagueTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flex: 1,
    paddingBottom: "0.5rem",
    borderBottom: "1px solid #313244",
  },
  leagueName: {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#89b4fa",
    textDecoration: "none",
    letterSpacing: "0.01em",
  },
  leagueCount: {
    fontSize: "0.72rem",
    color: "#6c7086",
    marginLeft: "auto",
  },

  // Championship grid
  championshipGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "0.75rem",
    paddingLeft: "0.25rem",
  },
  champCard: {
    display: "flex",
    alignItems: "stretch",
    borderRadius: "12px",
    backgroundColor: "#1e1e2e",
    border: "1px solid #313244",
    textDecoration: "none",
    overflow: "hidden",
    transition: "border-color 0.15s",
  },
  champCardAccent: {
    width: "4px",
    background: "linear-gradient(180deg, #89b4fa 0%, #cba6f7 100%)",
    flexShrink: 0,
  },
  champCardBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
    padding: "0.9rem 0.85rem",
    minWidth: 0,
  },
  champName: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    lineHeight: 1.3,
  },
  champFullName: {
    fontSize: "0.72rem",
    color: "#6c7086",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  champBadges: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.3rem",
    marginTop: "0.35rem",
  },
  badge: {
    fontSize: "0.65rem",
    fontWeight: 700,
    borderRadius: "4px",
    padding: "0.15rem 0.45rem",
    whiteSpace: "nowrap" as const,
  },
  editionCount: {
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "#6c7086",
    background: "#181825",
    border: "1px solid #313244",
    borderRadius: "4px",
    padding: "0.15rem 0.45rem",
    whiteSpace: "nowrap" as const,
  },
  champArrow: {
    fontSize: "1.4rem",
    color: "#45475a",
    padding: "0 0.85rem",
    flexShrink: 0,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
  },
};
