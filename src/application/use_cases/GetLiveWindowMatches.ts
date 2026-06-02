import type { MatchRepository } from "@domain/repositories/MatchRepository";
import type { MatchDetail } from "@domain/entities/MatchDetail";

export class GetLiveWindowMatches {
  constructor(private readonly repository: MatchRepository) {}

  async execute(): Promise<MatchDetail[]> {
    return this.repository.getLiveWindow();
  }
}
