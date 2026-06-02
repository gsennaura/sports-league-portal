import type { Championship } from "@domain/entities/Championship";
import { ChampionshipCard } from "./ChampionshipCard";

interface ChampionshipListProps {
  championships: Championship[];
}

export function ChampionshipList({ championships }: ChampionshipListProps) {
  if (championships.length === 0) {
    return <p style={styles.empty}>Nenhum campeonato cadastrado.</p>;
  }

  return (
    <ul style={styles.list}>
      {championships.map((c) => (
        <ChampionshipCard key={c.id} championship={c} />
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
