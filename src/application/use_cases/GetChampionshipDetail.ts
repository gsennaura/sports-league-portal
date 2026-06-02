import type { ChampionshipDetail } from "@domain/entities/ChampionshipDetail";
import type { ChampionshipRepository } from "@domain/repositories/ChampionshipRepository";

export class GetChampionshipDetail {
  constructor(private readonly repository: ChampionshipRepository) {}

  execute(id: string, editionId?: string | null): Promise<ChampionshipDetail> {
    return this.repository.getDetail(id, editionId);
  }
}
