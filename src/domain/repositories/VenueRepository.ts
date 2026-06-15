import type { Venue } from "@domain/entities/Venue";
import type { ClubMatch } from "@domain/entities/ClubMatch";

export interface CreateVenuePayload {
  name: string;
  city_id: string;
  nickname?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateVenuePayload extends CreateVenuePayload {
  id: string;
}

export interface VenueRepository {
  create(payload: CreateVenuePayload): Promise<Venue>;
  update(payload: UpdateVenuePayload): Promise<Venue>;
  getById(id: string): Promise<Venue | null>;
  listAll(leagueId?: string): Promise<Venue[]>;
  getMatches(venueId: string): Promise<ClubMatch[]>;
  uploadPhoto(venueId: string, file: File): Promise<{ photo_url: string }>;
}
