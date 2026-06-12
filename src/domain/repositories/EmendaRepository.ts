import type { Emenda } from "../entities/Emenda";

export interface EmendaRepository {
  listPublic(leagueId?: string, year?: number): Promise<Emenda[]>;
}
