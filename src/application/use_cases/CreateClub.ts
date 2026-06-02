import type { Club } from "@domain/entities/Club";
import type { CreateClubPayload, ClubRepository } from "@domain/repositories/ClubRepository";

export class CreateClub {
  constructor(private readonly repository: ClubRepository) {}

  execute(payload: CreateClubPayload): Promise<Club> {
    return this.repository.create(payload);
  }
}
