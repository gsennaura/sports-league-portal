import type { UpcomingMatch } from "@domain/entities/UpcomingMatch";
import { authHeaders } from "../authHeaders";
import type { MatchDetail } from "@domain/entities/MatchDetail";
import type { HeadToHeadMatch } from "@domain/entities/HeadToHeadMatch";
import type { MatchEvent, MatchEventPayload, MatchEventUpdatePayload } from "@domain/entities/MatchEvent";
import type { MatchRepository, MatchResultPayload, MatchUpdatePayload } from "@domain/repositories/MatchRepository";

export class ApiMatchRepository implements MatchRepository {
  constructor(private readonly baseUrl: string) {}

  async listUpcoming(days = 20): Promise<UpcomingMatch[]> {
    const response = await fetch(`${this.baseUrl}/matches/upcoming?days=${days}`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar próximas partidas: ${response.status}`);
    }
    return response.json() as Promise<UpcomingMatch[]>;
  }

  async listRecent(days = 7): Promise<UpcomingMatch[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const untilDate = yesterday.toISOString().split("T")[0];
    const response = await fetch(`${this.baseUrl}/matches/recent?days=${days}&until_date=${untilDate}`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar últimas partidas: ${response.status}`);
    }
    return response.json() as Promise<UpcomingMatch[]>;
  }

  async getDetail(id: string): Promise<MatchDetail> {
    const response = await fetch(`${this.baseUrl}/matches/${id}`);
    if (!response.ok) {
      throw new Error(`Partida não encontrada: ${response.status}`);
    }
    return response.json() as Promise<MatchDetail>;
  }

  async getHeadToHead(matchId: string): Promise<HeadToHeadMatch[]> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/head-to-head`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar histórico de confrontos: ${response.status}`);
    }
    return response.json() as Promise<HeadToHeadMatch[]>;
  }

  async updateResult(matchId: string, payload: MatchResultPayload): Promise<MatchDetail> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/result`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao salvar resultado: ${response.status}`);
    }
    return response.json() as Promise<MatchDetail>;
  }

  async updateMatch(matchId: string, payload: MatchUpdatePayload): Promise<MatchDetail> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao salvar partida: ${response.status}`);
    }
    return response.json() as Promise<MatchDetail>;
  }

  async getLiveWindow(): Promise<MatchDetail[]> {
    const response = await fetch(`${this.baseUrl}/matches/live`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar partidas ao vivo: ${response.status}`);
    }
    return response.json() as Promise<MatchDetail[]>;
  }

  async addMatchEvent(matchId: string, payload: MatchEventPayload): Promise<MatchEvent> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao adicionar evento: ${response.status}`);
    }
    return response.json() as Promise<MatchEvent>;
  }

  async annulMatchEvent(matchId: string, eventId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/events/${eventId}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao anular evento: ${response.status}`);
    }
  }

  async updateMatchEvent(matchId: string, eventId: string, payload: MatchEventUpdatePayload): Promise<MatchEvent> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao atualizar evento: ${response.status}`);
    }
    return response.json() as Promise<MatchEvent>;
  }
}
