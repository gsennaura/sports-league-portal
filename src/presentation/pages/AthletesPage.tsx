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
      className="person-card__photo"
    />
  );
}

function AthleteCard({ athlete }: { athlete: Athlete }) {
  return (
    <Link to={`/atletas/${athlete.id}`} className="person-card">
      <AthletePhoto url={athlete.photo_url ?? null} name={athlete.name} />
      <div className="person-card__body">
        <span className="person-card__name">{athlete.name}</span>
        <span className="person-card__meta">
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
        <div className="hero__bar" />
        <div className="hero__inner">
          <Link to="/" className="back-link">← Página Principal</Link>
<h1 className="hero__title">Atletas</h1>
          <p className="hero__sub">
            Busque atletas pelo nome para ver seu perfil e histórico de carreira.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="page-container">
        {/* Search bar */}
        <div className="search-bar">
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite o nome do atleta (mín. 2 caracteres)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="search-input"
          />
          <button onClick={handleSearch} disabled={loading} className="btn btn-success">
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {/* States */}
        {error && <p className="error-text">{error}</p>}
        {searched && !loading && !error && results !== null && results.length === 0 && (
          <p className="muted">Nenhum atleta encontrado para "{query}".</p>
        )}

        {/* Results grid (search) */}
        {searched && results && results.length > 0 && (
          <div className="person-grid">
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
                <p className="info-banner">
                  Exibindo {randomAthletes.length} atletas aleatórios. Para encontrar um atleta
                  específico, use a busca acima. Por motivos de performance, não listamos todos
                  os atletas de uma vez.
                </p>
                <div className="person-grid">
                  {randomAthletes.map((a) => (
                    <AthleteCard key={a.id} athlete={a} />
                  ))}
                </div>
              </>
            )}
            {randomAthletes.length === 0 && (
              <p className="muted">
                Digite pelo menos 2 caracteres e pressione "Buscar" ou Enter.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}

