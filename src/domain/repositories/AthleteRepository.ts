import type {
  Athlete,
  AthleteDetail,
  AthleteStats,
  AthleteTeamHistory,
} from "@domain/entities/Athlete";

export interface CreateAthletePayload {
  name: string;
  birth_date?: string | null;
  cpf?: string | null;
  rg?: string | null;
  nationality?: string | null;
  city_id?: string | null;
  position?: string | null;
  nickname?: string | null;
  preferred_foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  phone?: string | null;
  email?: string | null;
  photo_url?: string | null;
  notes?: string | null;
}

export interface UpdateAthletePayload extends CreateAthletePayload {
  id: string;
}

export interface AddAthleteToTeamPayload {
  team_id: string;
  start_date: string;
  end_date?: string | null;
  jersey_number?: number | null;
  notes?: string | null;
}

export interface RemoveAthleteFromTeamPayload {
  end_date: string;
}

export interface AthleteRepository {
  searchByName(name: string): Promise<Athlete[]>;
  listRandom(limit?: number): Promise<Athlete[]>;
  getDetail(id: string): Promise<AthleteDetail>;
  getStats(id: string): Promise<AthleteStats>;
  create(payload: CreateAthletePayload): Promise<Athlete>;
  update(payload: UpdateAthletePayload): Promise<Athlete>;
  delete(id: string): Promise<void>;
  uploadPhoto(id: string, file: File): Promise<{ photo_url: string }>;

  // Team history
  listTeamHistory(athleteId: string): Promise<AthleteTeamHistory[]>;
  addToTeam(athleteId: string, payload: AddAthleteToTeamPayload): Promise<AthleteTeamHistory>;
  removeFromTeam(athleteId: string, historyId: string, payload: RemoveAthleteFromTeamPayload): Promise<AthleteTeamHistory>;
  listByTeam(teamId: string, activeOnly?: boolean): Promise<AthleteTeamHistory[]>;
}
