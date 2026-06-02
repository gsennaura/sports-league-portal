import type { AthleteChampionshipRegistration } from "@domain/entities/Athlete";
import type {
  ChampionshipRegistrationRepository,
  RegisterInChampionshipPayload,
  UpdateRegistrationStatusPayload,
} from "@domain/repositories/ChampionshipRegistrationRepository";
import { authHeaders } from "../authHeaders";

export class ApiChampionshipRegistrationRepository
  implements ChampionshipRegistrationRepository
{
  constructor(private readonly baseUrl: string) {}

  async listByAthlete(athleteId: string): Promise<AthleteChampionshipRegistration[]> {
    const resp = await fetch(
      `${this.baseUrl}/athletes/${athleteId}/championship-registrations`,
    );
    if (!resp.ok) throw new Error(`Erro ao buscar inscrições: ${resp.status}`);
    return resp.json() as Promise<AthleteChampionshipRegistration[]>;
  }

  async listByEdition(
    editionId: string,
    teamId?: string,
  ): Promise<AthleteChampionshipRegistration[]> {
    const qs = teamId ? `?team_id=${teamId}` : "";
    const resp = await fetch(
      `${this.baseUrl}/championship-editions/${editionId}/registrations${qs}`,
      { headers: authHeaders() },
    );
    if (!resp.ok) throw new Error(`Erro ao buscar inscrições da edição: ${resp.status}`);
    return resp.json() as Promise<AthleteChampionshipRegistration[]>;
  }

  async listEligibleAthleteIds(editionId: string, teamId: string): Promise<string[]> {
    const resp = await fetch(
      `${this.baseUrl}/championship-editions/${editionId}/eligible-athletes?team_id=${teamId}`,
      { headers: authHeaders() },
    );
    if (!resp.ok) throw new Error(`Erro ao buscar atletas elegíveis: ${resp.status}`);
    const data = (await resp.json()) as { athlete_ids: string[] };
    return data.athlete_ids;
  }

  async register(
    editionId: string,
    payload: RegisterInChampionshipPayload,
  ): Promise<AthleteChampionshipRegistration> {
    const resp = await fetch(
      `${this.baseUrl}/championship-editions/${editionId}/registrations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      },
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(
        (err as { detail?: string }).detail ?? `Erro ao inscrever atleta: ${resp.status}`,
      );
    }
    return resp.json() as Promise<AthleteChampionshipRegistration>;
  }

  async updateStatus(
    editionId: string,
    regId: string,
    payload: UpdateRegistrationStatusPayload,
  ): Promise<AthleteChampionshipRegistration> {
    const resp = await fetch(
      `${this.baseUrl}/championship-editions/${editionId}/registrations/${regId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      },
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(
        (err as { detail?: string }).detail ??
          `Erro ao atualizar inscrição: ${resp.status}`,
      );
    }
    return resp.json() as Promise<AthleteChampionshipRegistration>;
  }

  async cancel(editionId: string, regId: string): Promise<void> {
    const resp = await fetch(
      `${this.baseUrl}/championship-editions/${editionId}/registrations/${regId}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(
        (err as { detail?: string }).detail ?? `Erro ao cancelar inscrição: ${resp.status}`,
      );
    }
  }

  async checkAthleteMatchEvents(
    editionId: string,
    athleteId: string,
  ): Promise<{ has_events: boolean; event_count: number }> {
    const resp = await fetch(
      `${this.baseUrl}/championship-editions/${editionId}/athletes/${athleteId}/has-match-events`,
      { headers: authHeaders() },
    );
    if (!resp.ok) throw new Error(`Erro ao verificar eventos: ${resp.status}`);
    return resp.json() as Promise<{ has_events: boolean; event_count: number }>;
  }
}
