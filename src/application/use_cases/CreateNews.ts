import type { NewsDetail } from "@domain/entities/News";
import type { NewsRepository, CreateNewsInput } from "@domain/repositories/NewsRepository";

export class CreateNews {
  constructor(private readonly repository: NewsRepository) {}
  execute(input: CreateNewsInput): Promise<NewsDetail> {
    return this.repository.create(input);
  }
}
