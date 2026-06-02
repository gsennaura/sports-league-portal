import type { Championship } from "@domain/entities/Championship";
import type { ChampionshipDetail, GroupDetail, TopScorerItem } from "@domain/entities/ChampionshipDetail";

export interface CreateChampionshipPayload {
  name: string;
  city_id: string;
  sport_id: string;
  scope?: string;
  level?: string;
  nickname?: string;
  league_id?: string;
  division?: string;
}

export interface ChampionshipRepository {
  listAll(): Promise<Championship[]>;
  getDetail(id: string, editionId?: string | null): Promise<ChampionshipDetail>;
  loadPhaseGroups(phaseId: string): Promise<GroupDetail[]>;
  getTopScorers(champId: string, editionId: string): Promise<TopScorerItem[]>;
  create(payload: CreateChampionshipPayload): Promise<Championship>;
  updatePodium(id: string, championTeamId: string | null, runnerUpTeamId: string | null): Promise<Championship>;
}
