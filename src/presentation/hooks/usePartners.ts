import { useState, useEffect } from "react";
import type { Partner } from "@domain/entities/Partner";
import type { ListPartners } from "@application/use_cases/ListPartners";

export function usePartners(listPartners: ListPartners, leagueId?: string) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listPartners
      .execute(leagueId)
      .then(setPartners)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar parceiros."))
      .finally(() => setLoading(false));
  }, [listPartners, leagueId]);

  return { partners, loading, error };
}
