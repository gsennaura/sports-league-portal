import type { Emenda } from "@domain/entities/Emenda";
import type { EmendaRepository } from "@domain/repositories/EmendaRepository";

export class ApiEmendaRepository implements EmendaRepository {
  constructor(private readonly baseUrl: string) {}

  async listPublic(leagueId?: string, year?: number): Promise<Emenda[]> {
    const params = new URLSearchParams();
    if (leagueId) params.set("league_id", leagueId);
    if (year) params.set("year", String(year));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/emendas${qs}`);
    if (!resp.ok) throw new Error(`Falha ao buscar emendas: ${resp.status}`);
    return resp.json() as Promise<Emenda[]>;
  }
}
