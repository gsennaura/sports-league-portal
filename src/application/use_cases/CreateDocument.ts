import type { Document } from "@domain/entities/Document";
import type { DocumentRepository, CreateDocumentInput } from "@domain/repositories/DocumentRepository";

export class CreateDocument {
  constructor(private readonly repository: DocumentRepository) {}
  execute(input: CreateDocumentInput): Promise<Document> {
    return this.repository.create(input);
  }
}
