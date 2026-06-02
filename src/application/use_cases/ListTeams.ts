import type { Team } from "@domain/entities/Team";
import type { TeamRepository } from "@domain/repositories/TeamRepository";

export class ListTeams {
  constructor(private readonly repository: TeamRepository) {}

  async execute(): Promise<Team[]> {
    return this.repository.listAll();
  }
}
