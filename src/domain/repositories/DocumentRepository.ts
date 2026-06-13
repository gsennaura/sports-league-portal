import type { Document } from "../entities/Document";

export interface DocumentRepository {
  listPublic(leagueId?: string, type?: string): Promise<Document[]>;
}
