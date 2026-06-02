import type { Referee } from "@domain/entities/Referee";
import type { RefereeRepository } from "@domain/repositories/RefereeRepository";

export class GetRefereeDetail {
  constructor(private readonly repository: RefereeRepository) {}

  execute(id: string): Promise<Referee> {
    return this.repository.getById(id);
  }
}
