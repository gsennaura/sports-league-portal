import type { Team } from "@domain/entities/Team";
import type { CreateTeamPayload, TeamRepository } from "@domain/repositories/TeamRepository";

export class CreateTeam {
  constructor(private readonly repository: TeamRepository) {}

  execute(payload: CreateTeamPayload): Promise<Team> {
    return this.repository.create(payload);
  }
}
