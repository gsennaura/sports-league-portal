import type { MatchRepository, MatchResultPayload } from "@domain/repositories/MatchRepository";
import type { MatchDetail } from "@domain/entities/MatchDetail";

export class UpdateMatchResult {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string, payload: MatchResultPayload): Promise<MatchDetail> {
    return this.repository.updateResult(matchId, payload);
  }
}
