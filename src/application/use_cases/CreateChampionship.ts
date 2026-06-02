import type { Championship } from "@domain/entities/Championship";
import type { CreateChampionshipPayload, ChampionshipRepository } from "@domain/repositories/ChampionshipRepository";

export class CreateChampionship {
  constructor(private readonly repository: ChampionshipRepository) {}

  execute(payload: CreateChampionshipPayload): Promise<Championship> {
    return this.repository.create(payload);
  }
}
