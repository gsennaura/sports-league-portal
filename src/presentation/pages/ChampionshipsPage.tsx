import { useState } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link } from "react-router-dom";
import type { ListChampionships } from "@application/use_cases/ListChampionships";
import { useChampionships } from "@presentation/hooks/useChampionships";
import type { Championship } from "@domain/entities/Championship";
import { LEAGUE_ID } from "../../config";

interface ChampionshipsPageProps {
  listChampionships: ListChampionships;
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

// Collapse editions to one card per series (name + division + level), keep most recent
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
  }).sort((a, b) =>
    (a.rep.nickname ?? a.rep.name).localeCompare(b.rep.nickname ?? b.rep.name, "pt-BR")
  );
}

export function ChampionshipsPage({ listChampionships }: ChampionshipsPageProps) {
  const { championships, loading, error } = useChampionships(listChampionships);
  const [search, setSearch] = useState("");

  // Filter to the active league only
  const leagueChamps = LEAGUE_ID
    ? championships.filter((c) => c.league_id === LEAGUE_ID)
    : championships;

  const query = search.trim().toLowerCase();
  const filtered = query
    ? leagueChamps.filter((c) =>
        (c.nickname ?? c.name).toLowerCase().includes(query)
      )
    : leagueChamps;

  const series = toSeries(filtered);

  return (
    <main className="page-container">
      {/* Hero */}
      <div className="hero">
        <span className="hero__trophy">🏆</span>
        <div className="hero__text">
          <h1 className="page-title">Campeonatos</h1>
          {!loading && !error && (
            <span className="hero__count">
              {toSeries(leagueChamps).length} competiç{toSeries(leagueChamps).length !== 1 ? "ões" : "ão"}
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="search-bar search-bar--wrap">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  Buscar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {query && (
          <span className="muted">
            {series.length} resultado{series.length !== 1 ? "s" : ""} para "{search}"
          </span>
        )}
      </div>

      {loading && <PageLoader />}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && series.length === 0 && (
        <p className="muted">Nenhum campeonato encontrado.</p>
      )}

      {!loading && !error && series.length > 0 && (
        <div className="champ-grid">
          {series.map(({ rep: c, count }) => (
            <Link
              key={c.id}
              to={`/campeonatos/${c.id}${c.edition_id ? `?edicao=${c.edition_id}` : ""}`}
              className="champ-card"
            >
              <div className="champ-card__accent" />
              <div className="champ-card__body">
                <span className="champ-card__name">{c.nickname ?? c.name}</span>
                {c.nickname && <span className="champ-card__full-name">{c.name}</span>}
                <div className="champ-card__badges">
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
                    <span className="champ-card__edition-count">{count} edições</span>
                  )}
                </div>
              </div>
              <span className="champ-card__arrow">›</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
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
  count: {
    fontSize: "0.82rem",
    color: "#ffffff",
  },
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
    background: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "12px",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  searchHint: {
    fontSize: "0.78rem",
    color: "#ffffff",
  },
  championshipGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "0.75rem",
  },
  champCard: {
    display: "flex",
    alignItems: "stretch",
    borderRadius: "12px",
    backgroundColor: "#18265b",
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
    color: "#ffffff",
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
    color: "#ffffff",
    background: "#18265b",
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
