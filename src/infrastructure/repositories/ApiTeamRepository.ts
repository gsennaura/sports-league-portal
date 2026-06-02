import type { Team } from "@domain/entities/Team";
import { authHeaders } from "../authHeaders";
import type { TeamMatch } from "@domain/entities/TeamMatch";
import type { CreateTeamPayload, UpdateTeamPayload, TeamRepository } from "@domain/repositories/TeamRepository";
import type { TeamAthleteStat } from "@domain/entities/Athlete";

type RawTeam = {
  id: string;
  name: string;
  city_id: string;
  sport_id: string;
  venue_id: string | null;
  president: string | null;
  founded_at: string | null;
  club_id: string | null;
  category: string | null;
};

type RawClub = { id: string; name: string; nickname: string | null; logo_url: string | null };

export class ApiTeamRepository implements TeamRepository {
  constructor(private readonly baseUrl: string) {}

  async listAll(): Promise<Team[]> {
    const [teamsResp, citiesResp, venuesResp, clubsResp, sportsResp] = await Promise.all([
      fetch(`${this.baseUrl}/teams`),
      fetch(`${this.baseUrl}/cities`),
      fetch(`${this.baseUrl}/venues`),
      fetch(`${this.baseUrl}/clubs`),
      fetch(`${this.baseUrl}/sports`),
    ]);
    if (!teamsResp.ok) {
      throw new Error(`Falha ao buscar times: ${teamsResp.status}`);
    }
    const teams = await teamsResp.json() as RawTeam[];
    const cityMap = new Map<string, string>();
    if (citiesResp.ok) {
      const cities = await citiesResp.json() as Array<{ id: string; name: string }>;
      for (const c of cities) cityMap.set(c.id, c.name);
    }
    const venueMap = new Map<string, string>();
    if (venuesResp.ok) {
      const venues = await venuesResp.json() as Array<{ id: string; name: string; nickname: string | null }>;
      for (const v of venues) venueMap.set(v.id, v.nickname ?? v.name);
    }
    const clubMap = new Map<string, { name: string; logo_url: string | null }>();
    if (clubsResp.ok) {
      const clubs = await clubsResp.json() as RawClub[];
      for (const c of clubs) clubMap.set(c.id, { name: c.name, logo_url: c.logo_url ?? null });
    }
    const sportMap = new Map<string, string>();
    if (sportsResp.ok) {
      const sports = await sportsResp.json() as Array<{ id: string; name: string }>;
      for (const s of sports) sportMap.set(s.id, s.name);
    }
    return teams.map((t) => {
      const clubData = t.club_id ? (clubMap.get(t.club_id) ?? null) : null;
      return {
        ...t,
        city_name: cityMap.get(t.city_id) ?? "–",
        venue_name: t.venue_id ? (venueMap.get(t.venue_id) ?? null) : null,
        club_name: clubData?.name ?? null,
        club_logo_url: clubData?.logo_url ?? null,
        sport_name: sportMap.get(t.sport_id) ?? null,
      };
    });
  }

  async listByClub(clubId: string): Promise<Team[]> {
    const resp = await fetch(`${this.baseUrl}/teams?club_id=${clubId}`);
    if (!resp.ok) return [];
    const teams = await resp.json() as Array<RawTeam & { sport_name?: string }>;
    return teams.map((t) => ({
      ...t,
      city_name: "",
      sport_name: t.sport_name ?? null,
      venue_name: null,
      club_name: null,
      club_logo_url: null,
    }));
  }

  async create(payload: CreateTeamPayload): Promise<Team> {
    const response = await fetch(`${this.baseUrl}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Falha ao cadastrar time: ${response.status}`);
    }
    const raw = await response.json() as RawTeam;
    return { ...raw, city_name: "", sport_name: null, venue_name: null, club_name: null, club_logo_url: null };
  }

  async update(payload: UpdateTeamPayload): Promise<Team> {
    const response = await fetch(`${this.baseUrl}/teams/${payload.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        name: payload.name,
        sport_id: payload.sport_id,
        city_id: payload.city_id,
        club_id: payload.club_id ?? null,
        category: payload.category ?? null,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Falha ao atualizar time: ${response.status}`);
    }
    const raw = await response.json() as RawTeam;
    return { ...raw, city_name: "", sport_name: null, venue_name: null, club_name: null, club_logo_url: null };
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/teams/${id}`, { method: "DELETE", headers: { ...authHeaders() } });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Falha ao excluir time: ${response.status}`);
    }
  }

  async getMatches(teamId: string, year?: number): Promise<TeamMatch[]> {
    const url = year != null
      ? `${this.baseUrl}/teams/${teamId}/matches?year=${year}`
      : `${this.baseUrl}/teams/${teamId}/matches`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao buscar partidas do time: ${response.status}`);
    return response.json() as Promise<TeamMatch[]>;
  }

  async getMatchYears(teamId: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}/match-years`);
    if (!response.ok) return [];
    return response.json() as Promise<number[]>;
  }

  async getDetail(id: string): Promise<Team> {
    const [teamResp, citiesResp, venuesResp, clubsResp] = await Promise.all([
      fetch(`${this.baseUrl}/teams/${id}`),
      fetch(`${this.baseUrl}/cities`),
      fetch(`${this.baseUrl}/venues`),
      fetch(`${this.baseUrl}/clubs`),
    ]);
    if (!teamResp.ok) throw new Error(`Time não encontrado: ${teamResp.status}`);
    const team = await teamResp.json() as RawTeam;
    const cityMap = new Map<string, string>();
    if (citiesResp.ok) {
      const cities = await citiesResp.json() as Array<{ id: string; name: string }>;
      for (const c of cities) cityMap.set(c.id, c.name);
    }
    const venueMap = new Map<string, string>();
    if (venuesResp.ok) {
      const venues = await venuesResp.json() as Array<{ id: string; name: string; nickname: string | null }>;
      for (const v of venues) venueMap.set(v.id, v.nickname ?? v.name);
    }
    const clubMap = new Map<string, { name: string; logo_url: string | null }>();
    if (clubsResp.ok) {
      const clubs = await clubsResp.json() as RawClub[];
      for (const c of clubs) clubMap.set(c.id, { name: c.name, logo_url: c.logo_url ?? null });
    }
    const clubData = team.club_id ? (clubMap.get(team.club_id) ?? null) : null;
    return {
      ...team,
      city_name: cityMap.get(team.city_id) ?? "–",
      sport_name: null,
      venue_name: team.venue_id ? (venueMap.get(team.venue_id) ?? null) : null,
      club_name: clubData?.name ?? null,
      club_logo_url: clubData?.logo_url ?? null,
    };
  }

  async getAthletesStats(teamId: string): Promise<TeamAthleteStat[]> {
    const resp = await fetch(`${this.baseUrl}/teams/${teamId}/athletes/stats`);
    if (!resp.ok) throw new Error(`Erro ao carregar stats do time: ${resp.status}`);
    return resp.json() as Promise<TeamAthleteStat[]>;
  }
}
