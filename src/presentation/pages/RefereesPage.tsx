import React, { useState, useRef, useEffect } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link } from "react-router-dom";
import type { ListReferees } from "@application/use_cases/ListReferees";
import type { Referee } from "@domain/entities/Referee";

const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/referees/no_referee_photo.png";

interface RefereesPageProps {
  listReferees: ListReferees;
  leagueId?: string;
}

function RefereePhoto({ url, name }: { url: string | null; name: string }) {
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

function RefereeCard({ referee }: { referee: Referee }) {
  return (
    <Link to={`/arbitros/${referee.id}`} className="person-card">
      <RefereePhoto url={referee.photo_url ?? null} name={referee.name} />
      <div className="person-card__body">
        <span className="person-card__name">{referee.name}</span>
        <span className="person-card__meta">
          {referee.nickname ? `"${referee.nickname}"` : "Árbitro"}
        </span>
      </div>
    </Link>
  );
}

export function RefereesPage({ listReferees, leagueId }: RefereesPageProps) {
  const [query, setQuery] = useState("");
  const [allReferees, setAllReferees] = useState<Referee[]>([]);
  const [results, setResults] = useState<Referee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listReferees.execute(undefined, leagueId).then(setAllReferees).catch(() => setError("Erro ao carregar árbitros.")).finally(() => setLoading(false));
  }, [listReferees]);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearched(false);
      setResults(null);
      return;
    }
    setSearched(true);
    const lower = trimmed.toLowerCase();
    const filtered = allReferees.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        (r.nickname ?? "").toLowerCase().includes(lower)
    );
    setResults(filtered);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const displayed = searched && results !== null ? results : allReferees;

  return (
    <>
      {/* Hero */}
      <header className="hero">
        <div className="hero__bar" />
        <div className="hero__inner">
          <Link to="/" className="back-link">← Página Principal</Link>
          <span className="hero__eyebrow">⚖️ Gestão Esportiva</span>
          <h1 className="hero__title">Árbitros</h1>
          <p className="hero__sub">
            Conheça os árbitros cadastrados. Use a busca para filtrar pelo nome.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="page-container">
        {/* Search bar */}
        <div className="clubs-filter">
          <input
            ref={inputRef}
            type="text"
            placeholder="Filtrar por nome ou apelido…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) { setSearched(false); setResults(null); }
            }}
            onKeyDown={handleKeyDown}
            className="clubs-filter__input"
          />
          <div className="clubs-filter__buttons">
            <button onClick={handleSearch} disabled={loading} className="clubs-filter__btn-search">
              {loading ? "Carregando…" : "Filtrar"}
            </button>
          </div>
        </div>

        {/* States */}
        {error && <p className="error-text">{error}</p>}
        {!loading && searched && results !== null && results.length === 0 && (
          <p className="muted">Nenhum árbitro encontrado para "{query}".</p>
        )}

        {/* Grid */}
        {!loading && displayed.length > 0 && (
          <div className="person-grid">
            {displayed.map((r) => (
              <RefereeCard key={r.id} referee={r} />
            ))}
          </div>
        )}

        {loading && <PageLoader />}
      </main>
    </>
  );
}

