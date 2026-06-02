import type { League } from "@domain/entities/League";
import type { CreateLeaguePayload, LeagueRepository } from "@domain/repositories/LeagueRepository";

export class CreateLeague {
  constructor(private readonly repository: LeagueRepository) {}

  execute(payload: CreateLeaguePayload): Promise<League> {
    return this.repository.create(payload);
  }
}
