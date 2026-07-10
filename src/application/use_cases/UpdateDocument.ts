import type { Document } from "@domain/entities/Document";
import type { DocumentRepository, UpdateDocumentInput } from "@domain/repositories/DocumentRepository";

export class UpdateDocument {
  constructor(private readonly repository: DocumentRepository) {}
  execute(input: UpdateDocumentInput): Promise<Document> {
    return this.repository.update(input);
  }
}
