import type { ListTeams } from "@application/use_cases/ListTeams";
import { PageLoader } from "@presentation/components/PageLoader";
import { TeamList } from "@presentation/components/TeamList";
import { useTeams } from "@presentation/hooks/useTeams";

interface TeamsPageProps {
  listTeams: ListTeams;
}

export function TeamsPage({ listTeams }: TeamsPageProps) {
  const { teams, loading, error } = useTeams(listTeams);

  const byCity = new Map<string, typeof teams>();
  for (const t of teams) {
    const city = t.city_name || "–";
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city)!.push(t);
  }
  const cities = [...byCity.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>Times</h1>
      {loading && <PageLoader />}
      {error && <p style={styles.error}>{error}</p>}
      {!loading && !error && (
        cities.length === 0
          ? <p style={styles.status}>Nenhum time encontrado.</p>
          : cities.map((city) => (
              <section key={city} style={styles.citySection}>
                <h2 style={styles.cityTitle}>{city}</h2>
                <TeamList teams={byCity.get(city)!} />
              </section>
            ))
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "640px",
    margin: "0 auto",
    padding: "3rem 1.5rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#cdd6f4",
    marginBottom: "2rem",
  },
  citySection: {
    marginBottom: "2.5rem",
  },
  cityTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#89b4fa",
    marginBottom: "0.75rem",
    paddingBottom: "0.4rem",
    borderBottom: "1px solid #313244",
  },
  status: {
    color: "#cdd6f4",
  },
  error: {
    color: "#f38ba8",
  },
};
