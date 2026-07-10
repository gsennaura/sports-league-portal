import type { Emenda } from "@domain/entities/Emenda";
import type { EmendaRepository, CreateEmendaInput, UpdateEmendaInput } from "@domain/repositories/EmendaRepository";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiEmendaRepository implements EmendaRepository {
  constructor(private readonly baseUrl: string) {}

  async list(leagueId?: string, year?: number): Promise<Emenda[]> {
    const params = new URLSearchParams();
    if (leagueId) params.set("league_id", leagueId);
    if (typeof year === "number") params.set("year", String(year));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/emendas${qs}`);
    if (!resp.ok) throw new Error(`Erro ao listar emendas: ${resp.status}`);
    return resp.json() as Promise<Emenda[]>;
  }

  async adminListAll(leagueId?: string, year?: number): Promise<Emenda[]> {
    const params = new URLSearchParams();
    if (leagueId) params.set("league_id", leagueId);
    if (year) params.set("year", String(year));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/emendas/admin/all${qs}`, { headers: authHeaders() });
    if (!resp.ok) throw new Error(`Erro ao listar emendas: ${resp.status}`);
    return resp.json() as Promise<Emenda[]>;
  }

  async adminGetById(id: string): Promise<Emenda> {
    const resp = await fetch(`${this.baseUrl}/emendas/admin/${encodeURIComponent(id)}`, { headers: authHeaders() });
    if (!resp.ok) throw new Error(`Emenda não encontrada: ${resp.status}`);
    return resp.json() as Promise<Emenda>;
  }

  async create(input: CreateEmendaInput): Promise<Emenda> {
    const resp = await fetch(`${this.baseUrl}/emendas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
    });
    if (!resp.ok) throw new Error(`Erro ao criar emenda: ${resp.status}`);
    return resp.json() as Promise<Emenda>;
  }

  async update(input: UpdateEmendaInput): Promise<Emenda> {
    const { id, ...body } = input;
    const resp = await fetch(`${this.baseUrl}/emendas/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`Erro ao atualizar emenda: ${resp.status}`);
    return resp.json() as Promise<Emenda>;
  }

  async delete(id: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/emendas/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!resp.ok) throw new Error(`Erro ao excluir emenda: ${resp.status}`);
  }

  async uploadFile(id: string, file: File): Promise<Emenda> {
    const form = new FormData();
    form.append("file", file);
    const resp = await fetch(`${this.baseUrl}/emendas/${encodeURIComponent(id)}/file`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!resp.ok) throw new Error(`Erro no upload: ${resp.status}`);
    return resp.json() as Promise<Emenda>;
  }
}
