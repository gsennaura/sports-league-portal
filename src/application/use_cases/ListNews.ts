import type { NewsListItem } from "@domain/entities/News";
import type { NewsRepository } from "@domain/repositories/NewsRepository";

export class ListNews {
  constructor(private readonly repository: NewsRepository) {}
  execute(leagueId?: string, limitOrAdmin?: number | boolean): Promise<NewsListItem[]> {
    if (typeof limitOrAdmin === "boolean") {
      return limitOrAdmin
        ? this.repository.adminListAll(leagueId)
        : this.repository.list(leagueId);
    }
    return this.repository.list(leagueId, limitOrAdmin);
  }
}
