import type { MatchRepository, MatchUpdatePayload } from "@domain/repositories/MatchRepository";
import type { MatchDetail } from "@domain/entities/MatchDetail";

export class UpdateMatch {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string, payload: MatchUpdatePayload): Promise<MatchDetail> {
    return this.repository.updateMatch(matchId, payload);
  }
}
