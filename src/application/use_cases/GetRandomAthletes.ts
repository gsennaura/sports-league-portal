import type { Athlete } from "@domain/entities/Athlete";
import type { AthleteRepository } from "@domain/repositories/AthleteRepository";

export class GetRandomAthletes {
  constructor(private readonly repository: AthleteRepository) {}

  execute(limit: number = 20): Promise<Athlete[]> {
    return this.repository.listRandom(limit);
  }
}
