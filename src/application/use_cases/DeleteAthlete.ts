import type { AthleteRepository } from "@domain/repositories/AthleteRepository";

export class DeleteAthlete {
  constructor(private readonly repo: AthleteRepository) {}

  async execute(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
