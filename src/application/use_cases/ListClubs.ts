import type { Club } from "@domain/entities/Club";
import type { ClubRepository } from "@domain/repositories/ClubRepository";

export class ListClubs {
  constructor(private readonly repository: ClubRepository) {}

  execute(): Promise<Club[]> {
    return this.repository.listAll();
  }
}
