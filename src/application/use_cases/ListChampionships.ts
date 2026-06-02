import type { Championship } from "@domain/entities/Championship";
import type { ChampionshipRepository } from "@domain/repositories/ChampionshipRepository";

export class ListChampionships {
  constructor(private readonly repository: ChampionshipRepository) {}

  async execute(): Promise<Championship[]> {
    return this.repository.listAll();
  }
}
