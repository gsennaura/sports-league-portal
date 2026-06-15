import { Link } from "react-router-dom";
import type { UpcomingMatch } from "@domain/entities/UpcomingMatch";

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

interface Props {
  match: UpcomingMatch;
}

export function UpcomingMatchCard({ match }: Props) {
  const hasScore = match.home_score !== null && match.away_score !== null;

  const datePart = match.match_date.split("T")[0] ?? null;
  const dateLabel = datePart
    ? new Date(`${datePart}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;

  const timeLabel = (() => {
    const timePart = match.match_date.includes("T") ? match.match_date.split("T")[1] : null;
    if (!timePart) return null;
    const [h, m] = timePart.split(":");
    return `${h}h${m}`;
  })();

  return (
    <Link to={`/partidas/${match.id}`} style={styles.link}>
      <div style={styles.card}>
        <div style={styles.row}>
          {/* Col 1 — data e hora */}
          <div style={styles.dateCol}>
            {dateLabel && <span style={styles.dateLabel}>{dateLabel}</span>}
            {timeLabel && <span style={styles.timeLabel}>{timeLabel}</span>}
          </div>

          {/* Col 2 — mandante / visitante */}
          <div style={styles.teamsCol}>
            <div style={styles.teamRow}>
              <span style={styles.scoreSlot}>
                {hasScore
                  ? `${match.home_score}${match.home_penalty_score !== null && match.home_penalty_score !== undefined ? ` (${match.home_penalty_score})` : ""}`
                  : ""}
              </span>
              <Shield url={match.home_club_logo_url} />
              <span style={styles.teamName}>{match.home_team_name}</span>
            </div>
            <div style={styles.teamRow}>
              <span style={styles.scoreSlot}>
                {hasScore
                  ? `${match.away_score}${match.away_penalty_score !== null && match.away_penalty_score !== undefined ? ` (${match.away_penalty_score})` : ""}`
                  : ""}
              </span>
              <Shield url={match.away_club_logo_url} />
              <span style={styles.teamName}>{match.away_team_name}</span>
            </div>
          </div>

          {/* Col 3 — estádio */}
          {match.venue_name && (
            <div style={styles.venueCol}>
              <span style={styles.venueLabel}>{match.venue_name}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  link: {
    textDecoration: "none",
    display: "block",
  },
  card: {
    backgroundColor: "var(--c-brand)",
    border: "1px solid var(--c-border)",
    borderRadius: "8px",
    padding: "0.65rem 1rem",
    transition: "border-color 0.15s",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "3.5rem 1fr auto",
    alignItems: "center",
    gap: "0.75rem",
  },
  dateCol: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.15rem",
    flexShrink: 0,
  },
  dateLabel: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#ffffff",
  },
  timeLabel: {
    fontSize: "0.72rem",
    color: "var(--c-link)",
    fontWeight: 600,
  },
  teamsCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    minWidth: 0,
  },
  teamRow: {
    display: "grid",
    gridTemplateColumns: "3rem 20px 1fr",
    alignItems: "center",
    gap: "0.4rem",
  },
  teamName: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "var(--c-text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  scoreSlot: {
    fontSize: "0.92rem",
    fontWeight: 800,
    color: "var(--c-positive)",
    textAlign: "right" as const,
    flexShrink: 0,
  },
  venueCol: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    maxWidth: "7rem",
  },
  venueLabel: {
    fontSize: "0.72rem",
    color: "#a0aec0",
    textAlign: "right" as const,
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
};
