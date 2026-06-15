import { useState, useEffect, useRef } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link, useParams } from "react-router-dom";
import { extractId } from "@utils/slug";
import type { GetVenueMatches } from "@application/use_cases/GetVenueMatches";
import type { Venue } from "@domain/entities/Venue";
import type { ClubMatch } from "@domain/entities/ClubMatch";
import type { VenueRepository } from "@domain/repositories/VenueRepository";
import { useAuth } from "@presentation/context/AuthContext";
import { API_BASE } from "@infrastructure/apiBase";

const _RAW_BASE = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main";
const NO_VENUE_PHOTO = `${_RAW_BASE}/venues/no_venue_photo.png`;

interface City { id: string; name: string; }

interface Props {
  getVenueMatches: GetVenueMatches;
  venueRepository?: VenueRepository;
}

// ─── Shield ──────────────────────────────────────────────────────────────────

const NO_SHIELD = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/clubs/no_club_shield.png";

function Shield({ url }: { url: string | null }) {
  return (
    <img
      src={url ?? NO_SHIELD}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_SHIELD; }}
      style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }}
      alt=""
    />
  );
}

// ─── MatchRow ────────────────────────────────────────────────────────────────

function MatchRow({ match }: { match: ClubMatch }) {
  const hasScore = match.home_score !== null && match.away_score !== null;
  const hasPenalty = hasScore && match.home_penalty_score !== null && match.away_penalty_score !== null;

  const datePart = match.match_date?.split("T")[0] ?? null;
  const dateLabel = datePart
    ? new Date(`${datePart}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;
  const timeLabel = (() => {
    const timePart = match.match_date?.includes("T") ? match.match_date.split("T")[1] : null;
    if (!timePart) return null;
    const [h, min] = timePart.split(":");
    return `${h}h${min}`;
  })();

  return (
    <Link to={`/partidas/${match.match_id}`} className="row-link">
      <div className="card">
        <div className="venue-match-card">
          {/* Col 1 — data e hora */}
          <div className="venue-match-date-col">
            {dateLabel && <span className="date-label">{dateLabel}</span>}
            {timeLabel && <span className="time-label">{timeLabel}</span>}
          </div>

          {/* Col 2 — times + placar */}
          <div className="venue-match-teams-col">
            <div className="venue-match-team-row">
              <span className="venue-match-score">
                {hasScore ? `${match.home_score}${hasPenalty ? ` (${match.home_penalty_score})` : ""}` : ""}
              </span>
              <Shield url={match.home_club_logo_url} />
              <span className="team-name">{match.home_team_name}</span>
            </div>
            <div className="venue-match-team-row">
              <span className="venue-match-score">
                {hasScore ? `${match.away_score}${hasPenalty ? ` (${match.away_penalty_score})` : ""}` : ""}
              </span>
              <Shield url={match.away_club_logo_url} />
              <span className="team-name">{match.away_team_name}</span>
            </div>
          </div>

          {/* Col 3 — campeonato */}
          <div className="venue-match-champ-col">
            <span className="champ-label">{match.championship_name}</span>
            <span className="phase-label">{match.phase_name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

const PAGE_SIZE = 10;

// ─── Stats strip ────────────────────────────────────────────────────────────

interface VenueStats {
  total: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  goals: number;
}

function computeStats(matches: ClubMatch[]): VenueStats {
  let homeWins = 0, awayWins = 0, draws = 0, goals = 0;
  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    goals += m.home_score + m.away_score;
    if (m.home_penalty_score !== null && m.away_penalty_score !== null) {
      if (m.home_penalty_score > m.away_penalty_score) homeWins++;
      else awayWins++;
    } else if (m.home_score > m.away_score) homeWins++;
    else if (m.away_score > m.home_score) awayWins++;
    else draws++;
  }
  return { total: matches.length, homeWins, awayWins, draws, goals };
}

function StatItem({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="venue-stats-strip__item">
      <span className="venue-stats-strip__value" style={color ? { color } : undefined}>{value}</span>
      <span className="venue-stats-strip__label">{label}</span>
    </div>
  );
}

// ─── VenueDetailPage ─────────────────────────────────────────────────────────

export function VenueDetailPage({ getVenueMatches, venueRepository }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const id = slug ? extractId(slug) : undefined;
  const { isAdmin } = useAuth();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [cityName, setCityName] = useState<string>("");
  const [matches, setMatches] = useState<ClubMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE}/venues/${id}`).then((r) => {
        if (!r.ok) throw new Error("Local não encontrado.");
        return r.json() as Promise<Venue>;
      }),
      fetch(`${API_BASE}/cities`).then((r) => r.json() as Promise<City[]>),
      getVenueMatches.execute(id),
    ])
      .then(([v, cities, ms]) => {
        setVenue(v);
        setCurrentPhotoUrl(v.photo_url);
        const cityMap = new Map(cities.map((c) => [c.id, c.name]));
        setCityName(cityMap.get(v.city_id) ?? "");
        setMatches(ms);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const addressParts = venue
    ? [venue.street, venue.number, venue.complement].filter(Boolean).join(", ")
    : "";

  const stats = computeStats(matches);
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const pageMatches = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Unique championships derived from matches
  const champMap = new Map<string, { id: string; name: string; count: number }>();
  for (const m of matches) {
    if (!champMap.has(m.championship_id)) {
      champMap.set(m.championship_id, { id: m.championship_id, name: m.championship_name, count: 0 });
    }
    champMap.get(m.championship_id)!.count++;
  }
  const championships = [...champMap.values()].sort((a, b) => b.count - a.count);
  // Group current page matches by date
  const byDate = new Map<string, ClubMatch[]>();
  for (const m of pageMatches) {
    const key = m.match_date?.split("T")[0] ?? "sem-data";
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  }
  const dateKeys = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  function formatDateHeading(isoDate: string): string {
    if (isoDate === "sem-data") return "Data não definida";
    const d = new Date(`${isoDate}T12:00:00`);
    const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
    const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day}`;
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || !venueRepository) return;
    setPhotoUploading(true);
    try {
      const result = await venueRepository.uploadPhoto(id, file);
      setCurrentPhotoUrl(result.photo_url);
    } catch (err) {
      console.error(err);
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <header className="hero">
        <div className="hero__bar" />
        <div className="hero__inner">
          <Link to="/locais" className="back-link">← Locais</Link>

          {loading && <PageLoader />}
          {error && <p className="error-text">{error}</p>}

          {venue && (
            <div className="venue-hero-row">
              {/* Left: large photo */}
              <div className="venue-hero-photo">
                <img
                  src={currentPhotoUrl ?? NO_VENUE_PHOTO}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_VENUE_PHOTO; }}
                  alt={`Foto ${venue.name}`}
                  className="venue-hero-photo__img"
                />
                {isAdmin && venueRepository && (
                  <>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={handlePhotoChange}
                    />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      title="Alterar foto do local"
                      className="photo-upload-btn"
                    >
                      ✏️
                    </button>
                  </>
                )}
              </div>

              {/* Right: info */}
              <div className="venue-hero-info">
                <span className="hero__eyebrow">🏟 Local</span>
                <h1 className="hero__title">{venue.name}</h1>
                {venue.nickname && (
                  <p className="muted">"{venue.nickname}"</p>
                )}
                {/* Info chips */}
                <div className="form-field-group">
                  {cityName && (
                    <span className="badge">📍 {venue.neighborhood ? `${venue.neighborhood}, ` : ""}{cityName}</span>
                  )}
                  {addressParts && (
                    <span className="badge">🏠 {addressParts}</span>
                  )}
                  {venue.zip_code && (
                    <span className="badge">CEP {venue.zip_code}</span>
                  )}
                  {venue.latitude != null && venue.longitude != null && (
                    <span className="badge">🌐 {venue.latitude.toFixed(5)}, {venue.longitude.toFixed(5)}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── Matches ──────────────────────────────────────────────── */}
      <main className="page-container">
        {!loading && !error && (
          <>
            {/* Stats strip */}
            {matches.length > 0 && (
              <div className="venue-stats-strip">
                <StatItem label="Jogos" value={stats.total} />
                <div className="venue-stats-strip__divider" />
                <StatItem label="Mandante" value={stats.homeWins} color="#89b4fa" />
                <StatItem label="Empates" value={stats.draws} color="#f9e2af" />
                <StatItem label="Visitante" value={stats.awayWins} color="#cba6f7" />
                <div className="venue-stats-strip__divider" />
                <StatItem label="Gols" value={stats.goals} color="#a6e3a1" />
              </div>
            )}

            {/* Championships played here */}
            {championships.length > 0 && (
              <section className="page-section">
                <h2 className="section-heading">Campeonatos neste local</h2>
                <div className="champ-grid">
                  {championships.map((c) => (
                    <div key={c.id} className="champ-card">
                      <span className="team-name">{c.name}</span>
                      <span className="muted">{c.count} partida{c.count !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <h2 className="section-heading">
              Partidas neste local
              {matches.length > 0 && (
                <span className="muted">{matches.length}</span>
              )}
            </h2>

            {matches.length === 0 ? (
              <p className="status-chip">Nenhuma partida registrada neste local.</p>
            ) : (
              <>
                {dateKeys.map((dateKey) => (
                  <div key={dateKey} className="page-section">
                    <p className="section-heading">{formatDateHeading(dateKey)}</p>
                    <div className="data-list">
                      {byDate.get(dateKey)!.map((m) => (
                        <MatchRow key={m.match_id} match={m} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="venue-pagination">
                    <button
                      className="venue-page-btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      ← Anterior
                    </button>
                    <span className="venue-page-info">
                      {page} / {totalPages}
                    </span>
                    <button
                      className="venue-page-btn"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
