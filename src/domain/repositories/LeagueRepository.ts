import type { League } from "@domain/entities/League";

export interface ClubLeagueRegistration {
  id: string;
  club_id: string;
  league_id: string;
  club_name: string | null;
  club_nickname: string | null;
  registration_number: string | null;
  is_active: boolean;
  registered_at: string | null;
}

export interface CreateLeaguePayload {
  name: string;
  short_name: string;
  city_id: string;
  is_federated?: boolean;
  address?: string;
  president?: string;
  website?: string;
  founded_year?: number;
  parent_league_id?: string;
}

export interface UpdateLeaguePayload extends CreateLeaguePayload {
  id: string;
}

export interface LeagueRepository {
  listAll(): Promise<League[]>;
  getById(id: string): Promise<League>;
  create(payload: CreateLeaguePayload): Promise<League>;
  update(payload: UpdateLeaguePayload): Promise<League>;
  listClubsInLeague(leagueId: string): Promise<ClubLeagueRegistration[]>;
  registerClubInLeague(leagueId: string, clubId: string, registrationNumber?: string): Promise<ClubLeagueRegistration>;
  removeClubFromLeague(leagueId: string, regId: string): Promise<void>;
  uploadPhoto(leagueId: string, file: File): Promise<{ logo_url: string }>;
}
