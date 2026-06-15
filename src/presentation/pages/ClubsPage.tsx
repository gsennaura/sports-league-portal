import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { toSlugPath } from "@utils/slug";
import type { ListClubs } from "@application/use_cases/ListClubs";
import type { Club } from "@domain/entities/Club";
import { API_BASE } from "@infrastructure/apiBase";
import { LEAGUE_ID } from "../../config";

interface ClubsPageProps {
  listClubs: ListClubs;
}

const NO_SHIELD =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/clubs/no_club_shield.png";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function sampleN<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

const categoryLabel: Record<string, string> = {
  amador: "Amador",
  profissional: "Profissional",
  base: "Base",
  junior: "J\u00fanior",
  juvenil: "Juvenil",
  infantil: "Infantil",
  mirim: "Mirim",
  "pre-mirim": "Pr\u00e9-Mirim",
  master: "Master",
  universitaria: "Universit\u00e1ria",
};

function ClubShield({ url, name }: { url: string | null; name: string }) {
  return (
    <img
      src={url ?? NO_SHIELD}
      alt={`Escudo ${name}`}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_SHIELD; }}
      style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

function ClubCard({ club }: { club: Club }) {
  return (
    <Link to={`/clubes/${toSlugPath(club.name, club.id)}`} className="club-card">
      <div className="club-card__header">
        <ClubShield url={club.logo_url} name={club.nickname ?? club.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="club-card__name">{club.name}</div>
          {club.city_name && club.city_name !== "–" && (
            <div className="club-card__meta">{club.city_name}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ClubsPage({ listClubs }: ClubsPageProps) {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extra filter-option data
  const [clubSports, setClubSports] = useState<Map<string, string[]>>(new Map());
  const [clubCats, setClubCats] = useState<Map<string, string[]>>(new Map());
  const [sportOptions, setSportOptions] = useState<string[]>([]);
  const [catOptions, setCatOptions] = useState<string[]>([]);
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([]);

  // ── Filter inputs ─────────────────────────────────────────────────────────
  const [inputName, setInputName] = useState("");
  const [inputCity, setInputCity] = useState("");
  const [inputSport, setInputSport] = useState("");
  const [inputCategory, setInputCategory] = useState("");
  const [inputLeague, setInputLeague] = useState("");

  // ── Search results ────────────────────────────────────────────────────────
  const [hasSearched, setHasSearched] = useState(false);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [searching, setSearching] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    type RawTeam = { club_id: string | null; sport_name: string | null; category: string | null };
    type RawLeague = { id: string; name: string };

    Promise.all([
      listClubs.execute(LEAGUE_ID || undefined),
      fetch(`${API_BASE}/teams`).then((r) => (r.ok ? (r.json() as Promise<RawTeam[]>) : [])),
      fetch(`${API_BASE}/leagues?`).then((r) => (r.ok ? (r.json() as Promise<RawLeague[]>) : [])),
    ])
      .then(([clubsData, teamsData, leaguesData]) => {
        setClubs(clubsData);

        // Build sport & category maps per club
        const sportsMap = new Map<string, string[]>();
        const catsMap = new Map<string, string[]>();
        const allSports = new Set<string>();
        const allCats = new Set<string>();
        for (const t of teamsData as RawTeam[]) {
          if (!t.club_id) continue;
          if (t.sport_name) {
            if (!sportsMap.has(t.club_id)) sportsMap.set(t.club_id, []);
            if (!sportsMap.get(t.club_id)!.includes(t.sport_name))
              sportsMap.get(t.club_id)!.push(t.sport_name);
            allSports.add(t.sport_name);
          }
          if (t.category) {
            if (!catsMap.has(t.club_id)) catsMap.set(t.club_id, []);
            if (!catsMap.get(t.club_id)!.includes(t.category))
              catsMap.get(t.club_id)!.push(t.category);
            allCats.add(t.category);
          }
        }
        setClubSports(sportsMap);
        setClubCats(catsMap);
        setSportOptions([...allSports].sort((a, b) => a.localeCompare(b, "pt-BR")));
        setCatOptions([...allCats].sort((a, b) => a.localeCompare(b, "pt-BR")));
        setLeagues(
          (leaguesData as RawLeague[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        );
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
        setLoading(false);
      });
  }, [listClubs]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const randomClubs = useMemo(() => sampleN(clubs, 20), [clubs]);
  const cityOptions = useMemo(
    () =>
      [...new Set(clubs.map((c) => c.city_name).filter((n) => Boolean(n) && n !== "–"))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [clubs],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleSearch() {
    setSearching(true);
    try {
      let leagueClubIds: Set<string> | null = null;
      if (inputLeague) {
        const r = await fetch(`${API_BASE}/leagues/${inputLeague}/clubs`);
        if (r.ok) {
          const data = (await r.json()) as Array<{ club_id: string }>;
          leagueClubIds = new Set(data.map((d) => d.club_id));
        }
      }
      const nameLower = stripAccents(inputName.trim());
      const result = clubs.filter((c) => {
        if (
          nameLower &&
          !stripAccents(c.name).includes(nameLower) &&
          !stripAccents(c.nickname ?? "").includes(nameLower)
        )
          return false;
        if (inputCity && c.city_name !== inputCity) return false;
        if (inputSport && !(clubSports.get(c.id) ?? []).includes(inputSport)) return false;
        if (inputCategory && !(clubCats.get(c.id) ?? []).includes(inputCategory)) return false;
        if (leagueClubIds && !leagueClubIds.has(c.id)) return false;
        return true;
      });
      setFilteredClubs(result);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }

  function handleReset() {
    setInputName("");
    setInputCity("");
    setInputSport("");
    setInputCategory("");
    setInputLeague("");
    setHasSearched(false);
    setFilteredClubs([]);
  }

  const displayClubs = hasSearched ? filteredClubs : randomClubs;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hero */}
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/" className="back-link">← Página Principal</Link>
          <span className="hero__eyebrow">⚽ Gestão Esportiva</span>
          <h1 className="page-title">Clubes</h1>
          <p className="hero__sub">Conheça os clubes cadastrados.</p>
        </div>
      </header>

      {/* Content */}
      <main className="page-container">

        {/* ── Filter panel ────────────────────────────────────────────────── */}
        <div className="clubs-filter">
          {/* Name row */}
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
            placeholder="Buscar pelo nome do clube..."
            className="clubs-filter__input"
          />

          {/* Selects row */}
          <div className="clubs-filter__selects">
            <select value={inputCity} onChange={(e) => setInputCity(e.target.value)} className="clubs-filter__select">
              <option value="">Cidade</option>
              {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>

            <select value={inputSport} onChange={(e) => setInputSport(e.target.value)} className="clubs-filter__select">
              <option value="">Esporte</option>
              {sportOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={inputCategory} onChange={(e) => setInputCategory(e.target.value)} className="clubs-filter__select">
              <option value="">Categoria</option>
              {catOptions.map((c) => <option key={c} value={c}>{categoryLabel[c] ?? c}</option>)}
            </select>

            <select value={inputLeague} onChange={(e) => setInputLeague(e.target.value)} className="clubs-filter__select">
              <option value="">Liga</option>
              {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Buttons row */}
          <div className="clubs-filter__buttons">
            <button
              onClick={() => void handleSearch()}
              disabled={searching}
              className="clubs-filter__btn-search"
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
            {hasSearched && (
              <button onClick={handleReset} className="clubs-filter__btn-reset">
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Status messages ───────────────────────────────────────────── */}
        {loading && <p className="page-status">Carregando...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && (
          <>
            {/* Results count */}
            <div className="clubs-results-header">
              {hasSearched ? (
                <span className="clubs-results-label">
                  {filteredClubs.length === 0
                    ? "Nenhum clube encontrado."
                    : `${filteredClubs.length} clube${filteredClubs.length !== 1 ? "s" : ""} encontrado${filteredClubs.length !== 1 ? "s" : ""}`}
                </span>
              ) : (
                <span className="clubs-results-label">
                  Mostrando {Math.min(20, clubs.length)} de {clubs.length} clubes
                </span>
              )}
            </div>

            {/* Club grid */}
            {displayClubs.length > 0 && (
              <div className="clubs-grid">
                {displayClubs.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            )}

            {/* "Ver mais" hint */}
            {!hasSearched && clubs.length > 20 && (
              <div className="clubs-see-more">
                Para ver mais clubes, utilize o filtro acima.
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
