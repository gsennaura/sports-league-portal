import type { Venue } from "@domain/entities/Venue";
import type { VenueRepository } from "@domain/repositories/VenueRepository";

export class ListVenues {
  constructor(private readonly repository: VenueRepository) {}

  execute(): Promise<Venue[]> {
    return this.repository.listAll();
  }
}
