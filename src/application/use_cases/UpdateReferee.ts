import type { Referee } from "@domain/entities/Referee";
import type { RefereeRepository, UpdateRefereeInput } from "@domain/repositories/RefereeRepository";

export class UpdateReferee {
  constructor(private readonly repo: RefereeRepository) {}

  execute(input: UpdateRefereeInput): Promise<Referee> {
    return this.repo.update(input);
  }
}
