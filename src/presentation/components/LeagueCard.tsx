import { Link } from "react-router-dom";
import type { League } from "@domain/entities/League";
import type { Championship } from "@domain/entities/Championship";

interface LeagueCardProps {
  league: League;
  recentChampionships?: Championship[];
}

export function LeagueCard({ league, recentChampionships = [] }: LeagueCardProps) {
  return (
    <Link to={`/ligas/${league.id}`} style={styles.card}>
      <div style={styles.top}>
        <div style={styles.info}>
          <div style={styles.nameRow}>
            <span style={styles.name}>{league.name}</span>
            {league.is_federated && (
              <span style={styles.federatedBadge}>Federada</span>
            )}
          </div>
          {league.city_name && (
            <span style={styles.city}>{league.city_name}</span>
          )}
        </div>
        <div style={styles.cta}>
          <span style={styles.ctaText}>Ver campeonatos</span>
          <span style={styles.ctaArrow}>›</span>
        </div>
      </div>
      {recentChampionships.length > 0 && (
        <div style={styles.chips}>
          {recentChampionships.map((c) => (
            <span key={c.id} style={styles.chip}>
              {c.nickname ?? c.name}
              <span style={styles.chipYear}>{c.year}</span>
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
    padding: "0.85rem 1rem",
    backgroundColor: "#1e1e2e",
    border: "1px solid #313244",
    borderLeft: "3px solid #89b4fa",
    borderRadius: "10px",
    textDecoration: "none",
    color: "inherit",
  },
  top: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  info: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.15rem",
    minWidth: 0,
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
  },
  name: {
    fontSize: "0.97rem",
    fontWeight: 700,
    color: "#cdd6f4",
  },
  federatedBadge: {
    fontSize: "0.62rem",
    fontWeight: 700,
    color: "#a6e3a1",
    backgroundColor: "#1a2e1f",
    border: "1px solid #2a4a2f",
    borderRadius: "4px",
    padding: "0.1rem 0.4rem",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  city: {
    fontSize: "0.72rem",
    color: "#6c7086",
  },
  cta: {
    display: "flex",
    alignItems: "center",
    gap: "0.2rem",
    flexShrink: 0,
    backgroundColor: "#181825",
    border: "1px solid #45475a",
    borderRadius: "6px",
    padding: "0.3rem 0.65rem",
  },
  ctaText: {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#89b4fa",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap" as const,
  },
  ctaArrow: {
    fontSize: "0.9rem",
    color: "#89b4fa",
    lineHeight: 1,
  },
  chips: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.3rem",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    backgroundColor: "#181825",
    border: "1px solid #313244",
    borderRadius: "4px",
    padding: "0.12rem 0.45rem",
    fontSize: "0.7rem",
    color: "#a6adc8",
    fontWeight: 500,
  },
  chipYear: {
    color: "#45475a",
    fontSize: "0.66rem",
  },
};
