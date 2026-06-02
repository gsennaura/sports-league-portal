import type { Venue } from "@domain/entities/Venue";
import type { CreateVenuePayload, VenueRepository } from "@domain/repositories/VenueRepository";

export class CreateVenue {
  constructor(private readonly repository: VenueRepository) {}

  execute(payload: CreateVenuePayload): Promise<Venue> {
    return this.repository.create(payload);
  }
}
