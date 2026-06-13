import type { Club } from "@domain/entities/Club";
import type { ClubMatch } from "@domain/entities/ClubMatch";
import type { ClubTitle } from "@domain/entities/ClubTitle";

export interface CreateClubPayload {
  name: string;
  city_id: string;
  president?: string;
  venue_id?: string;
  founded_at?: string;
  nickname?: string;
  acronym?: string;
  linked_institution?: string;
  logo_url?: string;
  site?: string;
}

export interface UpdateClubPayload extends CreateClubPayload {
  id: string;
}

export interface ClubRepository {
  listAll(leagueId?: string): Promise<Club[]>;
  getById(id: string): Promise<Club>;
  getMatches(clubId: string, year?: number): Promise<ClubMatch[]>;
  getTitles(clubId: string): Promise<ClubTitle[]>;
  create(payload: CreateClubPayload): Promise<Club>;
  update(payload: UpdateClubPayload): Promise<Club>;
  uploadLogo(id: string, file: File): Promise<{ logo_url: string }>;
}
