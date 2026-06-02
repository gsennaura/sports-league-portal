import { useEffect, useState } from "react";
import type { Championship } from "@domain/entities/Championship";
import type { ListChampionships } from "@application/use_cases/ListChampionships";

interface UseChampionshipsResult {
  championships: Championship[];
  loading: boolean;
  error: string | null;
}

export function useChampionships(useCase: ListChampionships): UseChampionshipsResult {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useCase
      .execute()
      .then(setChampionships)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { championships, loading, error };
}
