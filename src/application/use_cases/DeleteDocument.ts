import type { DocumentRepository } from "@domain/repositories/DocumentRepository";

export class DeleteDocument {
  constructor(private readonly repository: DocumentRepository) {}
  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
