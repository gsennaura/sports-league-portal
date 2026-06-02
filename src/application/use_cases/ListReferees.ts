import type { Referee } from "@domain/entities/Referee";
import type { RefereeRepository } from "@domain/repositories/RefereeRepository";

export class ListReferees {
  constructor(private readonly repository: RefereeRepository) {}

  execute(name?: string): Promise<Referee[]> {
    return this.repository.listAll(name);
  }
}
