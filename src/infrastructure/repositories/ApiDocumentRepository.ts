import type { Document } from "@domain/entities/Document";
import type { DocumentRepository, CreateDocumentInput, UpdateDocumentInput } from "@domain/repositories/DocumentRepository";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiDocumentRepository implements DocumentRepository {
  constructor(private readonly baseUrl: string) {}

  async list(leagueId?: string, type?: string): Promise<Document[]> {
    const params = new URLSearchParams();
    if (leagueId) params.set("league_id", leagueId);
    if (type) params.set("type", type);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/documents${qs}`);
    if (!resp.ok) throw new Error(`Erro ao listar documentos: ${resp.status}`);
    return resp.json() as Promise<Document[]>;
  }

  async adminListAll(leagueId?: string, type?: string): Promise<Document[]> {
    const params = new URLSearchParams();
    if (leagueId) params.set("league_id", leagueId);
    if (type) params.set("type", type);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/documents/admin/all${qs}`, {
      headers: authHeaders(),
    });
    if (!resp.ok) throw new Error(`Erro ao listar documentos: ${resp.status}`);
    return resp.json() as Promise<Document[]>;
  }

  async adminGetById(id: string): Promise<Document> {
    const resp = await fetch(`${this.baseUrl}/documents/admin/${encodeURIComponent(id)}`, {
      headers: authHeaders(),
    });
    if (!resp.ok) throw new Error(`Documento não encontrado: ${resp.status}`);
    return resp.json() as Promise<Document>;
  }

  async create(input: CreateDocumentInput): Promise<Document> {
    const resp = await fetch(`${this.baseUrl}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
    });
    if (!resp.ok) throw new Error(`Erro ao criar documento: ${resp.status}`);
    return resp.json() as Promise<Document>;
  }

  async update(input: UpdateDocumentInput): Promise<Document> {
    const { id, ...body } = input;
    const resp = await fetch(`${this.baseUrl}/documents/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`Erro ao atualizar documento: ${resp.status}`);
    return resp.json() as Promise<Document>;
  }

  async delete(id: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/documents/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!resp.ok) throw new Error(`Erro ao excluir documento: ${resp.status}`);
  }

  async uploadFile(id: string, file: File): Promise<Document> {
    const form = new FormData();
    form.append("file", file);
    const resp = await fetch(`${this.baseUrl}/documents/${encodeURIComponent(id)}/file`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!resp.ok) throw new Error(`Erro no upload: ${resp.status}`);
    return resp.json() as Promise<Document>;
  }
}
