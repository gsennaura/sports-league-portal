import type { NewsListItem } from "@domain/entities/News";
import type { NewsRepository } from "@domain/repositories/NewsRepository";

export class ListNews {
  constructor(private readonly repository: NewsRepository) {}
  execute(leagueId?: string, limit?: number): Promise<NewsListItem[]> {
    return this.repository.listPublic(leagueId, limit);
  }
}
