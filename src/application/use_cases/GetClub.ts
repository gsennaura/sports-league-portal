import type { Club } from "@domain/entities/Club";
import type { ClubRepository } from "@domain/repositories/ClubRepository";

export class GetClub {
  constructor(private readonly repository: ClubRepository) {}

  execute(id: string): Promise<Club> {
    return this.repository.getById(id);
  }
}
