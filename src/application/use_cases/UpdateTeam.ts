import type { Team } from "@domain/entities/Team";
import type { UpdateTeamPayload, TeamRepository } from "@domain/repositories/TeamRepository";

export class UpdateTeam {
  constructor(private readonly repository: TeamRepository) {}

  execute(payload: UpdateTeamPayload): Promise<Team> {
    return this.repository.update(payload);
  }
}
