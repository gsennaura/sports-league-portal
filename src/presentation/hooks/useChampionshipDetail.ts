import { useCallback, useEffect, useState } from "react";
import type { ChampionshipDetail } from "@domain/entities/ChampionshipDetail";
import type { GetChampionshipDetail } from "@application/use_cases/GetChampionshipDetail";

interface UseChampionshipDetailResult {
  detail: ChampionshipDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChampionshipDetail(
  useCase: GetChampionshipDetail,
  id: string,
  editionId?: string | null
): UseChampionshipDetailResult {
  const [detail, setDetail] = useState<ChampionshipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    useCase
      .execute(id, editionId)
      .then(setDetail)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      })
      .finally(() => setLoading(false));
  }, [id, editionId, tick]);

  return { detail, loading, error, refetch };
}
