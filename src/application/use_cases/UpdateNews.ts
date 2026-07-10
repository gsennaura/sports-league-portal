import type { NewsDetail } from "@domain/entities/News";
import type { NewsRepository, UpdateNewsInput } from "@domain/repositories/NewsRepository";

export class UpdateNews {
  constructor(private readonly repository: NewsRepository) {}
  execute(input: UpdateNewsInput): Promise<NewsDetail> {
    return this.repository.update(input);
  }
}
