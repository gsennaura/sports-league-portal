import type { Document } from "@domain/entities/Document";
import type { DocumentRepository } from "@domain/repositories/DocumentRepository";

export class ListDocuments {
  constructor(private readonly repository: DocumentRepository) {}
  execute(leagueId?: string, type?: string, admin = false): Promise<Document[]> {
    return admin
      ? this.repository.adminListAll(leagueId, type)
      : this.repository.list(leagueId, type);
  }
}
