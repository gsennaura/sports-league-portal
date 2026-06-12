import type { Document } from "@domain/entities/Document";
import type { DocumentRepository } from "@domain/repositories/DocumentRepository";

export class ListDocuments {
  constructor(private readonly repository: DocumentRepository) {}
  execute(leagueId?: string, type?: string): Promise<Document[]> {
    return this.repository.listPublic(leagueId, type);
  }
}
