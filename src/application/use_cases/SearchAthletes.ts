import type { Athlete } from "@domain/entities/Athlete";
import type { AthleteRepository } from "@domain/repositories/AthleteRepository";

export class SearchAthletes {
  constructor(private readonly repository: AthleteRepository) {}

  execute(name: string): Promise<Athlete[]> {
    return this.repository.searchByName(name);
  }
}
