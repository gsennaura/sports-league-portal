import React, { useState, useEffect, useMemo } from "react";
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
    <Link to={`/clubes/${toSlugPath(club.name, club.id)}`} style={styles.clubCard}>
      <div style={styles.clubHeader}>
        <ClubShield url={club.logo_url} name={club.nickname ?? club.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.clubName}>{club.name}</div>
          {club.city_name && club.city_name !== "\u2013" && (
            <div style={styles.clubMeta}>{club.city_name}</div>
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
      <header style={styles.hero}>
        <div style={styles.heroAccentBar} />
        <div style={styles.heroInner}>
          <Link to="/" style={styles.heroBack}>← Página Principal</Link>
          <span style={styles.heroEyebrow}>⚽ Gestão Esportiva</span>
          <h1 style={styles.heroTitle}>Clubes</h1>
          <p style={styles.heroSub}>Conheça os clubes cadastrados.</p>
        </div>
      </header>

      {/* Content */}
      <main style={styles.page}>

        {/* ── Filter panel ────────────────────────────────────────────────── */}
        <div style={styles.filterPanel}>
          {/* Name row */}
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
            placeholder="Buscar pelo nome do clube..."
            style={styles.filterInput}
          />

          {/* Selects row */}
          <div style={styles.filterSelects}>
            <select value={inputCity} onChange={(e) => setInputCity(e.target.value)} style={styles.filterSelect}>
              <option value="">Cidade</option>
              {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>

            <select value={inputSport} onChange={(e) => setInputSport(e.target.value)} style={styles.filterSelect}>
              <option value="">Esporte</option>
              {sportOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={inputCategory} onChange={(e) => setInputCategory(e.target.value)} style={styles.filterSelect}>
              <option value="">Categoria</option>
              {catOptions.map((c) => <option key={c} value={c}>{categoryLabel[c] ?? c}</option>)}
            </select>

            <select value={inputLeague} onChange={(e) => setInputLeague(e.target.value)} style={styles.filterSelect}>
              <option value="">Liga</option>
              {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Buttons row */}
          <div style={styles.filterButtons}>
            <button
              onClick={() => void handleSearch()}
              disabled={searching}
              style={{ ...styles.searchButton, opacity: searching ? 0.6 : 1 }}
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
            {hasSearched && (
              <button onClick={handleReset} style={styles.resetButton}>
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Status messages ───────────────────────────────────────────── */}
        {loading && <p style={styles.status}>Carregando...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {!loading && !error && (
          <>
            {/* Results count */}
            <div style={styles.resultsHeader}>
              {hasSearched ? (
                <span style={styles.resultsLabel}>
                  {filteredClubs.length === 0
                    ? "Nenhum clube encontrado."
                    : `${filteredClubs.length} clube${filteredClubs.length !== 1 ? "s" : ""} encontrado${filteredClubs.length !== 1 ? "s" : ""}`}
                </span>
              ) : (
                <span style={styles.resultsLabel}>
                  Mostrando {Math.min(20, clubs.length)} de {clubs.length} clubes
                </span>
              )}
            </div>

            {/* Club grid */}
            {displayClubs.length > 0 && (
              <div style={styles.clubsGrid}>
                {displayClubs.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            )}

            {/* "Ver mais" hint */}
            {!hasSearched && clubs.length > 20 && (
              <div style={styles.seeMoreHint}>
                Para ver mais clubes, utilize o filtro acima.
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    gap: "0.5rem",
  },
  heroBack: {
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.85rem",
    marginBottom: "0.25rem",
    alignSelf: "flex-start" as const,
  },
  heroEyebrow: {
    color: "#89b4fa",
    fontSize: "0.82rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
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

  // Page
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
  },

  // Filter panel
  filterPanel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.6rem",
    marginBottom: "2rem",
    padding: "1.25rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "10px",
  },
  filterInput: {
    width: "100%",
    padding: "0.6rem 0.9rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  filterSelects: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "0.5rem",
  },
  filterSelect: {
    padding: "0.55rem 0.75rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "0.85rem",
    outline: "none",
  },
  filterButtons: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
  },
  searchButton: {
    padding: "0.55rem 1.5rem",
    backgroundColor: "#89b4fa",
    border: "none",
    borderRadius: "6px",
    color: "#18265b",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
  resetButton: {
    padding: "0.55rem 1rem",
    backgroundColor: "transparent",
    border: "1px solid #45475a",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.85rem",
    cursor: "pointer",
  },

  // Results area
  resultsHeader: {
    marginBottom: "1rem",
    paddingBottom: "0.5rem",
    borderBottom: "1px solid #313244",
  },
  resultsLabel: {
    fontSize: "0.8rem",
    color: "#ffffff",
    letterSpacing: "0.03em",
  },
  clubsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "0.6rem",
  },
  seeMoreHint: {
    marginTop: "1.5rem",
    padding: "1rem 1.25rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.85rem",
    textAlign: "center" as const,
    letterSpacing: "0.01em",
  },

  // Club card
  clubCard: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
    padding: "0.85rem 1rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    textDecoration: "none",
    transition: "border-color 0.15s",
  },
  clubHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  clubName: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#cdd6f4",
  },
  clubMeta: {
    fontSize: "0.72rem",
    color: "#ffffff",
    marginTop: "0.1rem",
  },

  status: { color: "#cdd6f4" },
  error: { color: "#f38ba8" },
};
