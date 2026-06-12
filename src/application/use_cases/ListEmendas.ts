import type { Emenda } from "@domain/entities/Emenda";
import type { EmendaRepository } from "@domain/repositories/EmendaRepository";

export class ListEmendas {
  constructor(private readonly repository: EmendaRepository) {}
  execute(leagueId?: string, year?: number): Promise<Emenda[]> {
    return this.repository.listPublic(leagueId, year);
  }
}
