import { useEffect, useState } from "react";
import type { League } from "@domain/entities/League";
import type { ListLeagues } from "@application/use_cases/ListLeagues";

interface UseLeaguesResult {
  leagues: League[];
  loading: boolean;
  error: string | null;
}

export function useLeagues(useCase: ListLeagues): UseLeaguesResult {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useCase
      .execute()
      .then(setLeagues)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { leagues, loading, error };
}
