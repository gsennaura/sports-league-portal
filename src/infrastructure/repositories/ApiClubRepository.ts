import type { Club } from "@domain/entities/Club";
import { authHeaders } from "../authHeaders";
import type { ClubMatch } from "@domain/entities/ClubMatch";
import type { ClubTitle } from "@domain/entities/ClubTitle";
import type { ClubRepository, CreateClubPayload, UpdateClubPayload } from "@domain/repositories/ClubRepository";

type RawClub = {
  id: string;
  name: string;
  city_id: string;
  president: string | null;
  venue_id: string | null;
  founded_at: string | null;
  nickname: string | null;
  acronym: string | null;
  linked_institution: string | null;
  logo_url: string | null;
};

type RawMatch = {
  id: string;
  match_date: string | null;
  home_team_id: string;
  home_team_name: string;
  home_team_category: string | null;
  away_team_id: string;
  away_team_name: string;
  away_team_category: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
  championship_id: string;
  championship_name: string;
  phase_name: string;
  phase_type: string;
  venue_name: string | null;
  home_club_logo_url: string | null;
  away_club_logo_url: string | null;
};

export class ApiClubRepository implements ClubRepository {
  constructor(private readonly baseUrl: string) {}

  async listAll(): Promise<Club[]> {
    const clubsResp = await fetch(`${this.baseUrl}/clubs`);
    if (!clubsResp.ok) throw new Error(`Falha ao buscar clubes: ${clubsResp.status}`);
    const clubs = await clubsResp.json() as Array<RawClub & { city_name?: string; venue_name?: string }>;
    return clubs.map((c) => ({
      ...c,
      city_name: c.city_name ?? "–",
      venue_name: c.venue_name ?? null,
      logo_url: c.logo_url ?? null,
    }));
  }

  async getById(id: string): Promise<Club> {
    const clubResp = await fetch(`${this.baseUrl}/clubs/${id}`);
    if (!clubResp.ok) throw new Error(`Clube não encontrado: ${clubResp.status}`);
    const club = await clubResp.json() as RawClub & { city_name?: string; venue_name?: string };
    return {
      ...club,
      city_name: club.city_name ?? "–",
      venue_name: club.venue_name ?? null,
      logo_url: club.logo_url ?? null,
    };
  }

  async getMatches(clubId: string, year?: number): Promise<ClubMatch[]> {
    // Construir URL com parâmetro year se fornecido
    let url = `${this.baseUrl}/matches/club/${clubId}`;
    if (year) {
      url += `?year=${year}`;
    }

    const matchesResp = await fetch(url);

    if (!matchesResp.ok) {
      throw new Error(`Falha ao buscar jogos do clube: ${matchesResp.status}`);
    }

    const matches = await matchesResp.json() as RawMatch[];

    return matches.map((match) => ({
      match_id: match.id,
      match_date: match.match_date,
      home_team_id: match.home_team_id,
      home_team_name: match.home_team_name,
      home_team_category: match.home_team_category,
      away_team_id: match.away_team_id,
      away_team_name: match.away_team_name, 
      away_team_category: match.away_team_category,
      home_score: match.home_score,
      away_score: match.away_score,
      home_penalty_score: match.home_penalty_score,
      away_penalty_score: match.away_penalty_score,
      championship_id: match.championship_id,
      championship_name: match.championship_name,
      phase_name: match.phase_name,
      phase_type: match.phase_type,
      venue_name: match.venue_name,
      home_club_logo_url: match.home_club_logo_url ?? null,
      away_club_logo_url: match.away_club_logo_url ?? null,
    } satisfies ClubMatch));
  }

  async getTitles(clubId: string): Promise<ClubTitle[]> {
    const resp = await fetch(`${this.baseUrl}/clubs/${clubId}/titles`);
    if (!resp.ok) throw new Error(`Falha ao buscar títulos: ${resp.status}`);
    return resp.json() as Promise<ClubTitle[]>;
  }

  async create(payload: CreateClubPayload): Promise<Club> {
    const response = await fetch(`${this.baseUrl}/clubs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao criar clube: ${response.status}`);
    }
    const raw = await response.json() as RawClub;
    return { ...raw, city_name: "", venue_name: null };
  }

  async update(payload: UpdateClubPayload): Promise<Club> {
    const { id, ...body } = payload;
    const response = await fetch(`${this.baseUrl}/clubs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao atualizar clube: ${response.status}`);
    }
    const raw = await response.json() as RawClub;
    return { ...raw, city_name: "", venue_name: null };
  }

  async uploadLogo(id: string, file: File): Promise<{ logo_url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const resp = await fetch(`${this.baseUrl}/clubs/${id}/logo`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Erro ao enviar logo: ${resp.status}`);
    }
    return resp.json() as Promise<{ logo_url: string }>;
  }
}
