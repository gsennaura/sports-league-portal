import { Link } from "react-router-dom";
import { toSlugPath } from "@utils/slug";
import type { Team } from "@domain/entities/Team";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <li style={styles.card}>
      <Link to={`/times/${toSlugPath(team.name, team.id)}`} style={styles.link}>
        <span style={styles.name}>{team.name}</span>
        <span style={styles.arrow}>→</span>
      </Link>
    </li>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    listStyle: "none",
    background: "#1e1e2e",
    borderRadius: "8px",
    border: "1px solid #313244",
    transition: "border-color 0.15s",
  },
  link: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    textDecoration: "none",
  },
  name: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#cdd6f4",
  },
  arrow: {
    fontSize: "0.9rem",
    color: "#89b4fa",
  },
};
