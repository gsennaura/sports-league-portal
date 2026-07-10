import type { Emenda } from "@domain/entities/Emenda";
import type { EmendaRepository } from "@domain/repositories/EmendaRepository";

export class ListEmendas {
  constructor(private readonly repository: EmendaRepository) {}
  execute(leagueId?: string, year?: number, admin = false): Promise<Emenda[]> {
    return admin
      ? this.repository.adminListAll(leagueId, year)
      : this.repository.list(leagueId, year);
  }
}
