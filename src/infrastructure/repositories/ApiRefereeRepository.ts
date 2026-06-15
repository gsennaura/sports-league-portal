import type { Referee } from "@domain/entities/Referee";
import type { RefereeMatch } from "@domain/entities/RefereeMatch";
import type { RefereeRepository, CreateRefereeInput, UpdateRefereeInput } from "@domain/repositories/RefereeRepository";
import { authHeaders } from "../authHeaders";

export class ApiRefereeRepository implements RefereeRepository {
  constructor(private readonly baseUrl: string) {}

  async listAll(name?: string, leagueId?: string): Promise<Referee[]> {
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (leagueId) params.set("league_id", leagueId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/referees${qs}`);
    if (!resp.ok) throw new Error(`Falha ao buscar árbitros: ${resp.status}`);
    return resp.json() as Promise<Referee[]>;
  }

  async getById(id: string): Promise<Referee> {
    const resp = await fetch(`${this.baseUrl}/referees/${id}`);
    if (!resp.ok) throw new Error(`Árbitro não encontrado: ${resp.status}`);
    return resp.json() as Promise<Referee>;
  }

  async create(input: CreateRefereeInput): Promise<Referee> {
    const resp = await fetch(`${this.baseUrl}/referees`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao criar árbitro: ${resp.status}`);
    }
    return resp.json() as Promise<Referee>;
  }

  async update(input: UpdateRefereeInput): Promise<Referee> {
    const { id, ...body } = input;
    const resp = await fetch(`${this.baseUrl}/referees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao atualizar árbitro: ${resp.status}`);
    }
    return resp.json() as Promise<Referee>;
  }

  async delete(id: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/referees/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao excluir árbitro: ${resp.status}`);
    }
  }

  async uploadPhoto(id: string, file: File): Promise<{ photo_url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const resp = await fetch(`${this.baseUrl}/referees/${id}/photo`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao enviar foto: ${resp.status}`);
    }
    return resp.json() as Promise<{ photo_url: string }>;
  }

  async getMatchesByReferee(refereeId: string): Promise<RefereeMatch[]> {
    const resp = await fetch(`${this.baseUrl}/referees/${refereeId}/matches`);
    if (!resp.ok) throw new Error(`Erro ao buscar partidas: ${resp.status}`);
    return resp.json() as Promise<RefereeMatch[]>;
  }
}
