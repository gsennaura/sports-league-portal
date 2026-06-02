import type { Referee } from "@domain/entities/Referee";
import type { RefereeRepository, CreateRefereeInput } from "@domain/repositories/RefereeRepository";

export class CreateReferee {
  constructor(private readonly repo: RefereeRepository) {}

  execute(input: CreateRefereeInput): Promise<Referee> {
    return this.repo.create(input);
  }
}
