import type { Team } from "@domain/entities/Team";
import type { TeamRepository } from "@domain/repositories/TeamRepository";

export class GetClubTeams {
  constructor(private readonly repository: TeamRepository) {}

  execute(clubId: string): Promise<Team[]> {
    return this.repository.listByClub(clubId);
  }
}
