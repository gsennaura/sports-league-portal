import type { AthleteDetail } from "@domain/entities/Athlete";
import type { AthleteRepository } from "@domain/repositories/AthleteRepository";

export class GetAthleteDetail {
  constructor(private readonly repository: AthleteRepository) {}

  execute(id: string): Promise<AthleteDetail> {
    return this.repository.getDetail(id);
  }
}
