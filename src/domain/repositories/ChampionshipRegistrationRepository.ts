import type { AthleteChampionshipRegistration } from "@domain/entities/Athlete";

export interface RegisterInChampionshipPayload {
  athlete_id: string;
  team_id: string;
  registration_number?: string | null;
  notes?: string | null;
  document_url?: string | null;
}

export interface UpdateRegistrationStatusPayload {
  status: "pending" | "approved" | "rejected" | "withdrawn";
  notes?: string | null;
}

export interface ChampionshipRegistrationRepository {
  listByAthlete(athleteId: string): Promise<AthleteChampionshipRegistration[]>;
  listByEdition(
    editionId: string,
    teamId?: string,
  ): Promise<AthleteChampionshipRegistration[]>;
  listEligibleAthleteIds(editionId: string, teamId: string): Promise<string[]>;
  register(
    editionId: string,
    payload: RegisterInChampionshipPayload,
  ): Promise<AthleteChampionshipRegistration>;
  updateStatus(
    editionId: string,
    regId: string,
    payload: UpdateRegistrationStatusPayload,
  ): Promise<AthleteChampionshipRegistration>;
  cancel(editionId: string, regId: string): Promise<void>;
  checkAthleteMatchEvents(
    editionId: string,
    athleteId: string,
  ): Promise<{ has_events: boolean; event_count: number }>;
}
