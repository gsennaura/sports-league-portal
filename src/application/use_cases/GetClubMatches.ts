import type { ClubMatch } from "@domain/entities/ClubMatch";
import type { ClubRepository } from "@domain/repositories/ClubRepository";

export class GetClubMatches {
  constructor(private readonly repository: ClubRepository) {}

  execute(clubId: string, year?: number): Promise<ClubMatch[]> {
    return this.repository.getMatches(clubId, year);
  }
}