import type { NewsDetail } from "@domain/entities/News";
import type { NewsRepository } from "@domain/repositories/NewsRepository";

export class GetNewsDetail {
  constructor(private readonly repository: NewsRepository) {}
  execute(id: string): Promise<NewsDetail> {
    return this.repository.getById(id);
  }
}
