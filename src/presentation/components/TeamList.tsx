import type { Team } from "@domain/entities/Team";
import { TeamCard } from "./TeamCard";

interface TeamListProps {
  teams: Team[];
}

export function TeamList({ teams }: TeamListProps) {
  if (teams.length === 0) {
    return <p style={styles.empty}>Nenhum time cadastrado.</p>;
  }

  return (
    <ul style={styles.list}>
      {teams.map((t) => (
        <TeamCard key={t.id} team={t} />
      ))}
    </ul>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    padding: 0,
    margin: 0,
  },
  empty: {
    color: "#cdd6f4",
    textAlign: "center",
    padding: "2rem 0",
  },
};
