import type { NewsListItem, NewsDetail } from "../entities/News";

export interface NewsRepository {
  listPublic(leagueId?: string, limit?: number): Promise<NewsListItem[]>;
  getById(id: string): Promise<NewsDetail>;
}
