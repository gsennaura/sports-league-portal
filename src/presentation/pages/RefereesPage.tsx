import React, { useState, useRef, useEffect } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link } from "react-router-dom";
import type { ListReferees } from "@application/use_cases/ListReferees";
import type { Referee } from "@domain/entities/Referee";

const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/referees/no_referee_photo.png";

interface RefereesPageProps {
  listReferees: ListReferees;
}

function RefereePhoto({ url, name }: { url: string | null; name: string }) {
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

function RefereeCard({ referee }: { referee: Referee }) {
  return (
    <Link to={`/arbitros/${referee.id}`} style={S.card}>
      <RefereePhoto url={referee.photo_url ?? null} name={referee.name} />
      <div style={S.cardBody}>
        <span style={S.cardName}>{referee.name}</span>
        <span style={S.cardMeta}>
          {referee.nickname ? `"${referee.nickname}"` : "Árbitro"}
        </span>
      </div>
    </Link>
  );
}

export function RefereesPage({ listReferees }: RefereesPageProps) {
  const [query, setQuery] = useState("");
  const [allReferees, setAllReferees] = useState<Referee[]>([]);
  const [results, setResults] = useState<Referee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listReferees.execute().then(setAllReferees).catch(() => setError("Erro ao carregar árbitros.")).finally(() => setLoading(false));
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
      <header style={S.hero}>
        <div style={S.accentBar} />
        <div style={S.heroInner}>
          <Link to="/" style={S.heroBack}>← Página Principal</Link>
          <span style={S.eyebrow}>⚖️ Gestão Esportiva</span>
          <h1 style={S.heroTitle}>Árbitros</h1>
          <p style={S.heroSub}>
            Conheça os árbitros cadastrados. Use a busca para filtrar pelo nome.
          </p>
        </div>
      </header>

      {/* Content */}
      <main style={S.page}>
        {/* Search bar */}
        <div style={S.searchBar}>
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
            style={S.input}
          />
          <button onClick={handleSearch} disabled={loading} style={S.btn}>
            {loading ? "Carregando…" : "Filtrar"}
          </button>
        </div>

        {/* States */}
        {error && <p style={S.error}>{error}</p>}
        {!loading && searched && results !== null && results.length === 0 && (
          <p style={S.hint}>Nenhum árbitro encontrado para "{query}".</p>
        )}

        {/* Grid */}
        {!loading && displayed.length > 0 && (
          <div style={S.grid}>
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

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "linear-gradient(160deg, #1e1e2e 0%, #181825 60%, #11111b 100%)",
    borderBottom: "1px solid #313244",
    paddingBottom: "2.5rem",
    overflow: "hidden",
  },
  accentBar: {
    height: "4px",
    background: "linear-gradient(90deg, #cba6f7 0%, #89b4fa 50%, #a6e3a1 100%)",
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
    color: "#cba6f7",
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
    color: "#a6adc8",
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
    background: "#1e1e2e",
    color: "#cdd6f4",
    fontSize: "0.95rem",
    outline: "none",
  },
  btn: {
    padding: "0.6rem 1.4rem",
    borderRadius: "8px",
    border: "none",
    background: "#cba6f7",
    color: "#1e1e2e",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  hint: {
    color: "#6c7086",
    fontSize: "0.9rem",
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
    backgroundColor: "#1e1e2e",
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
    backgroundColor: "#181825",
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
    color: "#a6adc8",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
