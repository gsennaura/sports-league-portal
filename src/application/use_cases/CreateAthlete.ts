import type { Athlete } from "@domain/entities/Athlete";
import type { AthleteRepository, CreateAthletePayload } from "@domain/repositories/AthleteRepository";

export class CreateAthlete {
  constructor(private readonly repository: AthleteRepository) {}

  execute(payload: CreateAthletePayload): Promise<Athlete> {
    return this.repository.create(payload);
  }
}
