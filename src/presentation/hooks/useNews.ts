import { useState, useEffect } from "react";
import type { NewsListItem } from "@domain/entities/News";
import type { ListNews } from "@application/use_cases/ListNews";

export function useNews(listNews: ListNews, leagueId?: string, limit?: number) {
  const [news, setNews] = useState<NewsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listNews.execute(leagueId, limit)
      .then(setNews)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar notícias."))
      .finally(() => setLoading(false));
  }, [listNews, leagueId, limit]);

  return { news, loading, error };
}
