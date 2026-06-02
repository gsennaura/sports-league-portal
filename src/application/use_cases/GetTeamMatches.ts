import type { TeamMatch } from "@domain/entities/TeamMatch";
import type { TeamRepository } from "@domain/repositories/TeamRepository";

export class GetTeamMatches {
  constructor(private readonly repository: TeamRepository) {}

  execute(teamId: string, year?: number): Promise<TeamMatch[]> {
    return this.repository.getMatches(teamId, year);
  }
}
