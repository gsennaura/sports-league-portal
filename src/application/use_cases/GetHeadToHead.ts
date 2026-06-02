import type { MatchRepository } from "@domain/repositories/MatchRepository";
import type { HeadToHeadMatch } from "@domain/entities/HeadToHeadMatch";

export class GetHeadToHead {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string): Promise<HeadToHeadMatch[]> {
    return this.repository.getHeadToHead(matchId);
  }
}
