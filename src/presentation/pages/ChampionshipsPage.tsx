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

// Keys válidas para as classes de nível
const LEVEL_COLOR = new Set(["amador", "universitario", "profissional"]);

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
    <>
      {/* Hero — full-width, fora do page-container */}
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner hero__row">
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
      </header>

      <main className="page-container">
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
                    <span className={`champ-badge champ-badge--${c.level in LEVEL_COLOR ? c.level : "default"}`}>
                      {LEVEL_LABEL[c.level] ?? c.level}
                    </span>
                  )}
                  {c.division && (
                    <span className="champ-badge champ-badge--division">
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
    </>
  );
}


