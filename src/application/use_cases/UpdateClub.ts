import type { Club } from "@domain/entities/Club";
import type { UpdateClubPayload, ClubRepository } from "@domain/repositories/ClubRepository";

export class UpdateClub {
  constructor(private readonly repository: ClubRepository) {}

  execute(payload: UpdateClubPayload): Promise<Club> {
    return this.repository.update(payload);
  }
}
