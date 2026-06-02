import type { TeamRepository } from "@domain/repositories/TeamRepository";

export class GetTeamMatchYears {
  constructor(private readonly repository: TeamRepository) {}

  execute(teamId: string): Promise<number[]> {
    return this.repository.getMatchYears(teamId);
  }
}
