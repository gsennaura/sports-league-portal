import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toSlugPath } from "@utils/slug";
import type { ListVenues } from "@application/use_cases/ListVenues";
import type { Venue } from "@domain/entities/Venue";
import { API_BASE } from "@infrastructure/apiBase";

const _RAW_BASE = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main";
const NO_VENUE_PHOTO = `${_RAW_BASE}/venues/no_venue_photo.png`;

interface City {
  id: string;
  name: string;
}

interface VenuesPageProps {
  listVenues: ListVenues;
}

function VenueCard({ venue }: { venue: Venue; cityName: string }) {
  return (
    <Link to={`/locais/${toSlugPath(venue.name, venue.id)}`} style={{ textDecoration: "none" }}>
      <div style={S.card}>
        <img
          src={venue.photo_url ?? NO_VENUE_PHOTO}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_VENUE_PHOTO; }}
          alt={venue.name}
          style={{ width: 72, height: 52, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#181825" }}
        />
        <div style={S.cardBody}>
          {venue.nickname
            ? (
              <>
                <span style={S.cardName}>{venue.nickname}</span>
                <span style={S.cardFullName}>{venue.name}</span>
              </>
            )
            : <span style={S.cardName}>{venue.name}</span>
          }
        </div>
      </div>
    </Link>
  );
}

export function VenuesPage({ listVenues }: VenuesPageProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [cityMap, setCityMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listVenues.execute(),
      fetch(`${API_BASE}/cities`).then((r) => r.json() as Promise<City[]>),
    ])
      .then(([vs, cities]) => {
        setVenues(vs);
        const map = new Map<string, string>();
        for (const c of cities) map.set(c.id, c.name);
        setCityMap(map);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // Group by city
  const byCity = new Map<string, Venue[]>();
  for (const v of venues) {
    const city = cityMap.get(v.city_id) ?? "–";
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city)!.push(v);
  }
  const cities = [...byCity.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <>
      {/* Hero */}
      <header style={S.hero}>
        <div style={S.heroAccentBar} />
        <div style={S.heroInner}>
          <Link to="/" style={S.heroBack}>← Página Principal</Link>
          <span style={S.heroEyebrow}>🏟 Infraestrutura Esportiva</span>
          <h1 style={S.heroTitle}>Locais</h1>
          <p style={S.heroSub}>
            Estádios, campos e ginásios cadastrados na plataforma.
          </p>
        </div>
      </header>

      {/* Content */}
      <main style={S.page}>
        {loading && <p style={S.status}>Carregando locais...</p>}
        {error && <p style={S.error}>{error}</p>}

        {!loading && !error && venues.length === 0 && (
          <p style={S.status}>Nenhum local cadastrado.</p>
        )}

        {!loading && !error && venues.length > 0 && (
          cities.map((city) => (
            <section key={city} style={S.citySection}>
              <h2 style={S.cityTitle}>{city}</h2>
              <div style={S.grid}>
                {byCity.get(city)!.map((v) => (
                  <VenueCard
                    key={v.id}
                    venue={v}
                    cityName={cityMap.get(v.city_id) ?? ""}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "linear-gradient(160deg, #1e1e2e 0%, #181825 60%, #11111b 100%)",
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
  heroEyebrow: {
    color: "#89b4fa",
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
  status: {
    color: "#a6adc8",
    fontSize: "0.95rem",
  },
  error: {
    color: "#f38ba8",
    fontSize: "0.95rem",
  },

  citySection: {
    marginBottom: "2.5rem",
  },
  cityTitle: {
    margin: "0 0 1rem",
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#cdd6f4",
    borderBottom: "1px solid #313244",
    paddingBottom: "0.5rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1rem",
  },

  // Card
  card: {
    background: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: "0.65rem",
    padding: "1rem 1.1rem",
    display: "flex",
    gap: "0.85rem",
    alignItems: "flex-start",
  },
  cardIcon: {
    fontSize: "1.6rem",
    lineHeight: 1,
    flexShrink: 0,
    marginTop: "0.1rem",
    color: "unset",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
    minWidth: 0,
  },
  cardName: {
    color: "#cdd6f4",
    fontWeight: 700,
    fontSize: "0.97rem",
    lineHeight: 1.3,
  },
  cardFullName: {
    color: "#a6adc8",
    fontSize: "0.82rem",
    lineHeight: 1.3,
  },
};
