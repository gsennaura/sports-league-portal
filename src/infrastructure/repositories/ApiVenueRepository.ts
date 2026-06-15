import type { Venue } from "@domain/entities/Venue";
import type { ClubMatch } from "@domain/entities/ClubMatch";
import { authHeaders } from "../authHeaders";
import type { CreateVenuePayload, UpdateVenuePayload, VenueRepository } from "@domain/repositories/VenueRepository";

export class ApiVenueRepository implements VenueRepository {
  constructor(private readonly baseUrl: string) {}

  async create(payload: CreateVenuePayload): Promise<Venue> {
    const response = await fetch(`${this.baseUrl}/venues`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao criar estádio: ${response.status}`);
    }
    return response.json() as Promise<Venue>;
  }

  async update(payload: UpdateVenuePayload): Promise<Venue> {
    const { id, ...body } = payload;
    const response = await fetch(`${this.baseUrl}/venues/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao atualizar local: ${response.status}`);
    }
    return response.json() as Promise<Venue>;
  }

  async getById(id: string): Promise<Venue | null> {
    const response = await fetch(`${this.baseUrl}/venues/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Falha ao buscar local: ${response.status}`);
    return response.json() as Promise<Venue>;
  }

  async listAll(leagueId?: string): Promise<Venue[]> {
    const qs = leagueId ? `?league_id=${encodeURIComponent(leagueId)}` : "";
    const response = await fetch(`${this.baseUrl}/venues${qs}`);
    if (!response.ok) throw new Error(`Falha ao buscar locais: ${response.status}`);
    return response.json() as Promise<Venue[]>;
  }

  async getMatches(venueId: string): Promise<ClubMatch[]> {
    const response = await fetch(`${this.baseUrl}/venues/${venueId}/matches`);
    if (!response.ok) throw new Error(`Falha ao buscar partidas do local: ${response.status}`);
    const raw = await response.json() as Array<Record<string, unknown>>;
    return raw.map((m) => ({
      match_id: m["id"] as string,
      match_date: m["match_date"] as string | null,
      home_team_id: m["home_team_id"] as string,
      home_team_name: m["home_team_name"] as string,
      home_team_category: m["home_team_category"] as string | null,
      away_team_id: m["away_team_id"] as string,
      away_team_name: m["away_team_name"] as string,
      away_team_category: m["away_team_category"] as string | null,
      home_score: m["home_score"] as number | null,
      away_score: m["away_score"] as number | null,
      home_penalty_score: m["home_penalty_score"] as number | null,
      away_penalty_score: m["away_penalty_score"] as number | null,
      championship_id: m["championship_id"] as string,
      championship_name: m["championship_name"] as string,
      phase_name: m["phase_name"] as string,
      phase_type: m["phase_type"] as string,
      venue_name: m["venue_name"] as string | null,
      home_club_logo_url: (m["home_club_logo_url"] as string | null) ?? null,
      away_club_logo_url: (m["away_club_logo_url"] as string | null) ?? null,
    }));
  }

  async uploadPhoto(venueId: string, file: File): Promise<{ photo_url: string }> {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${this.baseUrl}/venues/${venueId}/photo`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao enviar foto: ${response.status}`);
    }
    return response.json() as Promise<{ photo_url: string }>;
  }
}
