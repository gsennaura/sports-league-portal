import type { League } from "@domain/entities/League";
import type { UpdateLeaguePayload, LeagueRepository } from "@domain/repositories/LeagueRepository";

export class UpdateLeague {
  constructor(private readonly repository: LeagueRepository) {}

  execute(payload: UpdateLeaguePayload): Promise<League> {
    return this.repository.update(payload);
  }
}
