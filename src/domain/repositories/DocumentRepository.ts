import type { Document, DocumentType } from "../entities/Document";

export interface CreateDocumentInput {
  title: string;
  type: DocumentType;
  description: string | null;
  file_url: string | null;
  external_url: string | null;
  league_id: string | null;
  is_published: boolean;
}

export interface UpdateDocumentInput extends CreateDocumentInput {
  id: string;
}

export interface DocumentRepository {
  list(leagueId?: string, type?: string): Promise<Document[]>;
  adminListAll(leagueId?: string, type?: string): Promise<Document[]>;
  adminGetById(id: string): Promise<Document>;
  create(input: CreateDocumentInput): Promise<Document>;
  update(input: UpdateDocumentInput): Promise<Document>;
  delete(id: string): Promise<void>;
  uploadFile(id: string, file: File): Promise<Document>;
}
