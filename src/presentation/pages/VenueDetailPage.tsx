import React, { useState, useEffect, useRef } from "react";
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

function useMobile(breakpoint = 600) {
  const [mobile, setMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

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
    <Link to={`/partidas/${match.match_id}`} style={S.matchLink}>
      <div style={S.matchCard}>
        <div style={S.matchCardRow}>
          {/* Col 1 — data e hora */}
          <div style={S.mDateCol}>
            {dateLabel && <span style={S.mDateLabel}>{dateLabel}</span>}
            {timeLabel && <span style={S.mTimeLabel}>{timeLabel}</span>}
          </div>

          {/* Col 2 — times + placar */}
          <div style={S.mTeamsCol}>
            <div style={S.mTeamRow}>
              <span style={S.mScoreSlot}>
                {hasScore ? `${match.home_score}${hasPenalty ? ` (${match.home_penalty_score})` : ""}` : ""}
              </span>
              <Shield url={match.home_club_logo_url} />
              <span style={S.mTeamName}>{match.home_team_name}</span>
            </div>
            <div style={S.mTeamRow}>
              <span style={S.mScoreSlot}>
                {hasScore ? `${match.away_score}${hasPenalty ? ` (${match.away_penalty_score})` : ""}` : ""}
              </span>
              <Shield url={match.away_club_logo_url} />
              <span style={S.mTeamName}>{match.away_team_name}</span>
            </div>
          </div>

          {/* Col 3 — campeonato */}
          <div style={S.mChampCol}>
            <span style={S.mChampLabel}>{match.championship_name}</span>
            <span style={S.mPhaseLabel}>{match.phase_name}</span>
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

function StatItem({ label, value, color, isMobile }: { label: string; value: number; color?: string; isMobile?: boolean }) {
  return (
    <div style={{ ...S.statItem, minWidth: isMobile ? "3rem" : "4rem" }}>
      <span style={{ ...S.statValue, color: color ?? "#cdd6f4", fontSize: isMobile ? "1.1rem" : "1.6rem" }}>{value}</span>
      <span style={S.statLabel}>{label}</span>
    </div>
  );
}

// ─── VenueDetailPage ─────────────────────────────────────────────────────────

export function VenueDetailPage({ getVenueMatches, venueRepository }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const id = slug ? extractId(slug) : undefined;
  const isMobile = useMobile();
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
        <div style={S.heroAccentBar} />
        <div className="hero__inner">
          <Link to="/locais" style={S.heroBack}>← Locais</Link>

          {loading && <PageLoader />}
          {error && <p style={S.errorText}>{error}</p>}

          {venue && (
            <div style={{ display: "flex", gap: "1.75rem", alignItems: "flex-start", marginTop: "0.5rem", flexWrap: "wrap" }}>
              {/* Left: large photo */}
              <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
                <img
                  src={currentPhotoUrl ?? NO_VENUE_PHOTO}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_VENUE_PHOTO; }}
                  alt={`Foto ${venue.name}`}
                  style={{ width: 260, height: 175, objectFit: "cover", borderRadius: 10, background: "#18265b", display: "block" }}
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
                      style={{
                        position: "absolute",
                        bottom: "6px",
                        right: "6px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        backgroundColor: photoUploading ? "#45475a" : "#cba6f7",
                        border: "2px solid #18265b",
                        cursor: photoUploading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        padding: 0,
                      }}
                    >
                      ✏️
                    </button>
                  </>
                )}
              </div>

              {/* Right: info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: 0 }}>
                <span style={S.heroEyebrow}>🏟 Local</span>
                <h1 style={S.heroTitle}>{venue.name}</h1>
                {venue.nickname && (
                  <p style={S.heroNickname}>"{venue.nickname}"</p>
                )}
                {/* Info chips */}
                <div style={S.infoRow}>
                  {cityName && (
                    <span style={S.infoChip}>📍 {venue.neighborhood ? `${venue.neighborhood}, ` : ""}{cityName}</span>
                  )}
                  {addressParts && (
                    <span style={S.infoChip}>🏠 {addressParts}</span>
                  )}
                  {venue.zip_code && (
                    <span style={S.infoChip}>CEP {venue.zip_code}</span>
                  )}
                  {venue.latitude != null && venue.longitude != null && (
                    <span style={S.infoChip}>🌐 {venue.latitude.toFixed(5)}, {venue.longitude.toFixed(5)}</span>
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
              <div style={{ ...S.statsStrip, padding: isMobile ? "0.6rem 1rem" : "1rem 1.5rem" }}>
                <StatItem label="Jogos" value={stats.total} isMobile={isMobile} />
                <div style={{ ...S.statDivider, height: isMobile ? "1.5rem" : "2.5rem" }} />
                <StatItem label="Mandante" value={stats.homeWins} color="#89b4fa" isMobile={isMobile} />
                <StatItem label="Empates" value={stats.draws} color="#f9e2af" isMobile={isMobile} />
                <StatItem label="Visitante" value={stats.awayWins} color="#cba6f7" isMobile={isMobile} />
                <div style={{ ...S.statDivider, height: isMobile ? "1.5rem" : "2.5rem" }} />
                <StatItem label="Gols" value={stats.goals} color="#a6e3a1" isMobile={isMobile} />
              </div>
            )}

            {/* Championships played here */}
            {championships.length > 0 && (
              <section style={S.champSection}>
                <h2 style={S.sectionTitle}>Campeonatos neste local</h2>
                <div style={S.champGrid}>
                  {championships.map((c) => (
                    <div key={c.id} style={S.champCard}>
                      <span style={S.champCardName}>{c.name}</span>
                      <span style={S.champCardCount}>{c.count} partida{c.count !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <h2 style={S.sectionTitle}>
              Partidas neste local
              {matches.length > 0 && (
                <span style={S.matchCount}>{matches.length}</span>
              )}
            </h2>

            {matches.length === 0 ? (
              <p style={S.status}>Nenhuma partida registrada neste local.</p>
            ) : (
              <>
                {dateKeys.map((dateKey) => (
                  <div key={dateKey} style={S.dateGroup}>
                    <p style={S.dateHeading}>{formatDateHeading(dateKey)}</p>
                    <div style={S.matchList}>
                      {byDate.get(dateKey)!.map((m) => (
                        <MatchRow key={m.match_id} match={m} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={S.pagination}>
                    <button
                      style={{ ...S.pageBtn, ...(page === 1 ? S.pageBtnDisabled : {}) }}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      ← Anterior
                    </button>
                    <span style={S.pageInfo}>
                      {page} / {totalPages}
                    </span>
                    <button
                      style={{ ...S.pageBtn, ...(page === totalPages ? S.pageBtnDisabled : {}) }}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "linear-gradient(160deg, #18265b 0%, #18265b 60%, #11111b 100%)",
    borderBottom: "1px solid #313244",
    paddingBottom: "2rem",
    overflow: "hidden",
  },
  heroAccentBar: {
    height: "4px",
    background: "linear-gradient(90deg, #89b4fa 0%, #cba6f7 50%, #a6e3a1 100%)",
  },
  heroInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2rem 2rem 2rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  heroBack: {
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.85rem",
    marginBottom: "0.25rem",
    alignSelf: "flex-start",
  },
  heroEyebrow: {
    color: "#89b4fa",
    fontSize: "0.82rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
    fontWeight: 800,
    color: "#cdd6f4",
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
  },
  heroNickname: {
    margin: 0,
    fontSize: "1rem",
    color: "#89b4fa",
    fontStyle: "italic",
  },
  infoRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginTop: "0.6rem",
  },
  infoChip: {
    background: "#313244",
    color: "#ffffff",
    borderRadius: "0.4rem",
    padding: "0.2rem 0.65rem",
    fontSize: "0.82rem",
  },

  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
  },
  status: {
    color: "#ffffff",
    fontSize: "0.95rem",
  },
  errorText: {
    color: "#f38ba8",
    fontSize: "0.95rem",
  },
  sectionTitle: {
    margin: "0 0 1.5rem",
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#cdd6f4",
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  matchCount: {
    background: "#313244",
    color: "#89b4fa",
    borderRadius: "1rem",
    padding: "0.1rem 0.6rem",
    fontSize: "0.82rem",
    fontWeight: 600,
  },

  // Date groups
  dateGroup: {
    marginBottom: "1.5rem",
  },
  dateHeading: {
    margin: "0 0 0.6rem",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#89b4fa",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  matchList: {
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    overflow: "hidden",
    padding: "0.2rem 0.75rem",
  },

  // Match row
  matchLink: {
    textDecoration: "none",
    color: "inherit",
    display: "block",
  },
  matchCard: {
    borderBottom: "1px solid #18265b",
    padding: "0.4rem 0",
  },
  matchCardRow: {
    display: "grid",
    gridTemplateColumns: "3rem 1fr auto",
    alignItems: "center",
    gap: "0.75rem",
  },
  mDateCol: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.1rem",
    flexShrink: 0,
  },
  mDateLabel: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#cdd6f4",
  },
  mTimeLabel: {
    fontSize: "0.65rem",
    color: "#cdd6f4",
    fontWeight: 600,
  },
  mTeamsCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
    minWidth: 0,
  },
  mTeamRow: {
    display: "grid",
    gridTemplateColumns: "3rem 18px 1fr",
    alignItems: "center",
    gap: "0.4rem",
  },
  mScoreSlot: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "#a6e3a1",
    textAlign: "right" as const,
  },
  mTeamName: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  mChampCol: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-end",
    flexShrink: 0,
    maxWidth: "7rem",
  },
  mChampLabel: {
    fontSize: "0.68rem",
    color: "#cdd6f4",
    textAlign: "right" as const,
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  mPhaseLabel: {
    fontSize: "0.62rem",
    color: "#ffffff",
    textAlign: "right" as const,
  },

  // Stats strip
  statsStrip: {
    display: "flex",
    alignItems: "center",
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "10px",
    padding: "1rem 1.5rem",
    marginBottom: "1.75rem",
    flexWrap: "wrap" as const,
  },
  statItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    flex: 1,
    gap: "0.2rem",
    minWidth: "4rem",
  },
  statValue: {
    fontSize: "1.6rem",
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  statLabel: {
    fontSize: "0.68rem",
    color: "#ffffff",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  statDivider: {
    width: "1px",
    height: "2.5rem",
    background: "#313244",
    margin: "0 0.5rem",
    flexShrink: 0,
  },

  // Pagination
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    marginTop: "1.5rem",
    paddingTop: "1rem",
    borderTop: "1px solid #313244",
  },
  pageBtn: {
    background: "#313244",
    color: "#cdd6f4",
    border: "1px solid #45475a",
    borderRadius: "6px",
    padding: "0.4rem 1rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  pageBtnDisabled: {
    opacity: 0.35,
    cursor: "default",
  },
  pageInfo: {
    color: "#ffffff",
    fontSize: "0.88rem",
    fontWeight: 600,
    minWidth: "4rem",
    textAlign: "center" as const,
  },

  // Championships section
  champSection: {
    marginBottom: "2.5rem",
  },
  champGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "0.75rem",
  },
  champCard: {
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
  },
  champCardName: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#cdd6f4",
    lineHeight: 1.3,
  },
  champCardCount: {
    fontSize: "0.72rem",
    color: "#89b4fa",
    fontWeight: 600,
  },
};
