import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import type { SearchAthletes } from "@application/use_cases/SearchAthletes";
import type { GetRandomAthletes } from "@application/use_cases/GetRandomAthletes";
import type { Athlete } from "@domain/entities/Athlete";

const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/main/athletes/no_athlete_photo.png";

interface AthletesPageProps {
  searchAthletes: SearchAthletes;
  getRandomAthletes: GetRandomAthletes;
}

function AthletePhoto({ url, name }: { url: string | null; name: string }) {
  return (
    <img
      src={url ?? NO_PHOTO}
      alt={name}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = NO_PHOTO;
      }}
      style={S.photo}
    />
  );
}

function AthleteCard({ athlete }: { athlete: Athlete }) {
  return (
    <Link to={`/atletas/${athlete.id}`} style={S.card}>
      <AthletePhoto url={athlete.photo_url ?? null} name={athlete.name} />
      <div style={S.cardBody}>
        <span style={S.cardName}>{athlete.name}</span>
        <span style={S.cardMeta}>
          {[athlete.nickname ? `"${athlete.nickname}"` : null, athlete.position].filter(Boolean).join(" · ")}
        </span>
      </div>
    </Link>
  );
}

export function AthletesPage({ searchAthletes, getRandomAthletes }: AthletesPageProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Athlete[] | null>(null);
  const [randomAthletes, setRandomAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getRandomAthletes.execute(20).then(setRandomAthletes).catch(() => {/* silently ignore */});
  }, [getRandomAthletes]);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await searchAthletes.execute(trimmed);
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao buscar atletas.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <>
      {/* Hero */}
      <header className="hero">
        <div style={S.accentBar} />
        <div className="hero__inner">
          <Link to="/" style={S.heroBack}>← Página Principal</Link>
          <span style={S.eyebrow}>🏃 Gestão Esportiva</span>
          <h1 style={S.heroTitle}>Atletas</h1>
          <p style={S.heroSub}>
            Busque atletas pelo nome para ver seu perfil e histórico de carreira.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="page-container">
        {/* Search bar */}
        <div style={S.searchBar}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite o nome do atleta (mín. 2 caracteres)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={S.input}
          />
          <button onClick={handleSearch} disabled={loading} style={S.btn}>
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {/* States */}
        {error && <p className="error-text">{error}</p>}
        {searched && !loading && !error && results !== null && results.length === 0 && (
          <p style={S.hint}>Nenhum atleta encontrado para "{query}".</p>
        )}

        {/* Results grid (search) */}
        {searched && results && results.length > 0 && (
          <div style={S.grid}>
            {results.map((a) => (
              <AthleteCard key={a.id} athlete={a} />
            ))}
          </div>
        )}

        {/* Random athletes shown before any search */}
        {!searched && !loading && (
          <>
            {randomAthletes.length > 0 && (
              <>
                <p style={S.infoBanner}>
                  Exibindo {randomAthletes.length} atletas aleatórios. Para encontrar um atleta
                  específico, use a busca acima. Por motivos de performance, não listamos todos
                  os atletas de uma vez.
                </p>
                <div style={S.grid}>
                  {randomAthletes.map((a) => (
                    <AthleteCard key={a.id} athlete={a} />
                  ))}
                </div>
              </>
            )}
            {randomAthletes.length === 0 && (
              <p style={S.hint}>
                Digite pelo menos 2 caracteres e pressione "Buscar" ou Enter.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "linear-gradient(160deg, #18265b 0%, #18265b 60%, #11111b 100%)",
    borderBottom: "1px solid #313244",
    paddingBottom: "2.5rem",
    overflow: "hidden",
  },
  accentBar: {
    height: "4px",
    background: "linear-gradient(90deg, #a6e3a1 0%, #89b4fa 50%, #cba6f7 100%)",
  },
  heroInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2rem 2rem 0",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  heroBack: {
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.85rem",
    marginBottom: "0.25rem",
    alignSelf: "flex-start",
  },
  eyebrow: {
    color: "#a6e3a1",
    fontSize: "0.82rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
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
    color: "#ffffff",
    lineHeight: 1.6,
  },
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
  },
  searchBar: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "2rem",
  },
  input: {
    flex: 1,
    padding: "0.6rem 1rem",
    borderRadius: "8px",
    border: "1px solid #313244",
    background: "#18265b",
    color: "#cdd6f4",
    fontSize: "0.95rem",
    outline: "none",
  },
  btn: {
    padding: "0.6rem 1.4rem",
    borderRadius: "8px",
    border: "none",
    background: "#a6e3a1",
    color: "#18265b",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  hint: {
    color: "#ffffff",
    fontSize: "0.9rem",
  },
  infoBanner: {
    color: "#ffffff",
    fontSize: "0.85rem",
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1.25rem",
  },
  error: {
    color: "#f38ba8",
    fontSize: "0.9rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "0.5rem",
  },
  card: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "0.75rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    overflow: "hidden",
    textDecoration: "none",
    padding: "0.5rem 0.75rem 0.5rem 0",
    transition: "border-color 0.15s",
  },
  photo: {
    width: 44,
    height: 44,
    flexShrink: 0,
    objectFit: "cover" as const,
    backgroundColor: "#18265b",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "0.1rem",
    minWidth: 0,
  },
  cardName: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "#cdd6f4",
    lineHeight: 1.3,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardMeta: {
    fontSize: "0.72rem",
    color: "#ffffff",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
