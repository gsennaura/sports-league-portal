import type { GroupDetail } from "@domain/entities/ChampionshipDetail";
import type { ChampionshipRepository } from "@domain/repositories/ChampionshipRepository";

export class LoadPhaseGroups {
  constructor(private readonly repository: ChampionshipRepository) {}

  execute(phaseId: string): Promise<GroupDetail[]> {
    return this.repository.loadPhaseGroups(phaseId);
  }
}
