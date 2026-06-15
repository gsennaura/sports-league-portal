import { useState, useEffect } from "react";
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
  leagueId?: string;
}

function VenueCard({ venue, cityName }: { venue: Venue; cityName: string }) {
  return (
    <Link to={`/locais/${toSlugPath(venue.name, venue.id)}`} className="venue-card">
      <img
        src={venue.photo_url ?? NO_VENUE_PHOTO}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_VENUE_PHOTO; }}
        alt={venue.name}
        className="venue-card__img"
      />
      <div className="venue-card__body">
        <span className="venue-card__name">
          {venue.nickname ?? venue.name}
        </span>
        {venue.nickname && (
          <span className="venue-card__sub">{venue.name}</span>
        )}
        {cityName && (
          <span className="venue-card__sub">📍 {cityName}</span>
        )}
      </div>
    </Link>
  );
}

export function VenuesPage({ listVenues, leagueId }: VenuesPageProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [cityMap, setCityMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listVenues.execute(leagueId),
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
      <header className="hero">
        <div className="hero__bar" />
        <div className="hero__inner">
          <Link to="/" className="back-link">← Página Principal</Link>
          <span className="hero__eyebrow">🏟 Infraestrutura Esportiva</span>
          <h1 className="hero__title">Locais</h1>
          <p className="hero__sub">
            Estádios, campos e ginásios cadastrados na plataforma.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="page-container">
        {loading && <p className="status-chip">Carregando locais...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && venues.length === 0 && (
          <p className="status-chip">Nenhum local cadastrado.</p>
        )}

        {!loading && !error && venues.length > 0 && (
          cities.map((city) => (
            <section key={city} className="page-section">
              <h2 className="venue-city-heading">🏙 {city}</h2>
              <div className="venue-grid">
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

