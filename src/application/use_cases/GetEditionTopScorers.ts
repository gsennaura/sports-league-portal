import type { TopScorerItem } from "@domain/entities/ChampionshipDetail";
import type { ChampionshipRepository } from "@domain/repositories/ChampionshipRepository";

export class GetEditionTopScorers {
  constructor(private readonly repository: ChampionshipRepository) {}

  execute(champId: string, editionId: string): Promise<TopScorerItem[]> {
    return this.repository.getTopScorers(champId, editionId);
  }
}
