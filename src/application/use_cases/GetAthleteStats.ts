import type { AthleteStats } from "@domain/entities/Athlete";
import type { AthleteRepository } from "@domain/repositories/AthleteRepository";

export class GetAthleteStats {
  constructor(private readonly repository: AthleteRepository) {}

  execute(id: string): Promise<AthleteStats> {
    return this.repository.getStats(id);
  }
}
