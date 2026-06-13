import type { UpcomingMatch } from "@domain/entities/UpcomingMatch";
import type { MatchRepository } from "@domain/repositories/MatchRepository";

export class GetUpcomingMatches {
  constructor(private readonly matchRepository: MatchRepository) {}

  execute(days = 20, leagueId?: string): Promise<UpcomingMatch[]> {
    return this.matchRepository.listUpcoming(days, leagueId);
  }
}
