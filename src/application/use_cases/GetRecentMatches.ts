import type { UpcomingMatch } from "@domain/entities/UpcomingMatch";
import type { MatchRepository } from "@domain/repositories/MatchRepository";

export class GetRecentMatches {
  constructor(private readonly matchRepository: MatchRepository) {}

  execute(days = 7): Promise<UpcomingMatch[]> {
    return this.matchRepository.listRecent(days);
  }
}
