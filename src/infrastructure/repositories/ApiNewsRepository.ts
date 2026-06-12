import type { NewsListItem, NewsDetail } from "@domain/entities/News";
import type { NewsRepository } from "@domain/repositories/NewsRepository";

export class ApiNewsRepository implements NewsRepository {
  constructor(private readonly baseUrl: string) {}

  async listPublic(leagueId?: string, limit?: number): Promise<NewsListItem[]> {
    const params = new URLSearchParams();
    if (leagueId) params.set("league_id", leagueId);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/news${qs}`);
    if (!resp.ok) throw new Error(`Falha ao buscar notícias: ${resp.status}`);
    return resp.json() as Promise<NewsListItem[]>;
  }

  async getById(id: string): Promise<NewsDetail> {
    const resp = await fetch(`${this.baseUrl}/news/${encodeURIComponent(id)}`);
    if (!resp.ok) throw new Error(`Notícia não encontrada: ${resp.status}`);
    return resp.json() as Promise<NewsDetail>;
  }
}
