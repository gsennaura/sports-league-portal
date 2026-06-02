import type { League } from "@domain/entities/League";
import type { LeagueRepository } from "@domain/repositories/LeagueRepository";

export class ListLeagues {
  constructor(private readonly repository: LeagueRepository) {}

  execute(): Promise<League[]> {
    return this.repository.listAll();
  }
}

export class GetLeague {
  constructor(private readonly repository: LeagueRepository) {}

  execute(id: string): Promise<League> {
    return this.repository.getById(id);
  }
}
