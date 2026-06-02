import type { Team } from "@domain/entities/Team";
import type { TeamRepository } from "@domain/repositories/TeamRepository";

export class GetTeamDetail {
  constructor(private readonly repository: TeamRepository) {}

  async execute(id: string): Promise<Team> {
    return this.repository.getDetail(id);
  }
}
