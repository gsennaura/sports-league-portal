import type { ClubMatch } from "@domain/entities/ClubMatch";
import type { VenueRepository } from "@domain/repositories/VenueRepository";

export class GetVenueMatches {
  constructor(private readonly repository: VenueRepository) {}

  execute(venueId: string): Promise<ClubMatch[]> {
    return this.repository.getMatches(venueId);
  }
}
