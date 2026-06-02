import type { Championship } from "@domain/entities/Championship";
import type { ChampionshipRepository } from "@domain/repositories/ChampionshipRepository";

export class UpdateChampionshipPodium {
  constructor(private readonly repo: ChampionshipRepository) {}

  execute(id: string, championTeamId: string | null, runnerUpTeamId: string | null): Promise<Championship> {
    return this.repo.updatePodium(id, championTeamId, runnerUpTeamId);
  }
}
