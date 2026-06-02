import type { RefereeMatch } from "@domain/entities/RefereeMatch";
import type { RefereeRepository } from "@domain/repositories/RefereeRepository";

export class GetRefereeMatches {
  constructor(private readonly repo: RefereeRepository) {}

  execute(refereeId: string): Promise<RefereeMatch[]> {
    return this.repo.getMatchesByReferee(refereeId);
  }
}
