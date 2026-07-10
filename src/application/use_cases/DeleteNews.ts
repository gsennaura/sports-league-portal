import type { NewsRepository } from "@domain/repositories/NewsRepository";

export class DeleteNews {
  constructor(private readonly repository: NewsRepository) {}
  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
