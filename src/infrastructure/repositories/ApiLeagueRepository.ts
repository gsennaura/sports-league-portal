import type { League } from "@domain/entities/League";
import { authHeaders } from "../authHeaders";
import type { CreateLeaguePayload, UpdateLeaguePayload, LeagueRepository, ClubLeagueRegistration } from "@domain/repositories/LeagueRepository";

type RawLeague = {
  id: string;
  name: string;
  short_name: string;
  city_id: string;
  is_federated: boolean;
  address: string | null;
  president: string | null;
  website: string | null;
  founded_year: number | null;
  parent_league_id: string | null;
  logo_url: string | null;
};

export class ApiLeagueRepository implements LeagueRepository {
  constructor(private readonly baseUrl: string) {}

  async listAll(): Promise<League[]> {
    const [leaguesResp, citiesResp] = await Promise.all([
      fetch(`${this.baseUrl}/leagues`),
      fetch(`${this.baseUrl}/cities`),
    ]);
    if (!leaguesResp.ok) throw new Error(`Falha ao buscar ligas: ${leaguesResp.status}`);

    const leagues = (await leaguesResp.json()) as RawLeague[];
    const cityMap = new Map<string, string>();
    if (citiesResp.ok) {
      const cities = (await citiesResp.json()) as Array<{ id: string; name: string }>;
      for (const c of cities) cityMap.set(c.id, c.name);
    }
    return leagues.map((lg) => ({ ...lg, city_name: cityMap.get(lg.city_id) ?? "–" }));
  }

  async getById(id: string): Promise<League> {
    const [leagueResp, citiesResp] = await Promise.all([
      fetch(`${this.baseUrl}/leagues/${id}`),
      fetch(`${this.baseUrl}/cities`),
    ]);
    if (!leagueResp.ok) throw new Error(`Liga não encontrada: ${leagueResp.status}`);

    const league = (await leagueResp.json()) as RawLeague;
    const cityMap = new Map<string, string>();
    if (citiesResp.ok) {
      const cities = (await citiesResp.json()) as Array<{ id: string; name: string }>;
      for (const c of cities) cityMap.set(c.id, c.name);
    }
    return { ...league, city_name: cityMap.get(league.city_id) ?? "–" };
  }

  async create(payload: CreateLeaguePayload): Promise<League> {
    const response = await fetch(`${this.baseUrl}/leagues`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao criar liga: ${response.status}`);
    }
    const raw = (await response.json()) as RawLeague;
    return { ...raw, city_name: "" };
  }

  async update(payload: UpdateLeaguePayload): Promise<League> {
    const { id, ...body } = payload;
    const response = await fetch(`${this.baseUrl}/leagues/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao atualizar liga: ${response.status}`);
    }
    const raw = (await response.json()) as RawLeague;
    return { ...raw, city_name: "" };
  }

  async listClubsInLeague(leagueId: string): Promise<ClubLeagueRegistration[]> {
    const response = await fetch(`${this.baseUrl}/leagues/${leagueId}/clubs`);
    if (!response.ok) throw new Error(`Erro ao buscar clubes da liga: ${response.status}`);
    return response.json() as Promise<ClubLeagueRegistration[]>;
  }

  async registerClubInLeague(leagueId: string, clubId: string, registrationNumber?: string): Promise<ClubLeagueRegistration> {
    const response = await fetch(`${this.baseUrl}/leagues/${leagueId}/clubs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ club_id: clubId, registration_number: registrationNumber ?? null }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao filiar clube: ${response.status}`);
    }
    return response.json() as Promise<ClubLeagueRegistration>;
  }

  async removeClubFromLeague(leagueId: string, regId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/leagues/${leagueId}/clubs/${regId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response.ok && response.status !== 204) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao remover clube: ${response.status}`);
    }
  }

  async uploadPhoto(leagueId: string, file: File): Promise<{ logo_url: string }> {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${this.baseUrl}/leagues/${leagueId}/photo`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao enviar foto: ${response.status}`);
    }
    return response.json() as Promise<{ logo_url: string }>;
  }
}
