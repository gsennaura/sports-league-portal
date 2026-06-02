import type { Athlete } from "@domain/entities/Athlete";
import type { AthleteRepository, UpdateAthletePayload } from "@domain/repositories/AthleteRepository";

export class UpdateAthlete {
  constructor(private readonly repository: AthleteRepository) {}

  execute(payload: UpdateAthletePayload): Promise<Athlete> {
    return this.repository.update(payload);
  }
}
