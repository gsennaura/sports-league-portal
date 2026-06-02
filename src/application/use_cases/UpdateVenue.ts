import type { Venue } from "@domain/entities/Venue";
import type { UpdateVenuePayload, VenueRepository } from "@domain/repositories/VenueRepository";

export class UpdateVenue {
  constructor(private readonly repository: VenueRepository) {}

  execute(payload: UpdateVenuePayload): Promise<Venue> {
    return this.repository.update(payload);
  }
}
