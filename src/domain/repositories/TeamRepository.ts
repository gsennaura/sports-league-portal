import type { Team } from "@domain/entities/Team";
import type { TeamMatch } from "@domain/entities/TeamMatch";
import type { TeamAthleteStat } from "@domain/entities/Athlete";

export interface CreateTeamPayload {
  name: string;
  sport_id: string;
  city_id: string;
  club_id?: string;
  category?: string;
}

export interface UpdateTeamPayload {
  id: string;
  name: string;
  sport_id: string;
  city_id: string;
  club_id?: string | null;
  category?: string | null;
}

export interface TeamRepository {
  listAll(): Promise<Team[]>;
  listByClub(clubId: string): Promise<Team[]>;
  create(payload: CreateTeamPayload): Promise<Team>;
  update(payload: UpdateTeamPayload): Promise<Team>;
  delete(id: string): Promise<void>;
  getMatches(teamId: string, year?: number): Promise<TeamMatch[]>;
  getMatchYears(teamId: string): Promise<number[]>;
  getDetail(id: string): Promise<Team>;
  getAthletesStats(teamId: string): Promise<TeamAthleteStat[]>;
}
