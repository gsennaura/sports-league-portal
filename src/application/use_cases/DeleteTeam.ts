import type { TeamRepository } from "@domain/repositories/TeamRepository";

export class DeleteTeam {
  constructor(private readonly repository: TeamRepository) {}

  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
