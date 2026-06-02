import { useEffect, useState } from "react";
import type { UpcomingMatch } from "@domain/entities/UpcomingMatch";
import type { GetRecentMatches } from "@application/use_cases/GetRecentMatches";

interface UseRecentMatchesResult {
  matches: UpcomingMatch[];
  loading: boolean;
  error: string | null;
}

export function useRecentMatches(useCase: GetRecentMatches, days = 7): UseRecentMatchesResult {
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
