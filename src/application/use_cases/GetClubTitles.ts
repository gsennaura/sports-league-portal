import type { ClubTitle } from "@domain/entities/ClubTitle";
import type { ClubRepository } from "@domain/repositories/ClubRepository";

export class GetClubTitles {
  constructor(private readonly repository: ClubRepository) {}

  execute(clubId: string): Promise<ClubTitle[]> {
    return this.repository.getTitles(clubId);
  }
}
