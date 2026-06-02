import type {
  Athlete,
  AthleteDetail,
  AthleteStats,
  AthleteTeamHistory,
} from "@domain/entities/Athlete";
import type {
  AddAthleteToTeamPayload,
  AthleteRepository,
  CreateAthletePayload,
  RemoveAthleteFromTeamPayload,
  UpdateAthletePayload,
} from "@domain/repositories/AthleteRepository";
import { authHeaders } from "../authHeaders";

export class ApiAthleteRepository implements AthleteRepository {
  constructor(private readonly baseUrl: string) {}

  // ── Athlete ──────────────────────────────────────────────────────────────

  async searchByName(name: string): Promise<Athlete[]> {
    const params = name ? `?name=${encodeURIComponent(name)}` : "";
    const resp = await fetch(`${this.baseUrl}/athletes${params}`);
    if (!resp.ok) throw new Error(`Falha ao buscar atletas: ${resp.status}`);
    return resp.json() as Promise<Athlete[]>;
  }

  async listRandom(limit: number = 20): Promise<Athlete[]> {
    const resp = await fetch(`${this.baseUrl}/athletes/random?limit=${limit}`);
    if (!resp.ok) throw new Error(`Falha ao carregar atletas: ${resp.status}`);
    return resp.json() as Promise<Athlete[]>;
  }

  async getDetail(id: string): Promise<AthleteDetail> {
    const resp = await fetch(`${this.baseUrl}/athletes/${id}`);
    if (!resp.ok) throw new Error(`Atleta não encontrado: ${resp.status}`);
    return resp.json() as Promise<AthleteDetail>;
  }

  async getStats(id: string): Promise<AthleteStats> {
    const resp = await fetch(`${this.baseUrl}/athletes/${id}/stats`);
    if (!resp.ok) throw new Error(`Erro ao carregar estatísticas: ${resp.status}`);
    return resp.json() as Promise<AthleteStats>;
  }

  async create(payload: CreateAthletePayload): Promise<Athlete> {
    const resp = await fetch(`${this.baseUrl}/athletes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Erro ao criar atleta: ${resp.status}`);
    }
    return resp.json() as Promise<Athlete>;
  }

  async update(payload: UpdateAthletePayload): Promise<Athlete> {
    const { id, ...body } = payload;
    const resp = await fetch(`${this.baseUrl}/athletes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Erro ao atualizar atleta: ${resp.status}`);
    }
    return resp.json() as Promise<Athlete>;
  }

  async delete(id: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/athletes/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Erro ao excluir atleta: ${resp.status}`);
    }
  }

  async uploadPhoto(id: string, file: File): Promise<{ photo_url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const resp = await fetch(`${this.baseUrl}/athletes/${id}/photo`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Erro ao enviar foto: ${resp.status}`);
    }
    return resp.json() as Promise<{ photo_url: string }>;
  }

  // ── Team history ──────────────────────────────────────────────────────────

  async listTeamHistory(athleteId: string): Promise<AthleteTeamHistory[]> {
    const resp = await fetch(`${this.baseUrl}/athletes/${athleteId}/teams`);
    if (!resp.ok) throw new Error(`Falha ao buscar histórico: ${resp.status}`);
    return resp.json() as Promise<AthleteTeamHistory[]>;
  }

  async addToTeam(athleteId: string, payload: AddAthleteToTeamPayload): Promise<AthleteTeamHistory> {
    const resp = await fetch(`${this.baseUrl}/athletes/${athleteId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Erro ao adicionar ao time: ${resp.status}`);
    }
    return resp.json() as Promise<AthleteTeamHistory>;
  }

  async removeFromTeam(
    athleteId: string,
    historyId: string,
    payload: RemoveAthleteFromTeamPayload,
  ): Promise<AthleteTeamHistory> {
    const resp = await fetch(
      `${this.baseUrl}/athletes/${athleteId}/teams/${historyId}/remove`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      },
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Erro ao registrar saída: ${resp.status}`);
    }
    return resp.json() as Promise<AthleteTeamHistory>;
  }

  async listByTeam(teamId: string, activeOnly = false): Promise<AthleteTeamHistory[]> {
    const params = activeOnly ? "?active=true" : "";
    const resp = await fetch(`${this.baseUrl}/teams/${teamId}/athletes${params}`);
    if (!resp.ok) throw new Error(`Falha ao buscar atletas do time: ${resp.status}`);
    return resp.json() as Promise<AthleteTeamHistory[]>;
  }
}
