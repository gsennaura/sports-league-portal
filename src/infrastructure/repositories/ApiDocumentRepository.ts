import type { Document } from "@domain/entities/Document";
import type { DocumentRepository } from "@domain/repositories/DocumentRepository";

export class ApiDocumentRepository implements DocumentRepository {
  constructor(private readonly baseUrl: string) {}

  async listPublic(leagueId?: string, type?: string): Promise<Document[]> {
    const params = new URLSearchParams();
    if (leagueId) params.set("league_id", leagueId);
    if (type) params.set("type", type);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/documents${qs}`);
    if (!resp.ok) throw new Error(`Falha ao buscar documentos: ${resp.status}`);
    return resp.json() as Promise<Document[]>;
  }
}
