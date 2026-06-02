import { useCallback, useEffect, useState } from "react";
import type { Team } from "@domain/entities/Team";
import type { ListTeams } from "@application/use_cases/ListTeams";

interface UseTeamsResult {
  teams: Team[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTeams(useCase: ListTeams): UseTeamsResult {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    useCase
      .execute()
      .then(setTeams)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      })
      .finally(() => setLoading(false));
  }, [useCase]);

  useEffect(() => {
    load();
  }, [load]);

  return { teams, loading, error, refetch: load };
}
