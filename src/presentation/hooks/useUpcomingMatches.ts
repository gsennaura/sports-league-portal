import { useEffect, useState } from "react";
import type { UpcomingMatch } from "@domain/entities/UpcomingMatch";
import type { GetUpcomingMatches } from "@application/use_cases/GetUpcomingMatches";

interface UseUpcomingMatchesResult {
  matches: UpcomingMatch[];
  loading: boolean;
  error: string | null;
}

export function useUpcomingMatches(useCase: GetUpcomingMatches, days = 20): UseUpcomingMatchesResult {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useCase
      .execute(days)
      .then(setMatches)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { matches, loading, error };
}
