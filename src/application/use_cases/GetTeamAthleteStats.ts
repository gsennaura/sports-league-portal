import type { TeamAthleteStat } from "@domain/entities/Athlete";
import type { TeamRepository } from "@domain/repositories/TeamRepository";

export class GetTeamAthleteStats {
  constructor(private readonly repository: TeamRepository) {}

  execute(teamId: string): Promise<TeamAthleteStat[]> {
    return this.repository.getAthletesStats(teamId);
  }
}
